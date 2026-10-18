package com.cloudstorage.controller;

import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.FolderDto;
import com.cloudstorage.dto.response.PageResponse;
import com.cloudstorage.dto.response.SearchResultDto;
import com.cloudstorage.dto.response.StorageDashboardDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.Folder;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.FolderRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SearchDashboardController {
    private final FileEntityRepository fileRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/search")
    @Transactional(readOnly = true)
    public ResponseEntity<SearchResultDto> search(
            @RequestParam("q") String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResponse.validate(page, size);
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.isEmpty() || normalizedQuery.length() > 255) {
            throw new BadRequestException("Search query must contain between 1 and 255 characters");
        }
        Long userId = currentUserProvider.getCurrentUserId();
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        var folders = folderRepository.searchByName(userId, normalizedQuery, pageable).map(this::mapFolderDto);
        var files = fileRepository.searchAccessibleByName(userId, normalizedQuery, pageable).map(this::mapFileDto);
        return ResponseEntity.ok(SearchResultDto.builder()
                .folders(PageResponse.from(folders))
                .files(PageResponse.from(files))
                .build());
    }

    @GetMapping("/storage/dashboard")
    @Transactional(readOnly = true)
    public ResponseEntity<StorageDashboardDto> getStorageDashboard() {
        Long userId = currentUserProvider.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        long totalFiles = fileRepository.countByOwnerIdAndDeletedFalse(userId);
        long totalFolders = folderRepository.countByOwnerIdAndDeletedFalse(userId);
        double percentage = user.getStorageLimitBytes() > 0
                ? (double) user.getStorageUsedBytes() / user.getStorageLimitBytes() * 100
                : 0;
        return ResponseEntity.ok(StorageDashboardDto.builder()
                .storageLimitBytes(user.getStorageLimitBytes())
                .storageUsedBytes(user.getStorageUsedBytes())
                .storageAvailableBytes(Math.max(0, user.getStorageLimitBytes() - user.getStorageUsedBytes()))
                .usagePercentage(Math.round(percentage * 100.0) / 100.0)
                .totalFiles(totalFiles)
                .totalFolders(totalFolders)
                .build());
    }

    private FolderDto mapFolderDto(Folder folder) {
        return FolderDto.builder()
                .id(folder.getId())
                .name(folder.getName())
                .parentFolderId(folder.getParentFolder() == null ? null : folder.getParentFolder().getId())
                .ownerId(folder.getOwner().getId())
                .createdAt(folder.getCreatedAt())
                .build();
    }

    private FileDto mapFileDto(FileEntity file) {
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
}
