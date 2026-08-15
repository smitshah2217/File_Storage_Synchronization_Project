package com.cloudstorage.controller;

import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.ShareDto;
import com.cloudstorage.service.ShareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    @PostMapping("/api/files/{fileId}/shares")
    public ResponseEntity<ShareDto> shareFile(
            @PathVariable Long fileId,
            @Valid @RequestBody ShareRequest request) {
        ShareDto share = shareService.shareFile(fileId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(share);
    }

    @GetMapping("/api/files/{fileId}/shares")
    public ResponseEntity<List<ShareDto>> getSharesForFile(@PathVariable Long fileId) {
        return ResponseEntity.ok(shareService.getSharesForFile(fileId));
    }

    @PutMapping("/api/files/{fileId}/shares/{shareId}")
    public ResponseEntity<ShareDto> updateSharePermission(
            @PathVariable Long fileId,
            @PathVariable Long shareId,
            @RequestBody Map<String, String> body) {
        String permission = body.get("permission");
        return ResponseEntity.ok(shareService.updateSharePermission(fileId, shareId, permission));
    }

    @DeleteMapping("/api/files/{fileId}/shares/{shareId}")
    public ResponseEntity<Void> revokeShare(
            @PathVariable Long fileId,
            @PathVariable Long shareId) {
        shareService.revokeShare(fileId, shareId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/shared-with-me")
    public ResponseEntity<List<ShareDto>> getSharedWithMe() {
        return ResponseEntity.ok(shareService.getSharedWithMe());
    }
}
