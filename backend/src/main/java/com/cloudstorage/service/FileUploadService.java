package com.cloudstorage.service;

import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileVersion;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.ConflictException;
import com.cloudstorage.exception.ForbiddenOperationException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.exception.StorageLimitExceededException;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FileVersionRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.util.ItemNameValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileUploadService {
    private final FileEntityRepository fileRepository;
    private final FileVersionRepository fileVersionRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;

    @Value("${app.upload.max-size-bytes:104857600}")
    private long maxUploadSizeBytes;

    @Transactional
    public FileDto uploadFile(Long userId, MultipartFile multipartFile, Long folderId) {
        String filename = ItemNameValidator.normalize(multipartFile.getOriginalFilename(), "File");
        if (multipartFile.getSize() > maxUploadSizeBytes) {
            throw new StorageLimitExceededException("File exceeds the configured upload size limit");
        }

        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (owner.getStorageUsedBytes() + multipartFile.getSize() > owner.getStorageLimitBytes()) {
            throw new StorageLimitExceededException("Storage quota exceeded");
        }

        Folder parent = null;
        if (folderId != null) {
            parent = folderRepository.findById(folderId)
                    .filter(folder -> !folder.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
            if (!parent.getOwner().getId().equals(userId)) {
                throw new ResourceNotFoundException("Folder not found");
            }
        }

        boolean duplicate = parent == null
                ? fileRepository.existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, filename)
                : fileRepository.existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, parent.getId(), filename);
        if (duplicate) {
            throw new ConflictException("A file with this name already exists. Use the upload new version endpoint.");
        }

        String mimeType = normalizedMimeType(multipartFile.getContentType());
        String objectKey = UUID.randomUUID().toString();
        try (InputStream stream = multipartFile.getInputStream()) {
            minioService.uploadFile(objectKey, stream, multipartFile.getSize(), mimeType);
            minioService.deleteFileOnRollback(objectKey);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read uploaded file", exception);
        }

        FileEntity file = new FileEntity();
        file.setName(filename);
        file.setFolder(parent);
        file.setOwner(owner);
        file.setMimeType(mimeType);
        file.setSizeBytes(multipartFile.getSize());
        FileEntity savedFile = fileRepository.save(file);

        FileVersion firstVersion = new FileVersion();
        firstVersion.setFile(savedFile);
        firstVersion.setVersionNumber(1);
        firstVersion.setMinioObjectKey(objectKey);
        firstVersion.setSizeBytes(multipartFile.getSize());
        firstVersion.setMimeType(mimeType);
        firstVersion.setUploadedBy(owner);
        FileVersion savedVersion = fileVersionRepository.save(firstVersion);

        savedFile.setCurrentVersion(savedVersion);
        fileRepository.save(savedFile);
        owner.setStorageUsedBytes(owner.getStorageUsedBytes() + multipartFile.getSize());
        userRepository.save(owner);

        return FileDto.builder()
                .id(savedFile.getId())
                .name(savedFile.getName())
                .folderId(parent == null ? null : parent.getId())
                .ownerId(owner.getId())
                .sizeBytes(savedFile.getSizeBytes())
                .mimeType(savedFile.getMimeType())
                .versionNumber(1)
                .createdAt(savedFile.getCreatedAt())
                .build();
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
}
