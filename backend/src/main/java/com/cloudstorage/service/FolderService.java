package com.cloudstorage.service;

import com.cloudstorage.dto.request.FolderCreateRequest;
import com.cloudstorage.dto.request.FolderUpdateRequest;
import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.FolderContentDto;
import com.cloudstorage.dto.response.FolderDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.FileVersion;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.ConflictException;
import com.cloudstorage.exception.ForbiddenOperationException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FileVersionRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
        
        Folder parent = null;
        if (request.getParentFolderId() != null) {
            parent = folderRepository.findById(request.getParentFolderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent folder not found"));
            if (!parent.getOwner().getId().equals(userId)) {
                throw new ForbiddenOperationException("Cannot create folder in another user's folder");
            }
        }

        boolean exists = parent == null 
            ? folderRepository.existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, request.getName().trim())
            : folderRepository.existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, parent.getId(), request.getName().trim());

        if (exists) {
            throw new ConflictException("A folder with this name already exists in the destination");
        }

        Folder folder = new Folder();
        folder.setName(request.getName().trim());
        folder.setOwner(owner);
        folder.setParentFolder(parent);
        
        Folder saved = folderRepository.save(folder);
        return mapToDto(saved);
    }

    @Transactional
    public FolderDto updateFolder(Long folderId, FolderUpdateRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        if (!folder.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }
        
        if (folder.isDeleted()) {
            throw new ForbiddenOperationException("Cannot update a deleted folder");
        }

        boolean nameChanged = request.getName() != null && !request.getName().trim().equals(folder.getName());
        boolean parentChanged = false;
        Folder newParent = folder.getParentFolder();

        if (Boolean.TRUE.equals(request.getMoveToRoot())) {
            parentChanged = folder.getParentFolder() != null;
            newParent = null;
        } else if (request.getParentFolderId() != null) {
            parentChanged = folder.getParentFolder() == null || !folder.getParentFolder().getId().equals(request.getParentFolderId());
            if (parentChanged) {
                newParent = folderRepository.findById(request.getParentFolderId())
                        .orElseThrow(() -> new ResourceNotFoundException("Target parent folder not found"));
                if (!newParent.getOwner().getId().equals(userId)) {
                    throw new ForbiddenOperationException("Cannot move to another user's folder");
                }
                if (newParent.isDeleted()) {
                    throw new ForbiddenOperationException("Cannot move into a deleted folder");
                }
                com.cloudstorage.util.FolderCycleValidator.validateNoCycle(folder, newParent);
            }
        }

        if (nameChanged || parentChanged) {
            String checkName = request.getName() != null ? request.getName().trim() : folder.getName();
            Long checkParentId = newParent != null ? newParent.getId() : null;

            boolean exists = checkParentId == null
                    ? folderRepository.existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalse(userId, checkName)
                    : folderRepository.existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalse(userId, checkParentId, checkName);

            if (exists) {
                throw new ConflictException("A folder with this name already exists in the destination");
            }

            if (nameChanged) folder.setName(request.getName().trim());
            if (parentChanged) folder.setParentFolder(newParent);
            
            return mapToDto(folderRepository.save(folder));
        }
        return mapToDto(folder);
    }

    @Transactional
    public void deleteFolder(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        if (!folder.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }

        recursiveSetDeleted(folder, true, java.time.Instant.now());
    }

    @Transactional
    public void restoreFolder(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        if (!folder.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }
        
        if (!folder.isDeleted()) return;

        if (folder.getParentFolder() != null && folder.getParentFolder().isDeleted()) {
            throw new ConflictException("Cannot restore because the parent folder is also in the trash. Restore the parent first.");
        }

        Long parentId = folder.getParentFolder() != null ? folder.getParentFolder().getId() : null;
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

        recursivePermanentDelete(folder);
    }

    private void recursiveSetDeleted(Folder folder, boolean deleted, java.time.Instant timestamp) {
        folder.setDeleted(deleted);
        folder.setDeletedAt(timestamp);
        folderRepository.save(folder);

        List<Folder> subfolders = folderRepository.findByOwnerIdAndParentFolderId(folder.getOwner().getId(), folder.getId());
        for (Folder sub : subfolders) {
            recursiveSetDeleted(sub, deleted, timestamp);
        }

        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderId(folder.getOwner().getId(), folder.getId());
        for (FileEntity file : files) {
            file.setDeleted(deleted);
            file.setDeletedAt(timestamp);
            fileRepository.save(file);
        }
    }

    private void recursivePermanentDelete(Folder folder) {
        List<Folder> subfolders = folderRepository.findByOwnerIdAndParentFolderId(folder.getOwner().getId(), folder.getId());
        for (Folder sub : subfolders) {
            recursivePermanentDelete(sub);
        }

        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderId(folder.getOwner().getId(), folder.getId());
        for (FileEntity file : files) {
            User owner = userRepository.findByIdWithPessimisticWriteLock(file.getOwner().getId()).orElseThrow();
            List<FileVersion> versions = fileVersionRepository.findByFileIdOrderByVersionNumberDesc(file.getId());
            for (FileVersion version : versions) {
                minioService.deleteFile(version.getMinioObjectKey());
                owner.setStorageUsedBytes(Math.max(0, owner.getStorageUsedBytes() - version.getSizeBytes()));
            }
            userRepository.save(owner);
        }
        
        folderRepository.delete(folder);
    }

    @Transactional(readOnly = true)
    public FolderContentDto getRootContents() {
        Long userId = currentUserProvider.getCurrentUserId();
        List<Folder> subfolders = folderRepository.findByOwnerIdAndParentFolderIsNullAndDeletedFalse(userId);
        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderIsNullAndDeletedFalse(userId);

        return FolderContentDto.builder()
                .folder(null)
                .subfolders(subfolders.stream().map(this::mapToDto).collect(Collectors.toList()))
                .files(files.stream().map(this::mapToFileDto).collect(Collectors.toList()))
                .build();
    }

    @Transactional(readOnly = true)
    public FolderContentDto getFolderContents(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        if (!folder.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }

        List<Folder> subfolders = folderRepository.findByOwnerIdAndParentFolderIdAndDeletedFalse(userId, folderId);
        List<FileEntity> files = fileRepository.findByOwnerIdAndFolderIdAndDeletedFalse(userId, folderId);

        return FolderContentDto.builder()
                .folder(mapToDto(folder))
                .subfolders(subfolders.stream().map(this::mapToDto).collect(Collectors.toList()))
                .files(files.stream().map(this::mapToFileDto).collect(Collectors.toList()))
                .build();
    }

    @Transactional(readOnly = true)
    public List<FolderDto> getBreadcrumb(Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Folder current = folderRepository.findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("Folder not found"));

        if (!current.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Folder not found");
        }

        List<FolderDto> breadcrumb = new ArrayList<>();
        while (current != null) {
            breadcrumb.add(mapToDto(current));
            current = current.getParentFolder();
        }
        Collections.reverse(breadcrumb);
        return breadcrumb;
    }
}
