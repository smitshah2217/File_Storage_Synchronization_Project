package com.cloudstorage.controller;

import com.cloudstorage.dto.response.*;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import com.cloudstorage.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SearchDashboardController {

    private final FileEntityRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/search")
    public ResponseEntity<SearchResultDto> search(@RequestParam("q") String query) {
        Long userId = currentUserProvider.getCurrentUserId();

        List<Folder> folders = folderRepository.searchByName(userId, query.trim());
        List<FileEntity> files = fileRepository.searchByName(userId, query.trim());

        SearchResultDto result = SearchResultDto.builder()
                .folders(folders.stream().map(this::mapFolderDto).collect(Collectors.toList()))
                .files(files.stream().map(this::mapFileDto).collect(Collectors.toList()))
                .build();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/storage/dashboard")
    public ResponseEntity<StorageDashboardDto> getStorageDashboard() {
        Long userId = currentUserProvider.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        long totalFiles = fileRepository.countByOwnerIdAndDeletedFalse(userId);
        long totalFolders = folderRepository.countByOwnerIdAndDeletedFalse(userId);

        double usagePercentage = user.getStorageLimitBytes() > 0
                ? (double) user.getStorageUsedBytes() / user.getStorageLimitBytes() * 100
                : 0;

        StorageDashboardDto dashboard = StorageDashboardDto.builder()
                .storageLimitBytes(user.getStorageLimitBytes())
                .storageUsedBytes(user.getStorageUsedBytes())
                .storageAvailableBytes(user.getStorageLimitBytes() - user.getStorageUsedBytes())
                .usagePercentage(Math.round(usagePercentage * 100.0) / 100.0)
                .totalFiles(totalFiles)
                .totalFolders(totalFolders)
                .build();

        return ResponseEntity.ok(dashboard);
    }

    private FolderDto mapFolderDto(Folder f) {
        return FolderDto.builder()
                .id(f.getId())
                .name(f.getName())
                .parentFolderId(f.getParentFolder() != null ? f.getParentFolder().getId() : null)
                .ownerId(f.getOwner().getId())
                .createdAt(f.getCreatedAt())
                .build();
    }

    private FileDto mapFileDto(FileEntity f) {
        return FileDto.builder()
                .id(f.getId())
                .name(f.getName())
                .folderId(f.getFolder() != null ? f.getFolder().getId() : null)
                .ownerId(f.getOwner().getId())
                .sizeBytes(f.getSizeBytes())
                .mimeType(f.getMimeType())
                .versionNumber(f.getCurrentVersion() != null ? f.getCurrentVersion().getVersionNumber() : 1)
                .createdAt(f.getCreatedAt())
                .build();
    }
}
