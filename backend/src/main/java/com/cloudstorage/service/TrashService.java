package com.cloudstorage.service;

import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.FolderDto;
import com.cloudstorage.dto.response.PageResponse;
import com.cloudstorage.dto.response.TrashContentsDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileVersion;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.DownloadHistoryRepository;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FileVersionRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.ShareRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrashService {
    private final FolderRepository folderRepository;
    private final FileEntityRepository fileRepository;
    private final FileVersionRepository fileVersionRepository;
    private final ShareRepository shareRepository;
    private final DownloadHistoryRepository downloadHistoryRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public TrashContentsDto getTrashContents(int page, int size) {
        PageResponse.validate(page, size);
        Long userId = currentUserProvider.getCurrentUserId();
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "deletedAt"));
        var folders = folderRepository.findVisibleTrashFolders(userId, pageable).map(folder -> FolderDto.builder()
                .id(folder.getId())
                .name(folder.getName())
                .parentFolderId(folder.getParentFolder() == null ? null : folder.getParentFolder().getId())
                .ownerId(folder.getOwner().getId())
                .createdAt(folder.getCreatedAt())
                .build());
        var files = fileRepository.findVisibleTrashFiles(userId, pageable).map(file -> FileDto.builder()
                .id(file.getId())
                .name(file.getName())
                .folderId(file.getFolder() == null ? null : file.getFolder().getId())
                .ownerId(file.getOwner().getId())
                .sizeBytes(file.getSizeBytes())
                .mimeType(file.getMimeType())
                .versionNumber(file.getCurrentVersion() == null ? 1 : file.getCurrentVersion().getVersionNumber())
                .createdAt(file.getCreatedAt())
                .build());
        return TrashContentsDto.builder()
                .folders(PageResponse.from(folders))
                .files(PageResponse.from(files))
                .build();
    }

    @Transactional
    public void emptyTrash() {
        Long userId = currentUserProvider.getCurrentUserId();
        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
        List<String> objectKeys = new ArrayList<>();

        for (FileEntity file : fileRepository.findByOwnerIdAndDeletedTrue(userId)) {
            permanentlyDeleteFileRecord(file, owner, objectKeys);
        }

        List<Folder> trashedFolders = folderRepository.findByOwnerIdAndDeletedTrue(userId);
        for (Folder folder : trashedFolders) {
            if (folderRepository.existsById(folder.getId())
                    && (folder.getParentFolder() == null || !folder.getParentFolder().isDeleted())) {
                recursivelyDeleteFolder(folder, owner, objectKeys);
            }
        }
        userRepository.save(owner);
        minioService.deleteFilesAfterCommit(objectKeys);
    }

    @Transactional
    public void permanentlyDeleteOlderThan(Instant threshold) {
        List<String> objectKeys = new ArrayList<>();
        Set<Long> deletedFileIds = new HashSet<>();
        List<FileEntity> oldFiles = fileRepository.findByDeletedTrueAndDeletedAtBefore(threshold);
        for (FileEntity file : oldFiles) {
            if (!deletedFileIds.add(file.getId()) || !fileRepository.existsById(file.getId())) {
                continue;
            }
            User owner = userRepository.findByIdWithPessimisticWriteLock(file.getOwner().getId())
                    .orElseThrow(() -> new IllegalStateException("File owner not found"));
            permanentlyDeleteFileRecord(file, owner, objectKeys);
            userRepository.save(owner);
        }

        List<Folder> oldFolders = folderRepository.findByDeletedTrueAndDeletedAtBefore(threshold);
        Set<Long> oldFolderIds = oldFolders.stream().map(Folder::getId).collect(Collectors.toSet());
        for (Folder folder : oldFolders) {
            if (!folderRepository.existsById(folder.getId())) {
                continue;
            }
            Folder parent = folder.getParentFolder();
            boolean parentIsAlsoOld = parent != null && oldFolderIds.contains(parent.getId());
            if (parentIsAlsoOld) {
                continue;
            }
            User owner = userRepository.findByIdWithPessimisticWriteLock(folder.getOwner().getId())
                    .orElseThrow(() -> new IllegalStateException("Folder owner not found"));
            recursivelyDeleteFolder(folder, owner, objectKeys);
            userRepository.save(owner);
        }
        minioService.deleteFilesAfterCommit(objectKeys);
    }

    private void recursivelyDeleteFolder(Folder folder, User owner, List<String> objectKeys) {
        Long ownerId = folder.getOwner().getId();
        List<Folder> children = folderRepository.findByOwnerIdAndParentFolderId(ownerId, folder.getId());
        for (Folder child : children) {
            recursivelyDeleteFolder(child, owner, objectKeys);
        }
        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderId(ownerId, folder.getId());
        for (FileEntity file : files) {
            permanentlyDeleteFileRecord(file, owner, objectKeys);
        }
        folderRepository.delete(folder);
    }

    private void permanentlyDeleteFileRecord(FileEntity file, User owner, List<String> objectKeys) {
        List<FileVersion> versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(file.getId());
        versions.stream().map(FileVersion::getMinioObjectKey).forEach(objectKeys::add);
        owner.setStorageUsedBytes(Math.max(0, owner.getStorageUsedBytes() - file.getSizeBytes()));
        downloadHistoryRepository.detachFile(file.getId());
        shareRepository.deleteByFileId(file.getId());
        if (file.getCurrentVersion() != null) {
            file.setCurrentVersion(null);
            fileRepository.saveAndFlush(file);
        }
        fileVersionRepository.deleteAll(versions);
        fileRepository.delete(file);
    }
}
