package com.cloudstorage.controller;

import com.cloudstorage.dto.request.SharePermissionRequest;
import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.PageResponse;
import com.cloudstorage.dto.response.ShareDto;
import com.cloudstorage.service.ShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ShareController {
    private final ShareService shareService;

    @PostMapping({"/api/files/{fileId}/share", "/api/files/{fileId}/shares"})
    public ResponseEntity<ShareDto> shareFile(@PathVariable Long fileId, @Valid @RequestBody ShareRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shareService.shareFile(fileId, request));
    }

    @GetMapping({"/api/files/{fileId}/share", "/api/files/{fileId}/shares"})
    public ResponseEntity<PageResponse<ShareDto>> getSharesForFile(
            @PathVariable Long fileId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(shareService.getSharesForFile(fileId, page, size));
    }

    @PutMapping({"/api/files/{fileId}/share/{shareId}", "/api/files/{fileId}/shares/{shareId}"})
    public ResponseEntity<ShareDto> updateSharePermission(
            @PathVariable Long fileId,
            @PathVariable Long shareId,
            @Valid @RequestBody SharePermissionRequest request) {
        return ResponseEntity.ok(shareService.updateSharePermission(fileId, shareId, request));
    }

    @DeleteMapping({"/api/files/{fileId}/share/{shareId}", "/api/files/{fileId}/shares/{shareId}"})
    public ResponseEntity<Void> revokeShare(@PathVariable Long fileId, @PathVariable Long shareId) {
        shareService.revokeShare(fileId, shareId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping({"/api/shared/files", "/api/shared-with-me"})
    public ResponseEntity<PageResponse<ShareDto>> getSharedWithMe(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(shareService.getSharedWithMe(page, size));
    }

    @GetMapping("/api/shared/by-me")
    public ResponseEntity<PageResponse<ShareDto>> getSharedByMe(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(shareService.getSharedByMe(page, size));
    }
}
