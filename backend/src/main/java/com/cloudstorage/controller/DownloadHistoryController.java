package com.cloudstorage.controller;

import com.cloudstorage.dto.response.DownloadHistoryDto;
import com.cloudstorage.dto.response.PageResponse;
import com.cloudstorage.entity.DownloadHistory;
import com.cloudstorage.repository.DownloadHistoryRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/download-history")
@RequiredArgsConstructor
public class DownloadHistoryController {
    private final DownloadHistoryRepository downloadHistoryRepository;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<DownloadHistoryDto>> getDownloadHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageResponse.validate(page, size);
        Long userId = currentUserProvider.getCurrentUserId();
        var history = downloadHistoryRepository.findByUserIdOrderByDownloadedAtDesc(userId, PageRequest.of(page, size))
                .map(this::toDto);
        return ResponseEntity.ok(PageResponse.from(history));
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<Void> clearDownloadHistory() {
        downloadHistoryRepository.deleteByUserId(currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    private DownloadHistoryDto toDto(DownloadHistory record) {
        return DownloadHistoryDto.builder()
                .id(record.getId())
                .fileId(record.getFile() == null ? null : record.getFile().getId())
                .fileNameSnapshot(record.getFileNameSnapshot())
                .downloadedAt(record.getDownloadedAt())
                .build();
    }
}
