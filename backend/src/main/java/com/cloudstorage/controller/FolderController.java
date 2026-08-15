package com.cloudstorage.controller;

import com.cloudstorage.dto.request.FolderCreateRequest;
import com.cloudstorage.dto.response.FolderContentDto;
import com.cloudstorage.dto.response.FolderDto;
import com.cloudstorage.service.FolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @PostMapping
    public ResponseEntity<FolderDto> createFolder(@Valid @RequestBody FolderCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(folderService.createFolder(request));
    }

    @GetMapping("/root")
    public ResponseEntity<FolderContentDto> getRootContents() {
        return ResponseEntity.ok(folderService.getRootContents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FolderContentDto> getFolderContents(@PathVariable Long id) {
        return ResponseEntity.ok(folderService.getFolderContents(id));
    }

    @GetMapping("/{id}/breadcrumb")
    public ResponseEntity<List<FolderDto>> getBreadcrumb(@PathVariable Long id) {
        return ResponseEntity.ok(folderService.getBreadcrumb(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FolderDto> updateFolder(@PathVariable Long id, @Valid @RequestBody com.cloudstorage.dto.request.FolderUpdateRequest request) {
        return ResponseEntity.ok(folderService.updateFolder(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable Long id) {
        folderService.deleteFolder(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreFolder(@PathVariable Long id) {
        folderService.restoreFolder(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDeleteFolder(@PathVariable Long id) {
        folderService.permanentDeleteFolder(id);
        return ResponseEntity.noContent().build();
    }
}
