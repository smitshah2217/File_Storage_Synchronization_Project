package com.cloudstorage.service;

import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.FileVersionDto;
import com.cloudstorage.dto.response.PageResponse;
import com.cloudstorage.entity.DownloadHistory;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileVersion;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ConflictException;
import com.cloudstorage.exception.ForbiddenOperationException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.exception.StorageLimitExceededException;
import com.cloudstorage.exception.UnsupportedMediaTypeException;
import com.cloudstorage.repository.DownloadHistoryRepository;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FileVersionRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.ShareRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import com.cloudstorage.util.ItemNameValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FileService {
    private final FileEntityRepository fileRepository;
    private final FileVersionRepository fileVersionRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final DownloadHistoryRepository downloadHistoryRepository;
    private final ShareRepository shareRepository;
    private final MinioService minioService;
    private final CurrentUserProvider currentUserProvider;
    private final ShareService shareService;
    private final FileUploadService fileUploadService;
    @org.springframework.beans.factory.annotation.Autowired
    @Qualifier("fileUploadExecutor")
    private Executor fileUploadExecutor;

    @Value("${app.upload.max-size-bytes:104857600}")
    private long maxUploadSizeBytes;

    private FileDto mapToFileDto(FileEntity file) {
        return FileDto.builder()
                .id(file.getId())
                .name(file.getName())
                .folderId(file.getFolder() == null ? null : file.getFolder().getId())
                .ownerId(file.getOwner().getId())
                .sizeBytes(file.getSizeBytes())
                .mimeType(file.getMimeType())
                .versionNumber(file.getCurrentVersion() == null ? 1 : file.getCurrentVersion().getVersionNumber())
                .createdAt(file.getCreatedAt())
                .build();
    }

    @Transactional
    public FileDto uploadFile(MultipartFile file, Long folderId) {
        return fileUploadService.uploadFile(currentUserProvider.getCurrentUserId(), file, folderId);
    }

    /** Each multipart item gets its own transaction; the bounded executor prevents unbounded upload threads. */
    public CompletableFuture<List<FileDto>> uploadFilesAsync(Long userId, List<MultipartFile> files, Long folderId) {
        if (files == null || files.isEmpty()) {
            throw new BadRequestException("At least one file is required");
        }
        if (files.size() > 100) {
            throw new BadRequestException("A batch may contain at most 100 files");
        }
        List<CompletableFuture<FileDto>> uploads = files.stream()
                .map(file -> CompletableFuture.supplyAsync(
                        () -> fileUploadService.uploadFile(userId, file, folderId), fileUploadExecutor))
                .toList();
        return CompletableFuture.allOf(uploads.toArray(CompletableFuture[]::new))
                .thenApply(ignored -> uploads.stream().map(CompletableFuture::join).collect(Collectors.toList()));
    }

    @Transactional(readOnly = true)
    public FileEntity getFileEntity(Long fileId) {
        return accessibleFile(fileId, currentUserProvider.getCurrentUserId());
    }

    @Transactional(readOnly = true)
    public FileDto getFileDetails(Long fileId) {
        return mapToFileDto(getFileEntity(fileId));
    }

    @Transactional
    public InputStream downloadFile(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = accessibleFile(fileId, userId);
        InputStream inputStream = minioService.downloadFile(currentObjectKey(file));
        recordDownload(userId, file);
        return inputStream;
    }

    @Transactional(readOnly = true)
    public InputStream previewFile(Long fileId) {
        FileEntity file = accessibleFile(fileId, currentUserProvider.getCurrentUserId());
        ensurePreviewable(file.getMimeType());
        return minioService.downloadFile(currentObjectKey(file));
    }

    @Transactional
    public FileDto updateFile(Long fileId, com.cloudstorage.dto.request.FileUpdateRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = accessibleFile(fileId, userId);
        requireEditAccess(file, userId);
        if (Boolean.TRUE.equals(request.getMoveToRoot()) && request.getFolderId() != null) {
            throw new BadRequestException("Provide either folderId or moveToRoot, not both");
        }

        String updatedName = request.getName() == null ? file.getName() : ItemNameValidator.normalize(request.getName(), "File");
        boolean nameChanged = !updatedName.equals(file.getName());
        boolean folderChanged = false;
        Folder destination = file.getFolder();
        if (Boolean.TRUE.equals(request.getMoveToRoot())) {
            folderChanged = file.getFolder() != null;
            destination = null;
        } else if (request.getFolderId() != null) {
            folderChanged = file.getFolder() == null || !file.getFolder().getId().equals(request.getFolderId());
            if (folderChanged) {
                destination = folderRepository.findById(request.getFolderId())
                        .filter(folder -> !folder.isDeleted())
                        .orElseThrow(() -> new ResourceNotFoundException("Target folder not found"));
                if (!destination.getOwner().getId().equals(file.getOwner().getId())) {
                    throw new ResourceNotFoundException("Target folder not found");
                }
            }
        }

        if (nameChanged || folderChanged) {
            Long destinationId = destination == null ? null : destination.getId();
            Long ownerId = file.getOwner().getId();
            boolean duplicate = destinationId == null
                    ? fileRepository.existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalseAndIdNot(ownerId, updatedName, fileId)
                    : fileRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalseAndIdNot(ownerId, destinationId, updatedName, fileId);
            if (duplicate) {
                throw new ConflictException("A file with this name already exists in the destination");
            }
            file.setName(updatedName);
            file.setFolder(destination);
        }
        return mapToFileDto(fileRepository.save(file));
    }

    @Transactional
    public void deleteFile(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = accessibleFile(fileId, userId);
        requireOwner(file, userId);
        file.setDeleted(true);
        file.setDeletedAt(java.time.Instant.now());
        fileRepository.save(file);
    }

    @Transactional
    public void restoreFile(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        requireOwner(file, userId);
        if (!file.isDeleted()) {
            return;
        }
        if (file.getFolder() != null && file.getFolder().isDeleted()) {
            throw new ConflictException("Cannot restore because the parent folder is also in the trash. Restore the folder first.");
        }

        Long folderId = file.getFolder() == null ? null : file.getFolder().getId();
        boolean duplicate = folderId == null
                ? fileRepository.existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, file.getName())
                : fileRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, folderId, file.getName());
        if (duplicate) {
            throw new ConflictException("Cannot restore: a file with the same name already exists in this location.");
        }
        file.setDeleted(false);
        file.setDeletedAt(null);
        fileRepository.save(file);
    }

    @Transactional
    public void permanentDeleteFile(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        requireOwner(file, userId);
        if (!file.isDeleted()) {
            throw new BadRequestException("Only files in the trash can be permanently deleted");
        }
        permanentlyDelete(file);
    }

    private void permanentlyDelete(FileEntity file) {
        User owner = userRepository.findByIdWithPessimisticWriteLock(file.getOwner().getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<FileVersion> versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(file.getId());
        List<String> objectKeys = versions.stream().map(FileVersion::getMinioObjectKey).toList();
        owner.setStorageUsedBytes(Math.max(0, owner.getStorageUsedBytes() - file.getSizeBytes()));
        downloadHistoryRepository.detachFile(file.getId());
        shareRepository.deleteByFileId(file.getId());
        if (file.getCurrentVersion() != null) {
            file.setCurrentVersion(null);
            fileRepository.saveAndFlush(file);
        }
        fileVersionRepository.deleteAll(versions);
        fileRepository.delete(file);
        userRepository.save(owner);
        minioService.deleteFilesAfterCommit(objectKeys);
    }

    @Transactional
    public FileDto uploadNewVersion(Long fileId, MultipartFile multipartFile) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = accessibleFile(fileId, userId);
        requireOwner(file, userId);
        validateVersionUpload(multipartFile);
        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        long sizeDifference = multipartFile.getSize() - file.getSizeBytes();
        if (sizeDifference > 0 && owner.getStorageUsedBytes() + sizeDifference > owner.getStorageLimitBytes()) {
            throw new StorageLimitExceededException("Storage quota exceeded");
        }

        String versionMimeType = normalizedMimeType(multipartFile.getContentType());
        String objectKey = uploadVersionObject(multipartFile, versionMimeType);
        int nextVersion = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId).stream()
                .mapToInt(FileVersion::getVersionNumber)
                .max().orElse(0) + 1;
        FileVersion version = new FileVersion();
        version.setFile(file);
        version.setVersionNumber(nextVersion);
        version.setMinioObjectKey(objectKey);
        version.setSizeBytes(multipartFile.getSize());
        version.setMimeType(versionMimeType);
        version.setUploadedBy(owner);
        FileVersion savedVersion = fileVersionRepository.save(version);

        file.setCurrentVersion(savedVersion);
        file.setSizeBytes(multipartFile.getSize());
        file.setMimeType(versionMimeType);
        fileRepository.save(file);
        owner.setStorageUsedBytes(owner.getStorageUsedBytes() + sizeDifference);
        userRepository.save(owner);
        return mapToFileDto(file);
    }

    @Transactional(readOnly = true)
    public PageResponse<FileVersionDto> getFileVersions(Long fileId, int page, int size) {
        PageResponse.validate(page, size);
        accessibleFile(fileId, currentUserProvider.getCurrentUserId());
        var versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId, PageRequest.of(page, size))
                .map(this::mapVersionDto);
        return PageResponse.from(versions);
    }

    @Transactional(readOnly = true)
    public FileVersionDto getFileVersion(Long fileId, Integer versionNumber) {
        accessibleFile(fileId, currentUserProvider.getCurrentUserId());
        return findVersion(fileId, versionNumber).map(this::mapVersionDto)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));
    }

    @Transactional
    public InputStream downloadFileVersion(Long fileId, Integer versionNumber) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = accessibleFile(fileId, userId);
        FileVersion version = findVersion(fileId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));
        InputStream inputStream = minioService.downloadFile(version.getMinioObjectKey());
        recordDownload(userId, file);
        return inputStream;
    }

    @Transactional(readOnly = true)
    public InputStream previewFileVersion(Long fileId, Integer versionNumber) {
        accessibleFile(fileId, currentUserProvider.getCurrentUserId());
        FileVersion version = findVersion(fileId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));
        ensurePreviewable(version.getMimeType());
        return minioService.downloadFile(version.getMinioObjectKey());
    }

    @Transactional
    public FileDto restoreFileVersion(Long fileId, Integer versionNumber) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        requireOwner(file, userId);
        if (file.isDeleted()) {
            throw new ForbiddenOperationException("Cannot restore a version of a deleted file");
        }
        FileVersion versionToRestore = findVersion(fileId, versionNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));
        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        long sizeDifference = versionToRestore.getSizeBytes() - file.getSizeBytes();
        if (sizeDifference > 0 && owner.getStorageUsedBytes() + sizeDifference > owner.getStorageLimitBytes()) {
            throw new StorageLimitExceededException("Storage quota exceeded");
        }

        String newObjectKey = UUID.randomUUID().toString();
        minioService.copyFile(versionToRestore.getMinioObjectKey(), newObjectKey);
        minioService.deleteFileOnRollback(newObjectKey);
        int nextVersion = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId).stream()
                .mapToInt(FileVersion::getVersionNumber)
                .max().orElse(0) + 1;
        FileVersion restoredVersion = new FileVersion();
        restoredVersion.setFile(file);
        restoredVersion.setVersionNumber(nextVersion);
        restoredVersion.setMinioObjectKey(newObjectKey);
        restoredVersion.setSizeBytes(versionToRestore.getSizeBytes());
        restoredVersion.setMimeType(versionToRestore.getMimeType());
        restoredVersion.setUploadedBy(owner);
        FileVersion savedVersion = fileVersionRepository.save(restoredVersion);

        file.setCurrentVersion(savedVersion);
        file.setSizeBytes(versionToRestore.getSizeBytes());
        file.setMimeType(versionToRestore.getMimeType());
        fileRepository.save(file);
        owner.setStorageUsedBytes(owner.getStorageUsedBytes() + sizeDifference);
        userRepository.save(owner);
        return mapToFileDto(file);
    }

    private FileEntity accessibleFile(Long fileId, Long userId) {
        FileEntity file = fileRepository.findById(fileId)
                .filter(entity -> !entity.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        if (!file.getOwner().getId().equals(userId) && !shareService.hasAccess(fileId, userId)) {
            throw new ResourceNotFoundException("File not found");
        }
        return file;
    }

    private void requireEditAccess(FileEntity file, Long userId) {
        if (file.getOwner().getId().equals(userId)) {
            return;
        }
        if (!shareService.hasAccess(file.getId(), userId)) {
            throw new ResourceNotFoundException("File not found");
        }
        if (!shareService.hasEditAccess(file.getId(), userId)) {
            throw new ForbiddenOperationException("Edit permission is required to change this file");
        }
    }

    private void requireOwner(FileEntity file, Long userId) {
        if (file.getOwner().getId().equals(userId)) {
            return;
        }
        if (shareService.hasAccess(file.getId(), userId)) {
            throw new ForbiddenOperationException("Only the file owner can perform this action");
        }
        throw new ResourceNotFoundException("File not found");
    }

    private void validateVersionUpload(MultipartFile file) {
        if (file == null) {
            throw new BadRequestException("A file is required");
        }
        if (file.getSize() > maxUploadSizeBytes) {
            throw new StorageLimitExceededException("File exceeds the configured upload size limit");
        }
    }

    private String uploadVersionObject(MultipartFile file, String mimeType) {
        String objectKey = UUID.randomUUID().toString();
        try (InputStream stream = file.getInputStream()) {
            minioService.uploadFile(objectKey, stream, file.getSize(), mimeType);
            minioService.deleteFileOnRollback(objectKey);
            return objectKey;
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read uploaded file", exception);
        }
    }

    private String currentObjectKey(FileEntity file) {
        if (file.getCurrentVersion() == null) {
            throw new ResourceNotFoundException("File content is unavailable");
        }
        return file.getCurrentVersion().getMinioObjectKey();
    }

    private java.util.Optional<FileVersion> findVersion(Long fileId, Integer versionNumber) {
        return fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId).stream()
                .filter(version -> version.getVersionNumber().equals(versionNumber))
                .findFirst();
    }

    private FileVersionDto mapVersionDto(FileVersion version) {
        return FileVersionDto.builder()
                .id(version.getId())
                .fileId(version.getFile().getId())
                .versionNumber(version.getVersionNumber())
                .sizeBytes(version.getSizeBytes())
                .mimeType(version.getMimeType())
                .uploadedById(version.getUploadedBy() == null ? null : version.getUploadedBy().getId())
                .uploadedByUsername(version.getUploadedBy() == null ? null : version.getUploadedBy().getUsername())
                .uploadedAt(version.getUploadedAt())
                .build();
    }

    private void ensurePreviewable(String mimeType) {
        if (mimeType == null || (!mimeType.toLowerCase().startsWith("image/")
                && !MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(mimeType))) {
            throw new UnsupportedMediaTypeException("Only image and PDF files can be previewed");
        }
    }

    private String normalizedMimeType(String suppliedMimeType) {
        if (suppliedMimeType == null || suppliedMimeType.isBlank()) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        try {
            String mimeType = MediaType.parseMediaType(suppliedMimeType).toString();
            return mimeType.length() <= 100 ? mimeType : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        } catch (IllegalArgumentException exception) {
            return MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
    }

    private void recordDownload(Long userId, FileEntity file) {
        DownloadHistory history = new DownloadHistory();
        history.setUser(userRepository.getReferenceById(userId));
        history.setFile(file);
        history.setFileNameSnapshot(file.getName());
        downloadHistoryRepository.save(history);
    }
}
