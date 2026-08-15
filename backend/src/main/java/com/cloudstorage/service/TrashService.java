package com.cloudstorage.service;

import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.FolderDto;
import com.cloudstorage.dto.response.TrashContentsDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileVersion;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FileVersionRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrashService {

    private final FolderRepository folderRepository;
    private final FileEntityRepository fileRepository;
    private final FileVersionRepository fileVersionRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public TrashContentsDto getTrashContents() {
        Long userId = currentUserProvider.getCurrentUserId();

        List<Folder> trashedFolders = folderRepository.findByOwnerIdAndDeletedTrue(userId);
        List<FileEntity> trashedFiles = fileRepository.findByOwnerIdAndDeletedTrue(userId);

        // Only show top-level trashed items (items whose parent is NOT also trashed)
        List<FolderDto> folderDtos = trashedFolders.stream()
                .filter(f -> f.getParentFolder() == null || !f.getParentFolder().isDeleted())
                .map(f -> FolderDto.builder()
                        .id(f.getId())
                        .name(f.getName())
                        .parentFolderId(f.getParentFolder() != null ? f.getParentFolder().getId() : null)
                        .ownerId(f.getOwner().getId())
                        .createdAt(f.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<FileDto> fileDtos = trashedFiles.stream()
                .filter(f -> f.getFolder() == null || !f.getFolder().isDeleted())
                .map(f -> FileDto.builder()
                        .id(f.getId())
                        .name(f.getName())
                        .folderId(f.getFolder() != null ? f.getFolder().getId() : null)
                        .ownerId(f.getOwner().getId())
                        .sizeBytes(f.getSizeBytes())
                        .mimeType(f.getMimeType())
                        .versionNumber(f.getCurrentVersion() != null ? f.getCurrentVersion().getVersionNumber() : 1)
                        .createdAt(f.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return TrashContentsDto.builder()
                .folders(folderDtos)
                .files(fileDtos)
                .build();
    }

    @Transactional
    public void emptyTrash() {
        Long userId = currentUserProvider.getCurrentUserId();

        // Permanently delete all trashed files
        List<FileEntity> trashedFiles = fileRepository.findByOwnerIdAndDeletedTrue(userId);
        User owner = userRepository.findByIdWithPessimisticWriteLock(userId).orElseThrow();

        for (FileEntity file : trashedFiles) {
            List<FileVersion> versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(file.getId());
            for (FileVersion version : versions) {
                minioService.deleteFile(version.getMinioObjectKey());
                owner.setStorageUsedBytes(Math.max(0, owner.getStorageUsedBytes() - version.getSizeBytes()));
            }
            fileRepository.delete(file);
        }

        // Permanently delete all trashed folders (children cascade via DB ON DELETE CASCADE)
        List<Folder> trashedFolders = folderRepository.findByOwnerIdAndDeletedTrue(userId);
        // Delete leaf folders first (those with no trashed children)
        for (Folder folder : trashedFolders) {
            if (folder.getParentFolder() == null || !folder.getParentFolder().isDeleted()) {
                recursivePermanentDeleteFolder(folder);
            }
        }

        userRepository.save(owner);
    }

    private void recursivePermanentDeleteFolder(Folder folder) {
        Long ownerId = folder.getOwner().getId();

        List<Folder> subfolders = folderRepository.findByOwnerIdAndParentFolderId(ownerId, folder.getId());
        for (Folder sub : subfolders) {
            recursivePermanentDeleteFolder(sub);
        }

        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderId(ownerId, folder.getId());
        User owner = userRepository.findByIdWithPessimisticWriteLock(ownerId).orElseThrow();
        for (FileEntity file : files) {
            List<FileVersion> versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(file.getId());
            for (FileVersion version : versions) {
                minioService.deleteFile(version.getMinioObjectKey());
                owner.setStorageUsedBytes(Math.max(0, owner.getStorageUsedBytes() - version.getSizeBytes()));
            }
        }
        userRepository.save(owner);

        folderRepository.delete(folder);
    }
}
