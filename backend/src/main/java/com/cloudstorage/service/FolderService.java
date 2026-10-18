package com.cloudstorage.service;

import com.cloudstorage.dto.request.FolderCreateRequest;
import com.cloudstorage.dto.request.FolderUpdateRequest;
import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.FolderContentDto;
import com.cloudstorage.dto.response.FolderDto;
import com.cloudstorage.dto.response.PageResponse;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileVersion;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ConflictException;
import com.cloudstorage.exception.ForbiddenOperationException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.DownloadHistoryRepository;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FileVersionRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.ShareRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import com.cloudstorage.util.FolderCycleValidator;
import com.cloudstorage.util.ItemNameValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderService {
    private final FolderRepository folderRepository;
    private final FileEntityRepository fileRepository;
    private final FileVersionRepository fileVersionRepository;
    private final ShareRepository shareRepository;
    private final DownloadHistoryRepository downloadHistoryRepository;
    private final UserRepository userRepository;
    private final MinioService minioService;
    private final CurrentUserProvider currentUserProvider;

    private FolderDto mapToDto(Folder folder) {
        return FolderDto.builder()
                .id(folder.getId())
                .name(folder.getName())
                .parentFolderId(folder.getParentFolder() != null ? folder.getParentFolder().getId() : null)
                .ownerId(folder.getOwner().getId())
                .createdAt(folder.getCreatedAt())
                .build();
    }

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
    public FolderDto createFolder(FolderCreateRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        User owner = userRepository.getReferenceById(userId);
        String name = ItemNameValidator.normalize(request.getName(), "Folder");
        Folder parent = null;
        if (request.getParentFolderId() != null) {
            parent = folderRepository.findById(request.getParentFolderId())
                    .filter(folder -> !folder.isDeleted())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent folder not found"));
            if (!parent.getOwner().getId().equals(userId)) {
                throw new ResourceNotFoundException("Parent folder not found");
            }
        }

        boolean exists = parent == null
                ? folderRepository.existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, name)
                : folderRepository.existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, parent.getId(), name);
        if (exists) {
            throw new ConflictException("A folder with this name already exists in the destination");
        }

        Folder folder = new Folder();
        folder.setName(name);
        folder.setOwner(owner);
        folder.setParentFolder(parent);
        return mapToDto(folderRepository.save(folder));
    }

    @Transactional
    public FolderDto updateFolder(Long folderId, FolderUpdateRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = findOwnedActiveFolder(folderId, userId);
        if (Boolean.TRUE.equals(request.getMoveToRoot()) && request.getParentFolderId() != null) {
            throw new BadRequestException("Provide either parentFolderId or moveToRoot, not both");
        }

        String updatedName = request.getName() == null ? folder.getName() : ItemNameValidator.normalize(request.getName(), "Folder");
        boolean nameChanged = !updatedName.equals(folder.getName());
        boolean parentChanged = false;
        Folder newParent = folder.getParentFolder();

        if (Boolean.TRUE.equals(request.getMoveToRoot())) {
            parentChanged = folder.getParentFolder() != null;
            newParent = null;
        } else if (request.getParentFolderId() != null) {
            parentChanged = folder.getParentFolder() == null || !folder.getParentFolder().getId().equals(request.getParentFolderId());
            if (parentChanged) {
                newParent = folderRepository.findById(request.getParentFolderId())
                        .filter(target -> !target.isDeleted())
                        .orElseThrow(() -> new ResourceNotFoundException("Target parent folder not found"));
                if (!newParent.getOwner().getId().equals(userId)) {
                    throw new ResourceNotFoundException("Target parent folder not found");
                }
                FolderCycleValidator.validateNoCycle(folder, newParent);
            }
        }

        if (nameChanged || parentChanged) {
            Long parentId = newParent == null ? null : newParent.getId();
            boolean exists = parentId == null
                    ? folderRepository.existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalseAndIdNot(userId, updatedName, folderId)
                    : folderRepository.existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalseAndIdNot(userId, parentId, updatedName, folderId);
            if (exists) {
                throw new ConflictException("A folder with this name already exists in the destination");
            }
            folder.setName(updatedName);
            folder.setParentFolder(newParent);
        }
        return mapToDto(folderRepository.save(folder));
    }

    @Transactional
    public void deleteFolder(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = findOwnedActiveFolder(folderId, userId);
        recursiveSetDeleted(folder, true, Instant.now());
    }

    @Transactional
    public void restoreFolder(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        if (!folder.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }
        if (!folder.isDeleted()) {
            return;
        }
        if (folder.getParentFolder() != null && folder.getParentFolder().isDeleted()) {
            throw new ConflictException("Cannot restore because the parent folder is also in the trash. Restore the parent first.");
        }

        Long parentId = folder.getParentFolder() == null ? null : folder.getParentFolder().getId();
        boolean exists = parentId == null
                ? folderRepository.existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, folder.getName())
                : folderRepository.existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, parentId, folder.getName());
        if (exists) {
            throw new ConflictException("Cannot restore: a folder with the same name already exists in this location.");
        }
        recursiveSetDeleted(folder, false, null);
    }

    @Transactional
    public void permanentDeleteFolder(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        if (!folder.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }
        if (!folder.isDeleted()) {
            throw new BadRequestException("Only folders in the trash can be permanently deleted");
        }

        User owner = userRepository.findByIdWithPessimisticWriteLock(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<String> objectKeys = new ArrayList<>();
        recursivelyDelete(folder, owner, objectKeys);
        userRepository.save(owner);
        minioService.deleteFilesAfterCommit(objectKeys);
    }

    private void recursiveSetDeleted(Folder folder, boolean deleted, Instant timestamp) {
        folder.setDeleted(deleted);
        folder.setDeletedAt(timestamp);
        folderRepository.save(folder);

        List<Folder> subfolders = folderRepository.findByOwnerIdAndParentFolderId(folder.getOwner().getId(), folder.getId());
        for (Folder subfolder : subfolders) {
            if (subfolder.isDeleted() != deleted) {
                recursiveSetDeleted(subfolder, deleted, timestamp);
            }
        }

        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderId(folder.getOwner().getId(), folder.getId());
        for (FileEntity file : files) {
            if (file.isDeleted() != deleted) {
                file.setDeleted(deleted);
                file.setDeletedAt(timestamp);
                fileRepository.save(file);
            }
        }
    }

    private void recursivelyDelete(Folder folder, User owner, List<String> objectKeys) {
        Long ownerId = folder.getOwner().getId();
        List<Folder> children = folderRepository.findByOwnerIdAndParentFolderId(ownerId, folder.getId());
        for (Folder child : children) {
            recursivelyDelete(child, owner, objectKeys);
        }

        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderId(ownerId, folder.getId());
        for (FileEntity file : files) {
            List<FileVersion> versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(file.getId());
            versions.forEach(version -> objectKeys.add(version.getMinioObjectKey()));
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
        folderRepository.delete(folder);
    }

    @Transactional(readOnly = true)
    public FolderContentDto getRootContents(int page, int size) {
        PageResponse.validate(page, size);
        Long userId = currentUserProvider.getCurrentUserId();
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        var subfolders = folderRepository.findByOwnerIdAndParentFolderIsNullAndDeletedFalse(userId, pageable)
                .map(this::mapToDto);
        var files = fileRepository.findByOwnerIdAndFolderIsNullAndDeletedFalse(userId, pageable)
                .map(this::mapToFileDto);
        return FolderContentDto.builder()
                .folder(null)
                .subfolders(PageResponse.from(subfolders))
                .files(PageResponse.from(files))
                .build();
    }

    @Transactional(readOnly = true)
    public FolderContentDto getFolderContents(Long folderId, int page, int size) {
        PageResponse.validate(page, size);
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = findOwnedActiveFolder(folderId, userId);
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        var subfolders = folderRepository.findByOwnerIdAndParentFolderIdAndDeletedFalse(userId, folderId, pageable)
                .map(this::mapToDto);
        var files = fileRepository.findByOwnerIdAndFolderIdAndDeletedFalse(userId, folderId, pageable)
                .map(this::mapToFileDto);
        return FolderContentDto.builder()
                .folder(mapToDto(folder))
                .subfolders(PageResponse.from(subfolders))
                .files(PageResponse.from(files))
                .build();
    }

    @Transactional(readOnly = true)
    public List<FolderDto> getBreadcrumb(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder current = findOwnedActiveFolder(folderId, userId);
        List<FolderDto> breadcrumb = new ArrayList<>();
        while (current != null) {
            breadcrumb.add(mapToDto(current));
            current = current.getParentFolder();
        }
        Collections.reverse(breadcrumb);
        return breadcrumb;
    }

    private Folder findOwnedActiveFolder(Long folderId, Long userId) {
        Folder folder = folderRepository.findById(folderId)
                .filter(item -> !item.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));
        if (!folder.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }
        return folder;
    }
}
