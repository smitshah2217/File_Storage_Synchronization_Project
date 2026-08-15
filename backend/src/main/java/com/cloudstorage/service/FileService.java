package com.cloudstorage.service;

import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.entity.*;
import com.cloudstorage.exception.ConflictException;
import com.cloudstorage.exception.ForbiddenOperationException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.exception.StorageLimitExceededException;
import com.cloudstorage.exception.UnsupportedMediaTypeException;
import com.cloudstorage.repository.*;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import com.cloudstorage.dto.response.FileVersionDto;
import org.springframework.scheduling.annotation.Async;
@Service
@RequiredArgsConstructor
public class FileService {
    private final FileEntityRepository fileRepository;
    private final FileVersionRepository fileVersionRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final DownloadHistoryRepository downloadHistoryRepository;
    private final MinioService minioService;
    private final CurrentUserProvider currentUserProvider;

    private FileDto mapToFileDto(FileEntity file) {
        return FileDto.builder()
                .id(file.getId())
                .name(file.getName())
                .folderId(file.getFolder() != null ? file.getFolder().getId() : null)
                .ownerId(file.getOwner().getId())
                .sizeBytes(file.getSizeBytes())
                .mimeType(file.getMimeType())
                .versionNumber(file.getCurrentVersion() != null ? file.getCurrentVersion().getVersionNumber() : 1)
                .createdAt(file.getCreatedAt())
                .build();
    }

    @Transactional
    public FileDto uploadFile(MultipartFile file, Long folderId) {
        return uploadFileWithUser(currentUserProvider.getCurrentUserId(), file, folderId);
    }

    @Transactional
    public FileDto uploadFileWithUser(Long userId, MultipartFile file, Long folderId) {
        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
                
        if (owner.getStorageUsedBytes() + file.getSize() > owner.getStorageLimitBytes()) {
            throw new StorageLimitExceededException("Storage quota exceeded");
        }

        Folder parent = null;
        if (folderId != null) {
            parent = folderRepository.findById(folderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
            if (!parent.getOwner().getId().equals(userId)) {
                throw new ForbiddenOperationException("Cannot upload to another user's folder");
            }
        }

        boolean exists = parent == null
                ? fileRepository.existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, file.getOriginalFilename())
                : fileRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, parent.getId(), file.getOriginalFilename());

        if (exists) {
            throw new ConflictException("A file with this name already exists. Use the upload new version endpoint.");
        }

        String objectKey = UUID.randomUUID().toString();
        try {
            minioService.uploadFile(objectKey, file.getInputStream(), file.getSize(), file.getContentType());
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to MinIO", e);
        }

        FileEntity fileEntity = new FileEntity();
        fileEntity.setName(file.getOriginalFilename());
        fileEntity.setFolder(parent);
        fileEntity.setOwner(owner);
        fileEntity.setMimeType(file.getContentType());
        fileEntity.setSizeBytes(file.getSize());
        
        FileEntity savedFile = fileRepository.save(fileEntity);

        FileVersion fileVersion = new FileVersion();
        fileVersion.setFile(savedFile);
        fileVersion.setVersionNumber(1);
        fileVersion.setMinioObjectKey(objectKey);
        fileVersion.setSizeBytes(file.getSize());
        fileVersion.setUploadedBy(owner);
        
        FileVersion savedVersion = fileVersionRepository.save(fileVersion);
        
        savedFile.setCurrentVersion(savedVersion);
        
        owner.setStorageUsedBytes(owner.getStorageUsedBytes() + file.getSize());
        userRepository.save(owner);

        return mapToFileDto(savedFile);
    }

    @Transactional(readOnly = true)
    public FileEntity getFileEntity(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        
        if (!file.getOwner().getId().equals(userId)) {
            // Share logic will go here in Phase 10
            throw new ResourceNotFoundException("File not found");
        }
        if (file.isDeleted()) {
            throw new ResourceNotFoundException("File not found");
        }
        return file;
    }

    @Transactional(readOnly = true)
    public FileDto getFileDetails(Long fileId) {
        return mapToFileDto(getFileEntity(fileId));
    }

    @Transactional
    public InputStream downloadFile(Long fileId) {
        FileEntity file = getFileEntity(fileId);

        DownloadHistory history = new DownloadHistory();
        history.setUser(userRepository.getReferenceById(currentUserProvider.getCurrentUserId()));
        history.setFile(file);
        history.setFileNameSnapshot(file.getName());
        downloadHistoryRepository.save(history);

        return minioService.downloadFile(file.getCurrentVersion().getMinioObjectKey());
    }

    @Transactional(readOnly = true)
    public InputStream previewFile(Long fileId) {
        FileEntity file = getFileEntity(fileId);
        
        if (file.getMimeType() == null || (!file.getMimeType().startsWith("image/") && !file.getMimeType().equals("application/pdf"))) {
            throw new UnsupportedMediaTypeException("Unsupported media type for preview");
        }

        return minioService.downloadFile(file.getCurrentVersion().getMinioObjectKey());
    }

    @Transactional
    public FileDto updateFile(Long fileId, com.cloudstorage.dto.request.FileUpdateRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("File not found");
        }
        
        if (file.isDeleted()) {
            throw new ForbiddenOperationException("Cannot update a deleted file");
        }

        boolean nameChanged = request.getName() != null && !request.getName().trim().equals(file.getName());
        boolean folderChanged = false;
        Folder newFolder = file.getFolder();

        if (Boolean.TRUE.equals(request.getMoveToRoot())) {
            folderChanged = file.getFolder() != null;
            newFolder = null;
        } else if (request.getFolderId() != null) {
            folderChanged = file.getFolder() == null || !file.getFolder().getId().equals(request.getFolderId());
            if (folderChanged) {
                newFolder = folderRepository.findById(request.getFolderId())
                        .orElseThrow(() -> new ResourceNotFoundException("Target folder not found"));
                if (!newFolder.getOwner().getId().equals(userId)) {
                    throw new ForbiddenOperationException("Cannot move to another user's folder");
                }
                if (newFolder.isDeleted()) {
                    throw new ForbiddenOperationException("Cannot move into a deleted folder");
                }
            }
        }

        if (nameChanged || folderChanged) {
            String checkName = request.getName() != null ? request.getName().trim() : file.getName();
            Long checkFolderId = newFolder != null ? newFolder.getId() : null;

            boolean exists = checkFolderId == null
                    ? fileRepository.existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, checkName)
                    : fileRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, checkFolderId, checkName);

            if (exists) {
                throw new ConflictException("A file with this name already exists in the destination");
            }

            if (nameChanged) file.setName(request.getName().trim());
            if (folderChanged) file.setFolder(newFolder);
            
            return mapToFileDto(fileRepository.save(file));
        }
        return mapToFileDto(file);
    }

    @Transactional
    public void deleteFile(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("File not found");
        }

        file.setDeleted(true);
        file.setDeletedAt(java.time.Instant.now());
        fileRepository.save(file);
    }

    @Transactional
    public void restoreFile(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("File not found");
        }
        
        if (!file.isDeleted()) return;

        if (file.getFolder() != null && file.getFolder().isDeleted()) {
            throw new ConflictException("Cannot restore because the parent folder is also in the trash. Restore the folder first.");
        }

        Long folderId = file.getFolder() != null ? file.getFolder().getId() : null;
        boolean exists = folderId == null
                ? fileRepository.existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, file.getName())
                : fileRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, folderId, file.getName());

        if (exists) {
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

        if (!file.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("File not found");
        }

        User owner = userRepository.findByIdWithPessimisticWriteLock(file.getOwner().getId()).orElseThrow();
        java.util.List<FileVersion> versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(file.getId());
        for (FileVersion version : versions) {
            minioService.deleteFile(version.getMinioObjectKey());
            owner.setStorageUsedBytes(Math.max(0, owner.getStorageUsedBytes() - version.getSizeBytes()));
        }
        userRepository.save(owner);
        
        fileRepository.delete(file);
    }

    @Transactional
    public FileDto uploadNewVersion(Long fileId, MultipartFile file) {
        Long userId = currentUserProvider.getCurrentUserId();
        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        FileEntity fileEntity = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!fileEntity.getOwner().getId().equals(userId)) {
            throw new ForbiddenOperationException("Only the file owner can upload new versions");
        }
        
        if (fileEntity.isDeleted()) {
            throw new ForbiddenOperationException("Cannot upload a new version to a deleted file");
        }

        long sizeDifference = file.getSize() - fileEntity.getSizeBytes();
        if (sizeDifference > 0 && owner.getStorageUsedBytes() + sizeDifference > owner.getStorageLimitBytes()) {
            throw new StorageLimitExceededException("Storage quota exceeded");
        }

        String objectKey = UUID.randomUUID().toString();
        try { minioService.uploadFile(objectKey, file.getInputStream(), file.getSize(), file.getContentType()); }
        catch (Exception e) { throw new RuntimeException("Failed to upload file to MinIO", e); }

        int nextVersion = fileEntity.getCurrentVersion() != null ? fileEntity.getCurrentVersion().getVersionNumber() + 1 : 1;

        FileVersion fileVersion = new FileVersion();
        fileVersion.setFile(fileEntity);
        fileVersion.setVersionNumber(nextVersion);
        fileVersion.setMinioObjectKey(objectKey);
        fileVersion.setSizeBytes(file.getSize());
        fileVersion.setUploadedBy(owner);

        FileVersion savedVersion = fileVersionRepository.save(fileVersion);

        fileEntity.setCurrentVersion(savedVersion);
        fileEntity.setSizeBytes(file.getSize());
        fileEntity.setMimeType(file.getContentType());
        fileRepository.save(fileEntity);

        if (sizeDifference != 0) {
            owner.setStorageUsedBytes(owner.getStorageUsedBytes() + sizeDifference);
            userRepository.save(owner);
        }

        return mapToFileDto(fileEntity);
    }

    @Transactional(readOnly = true)
    public List<FileVersionDto> getFileVersions(Long fileId) {
        FileEntity file = getFileEntity(fileId);
        return fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId).stream()
                .map(v -> FileVersionDto.builder()
                        .id(v.getId())
                        .fileId(v.getFile().getId())
                        .versionNumber(v.getVersionNumber())
                        .sizeBytes(v.getSizeBytes())
                        .uploadedById(v.getUploadedBy().getId())
                        .uploadedByUsername(v.getUploadedBy().getUsername())
                        .uploadedAt(v.getUploadedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InputStream downloadFileVersion(Long fileId, Integer versionNumber) {
        FileEntity file = getFileEntity(fileId);
        FileVersion version = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId).stream()
                .filter(v -> v.getVersionNumber().equals(versionNumber))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));

        return minioService.downloadFile(version.getMinioObjectKey());
    }

    @Transactional(readOnly = true)
    public InputStream previewFileVersion(Long fileId, Integer versionNumber) {
        FileEntity file = getFileEntity(fileId);
        if (file.getMimeType() == null || (!file.getMimeType().startsWith("image/") && !file.getMimeType().equals("application/pdf"))) {
            throw new UnsupportedMediaTypeException("Unsupported media type for preview");
        }

        FileVersion version = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId).stream()
                .filter(v -> v.getVersionNumber().equals(versionNumber))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));

        return minioService.downloadFile(version.getMinioObjectKey());
    }

    @Transactional
    public FileDto restoreFileVersion(Long fileId, Integer versionNumber) {
        Long userId = currentUserProvider.getCurrentUserId();
        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        FileEntity fileEntity = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!fileEntity.getOwner().getId().equals(userId)) {
            throw new ForbiddenOperationException("Only the file owner can restore versions");
        }

        if (fileEntity.isDeleted()) {
            throw new ForbiddenOperationException("Cannot restore version of a deleted file");
        }

        FileVersion versionToRestore = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(fileId).stream()
                .filter(v -> v.getVersionNumber().equals(versionNumber))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Version not found"));

        long sizeDifference = versionToRestore.getSizeBytes() - fileEntity.getSizeBytes();
        if (sizeDifference > 0 && owner.getStorageUsedBytes() + sizeDifference > owner.getStorageLimitBytes()) {
            throw new StorageLimitExceededException("Storage quota exceeded");
        }

        // We create a new version record that copies the old version's object key
        int nextVersion = fileEntity.getCurrentVersion() != null ? fileEntity.getCurrentVersion().getVersionNumber() + 1 : 1;

        FileVersion newVersion = new FileVersion();
        newVersion.setFile(fileEntity);
        newVersion.setVersionNumber(nextVersion);
        newVersion.setMinioObjectKey(versionToRestore.getMinioObjectKey());
        newVersion.setSizeBytes(versionToRestore.getSizeBytes());
        newVersion.setUploadedBy(owner);

        FileVersion savedVersion = fileVersionRepository.save(newVersion);

        fileEntity.setCurrentVersion(savedVersion);
        fileEntity.setSizeBytes(versionToRestore.getSizeBytes());
        fileRepository.save(fileEntity);

        if (sizeDifference != 0) {
            owner.setStorageUsedBytes(owner.getStorageUsedBytes() + sizeDifference);
            userRepository.save(owner);
        }

        return mapToFileDto(fileEntity);
    }

    @Async
    public CompletableFuture<List<FileDto>> uploadFilesAsync(Long userId, List<MultipartFile> files, Long folderId) {
        List<FileDto> uploadedFiles = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                uploadedFiles.add(uploadFileWithUser(userId, file, folderId));
            } catch (Exception e) {
                // In a real app we might return a status object with successes/failures
                e.printStackTrace();
            }
        }
        return CompletableFuture.completedFuture(uploadedFiles);
    }
}
