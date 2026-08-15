package com.cloudstorage.controller;

import com.cloudstorage.dto.response.DownloadHistoryDto;
import com.cloudstorage.entity.DownloadHistory;
import com.cloudstorage.repository.DownloadHistoryRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/download-history")
@RequiredArgsConstructor
public class DownloadHistoryController {

    private final DownloadHistoryRepository downloadHistoryRepository;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public ResponseEntity<List<DownloadHistoryDto>> getDownloadHistory() {
        Long userId = currentUserProvider.getCurrentUserId();
        List<DownloadHistory> history = downloadHistoryRepository.findByUserIdOrderByDownloadedAtDesc(userId);

        List<DownloadHistoryDto> result = history.stream()
                .map(h -> DownloadHistoryDto.builder()
                        .id(h.getId())
                        .fileId(h.getFile() != null ? h.getFile().getId() : null)
                        .fileNameSnapshot(h.getFileNameSnapshot())
                        .downloadedAt(h.getDownloadedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
