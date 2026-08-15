package com.cloudstorage.controller;

import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.service.FileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import com.cloudstorage.dto.response.FileVersionDto;
import com.cloudstorage.security.CurrentUserProvider;
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;
    private final CurrentUserProvider currentUserProvider;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileDto> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) Long folderId) {
        
        FileDto result = fileService.uploadFile(file, folderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FileDto> getFile(@PathVariable Long id) {
        return ResponseEntity.ok(fileService.getFileDetails(id));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<InputStreamResource> downloadFile(@PathVariable Long id) {
        FileEntity fileEntity = fileService.getFileEntity(id); // Needed for filename & mimetype
        InputStream stream = fileService.downloadFile(id);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileEntity.getName() + "\"")
                .contentType(MediaType.parseMediaType(fileEntity.getMimeType() != null ? fileEntity.getMimeType() : "application/octet-stream"))
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<InputStreamResource> previewFile(@PathVariable Long id) {
        FileEntity fileEntity = fileService.getFileEntity(id);
        InputStream stream = fileService.previewFile(id);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileEntity.getName() + "\"")
                .contentType(MediaType.parseMediaType(fileEntity.getMimeType()))
                .body(new InputStreamResource(stream));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FileDto> updateFile(@PathVariable Long id, @Valid @RequestBody com.cloudstorage.dto.request.FileUpdateRequest request) {
        return ResponseEntity.ok(fileService.updateFile(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long id) {
        fileService.deleteFile(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreFile(@PathVariable Long id) {
        fileService.restoreFile(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDeleteFile(@PathVariable Long id) {
        fileService.permanentDeleteFile(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FileDto> uploadNewVersion(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fileService.uploadNewVersion(id, file));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<FileVersionDto>> getFileVersions(@PathVariable Long id) {
        return ResponseEntity.ok(fileService.getFileVersions(id));
    }

    @GetMapping("/{id}/versions/{version}/download")
    public ResponseEntity<InputStreamResource> downloadFileVersion(@PathVariable Long id, @PathVariable Integer version) {
        FileEntity fileEntity = fileService.getFileEntity(id);
        InputStream stream = fileService.downloadFileVersion(id, version);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileEntity.getName() + "\"")
                .contentType(MediaType.parseMediaType(fileEntity.getMimeType() != null ? fileEntity.getMimeType() : "application/octet-stream"))
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/{id}/versions/{version}/preview")
    public ResponseEntity<InputStreamResource> previewFileVersion(@PathVariable Long id, @PathVariable Integer version) {
        FileEntity fileEntity = fileService.getFileEntity(id);
        InputStream stream = fileService.previewFileVersion(id, version);
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileEntity.getName() + "\"")
                .contentType(MediaType.parseMediaType(fileEntity.getMimeType()))
                .body(new InputStreamResource(stream));
    }

    @PostMapping("/{id}/versions/{version}/restore")
    public ResponseEntity<FileDto> restoreFileVersion(@PathVariable Long id, @PathVariable Integer version) {
        return ResponseEntity.ok(fileService.restoreFileVersion(id, version));
    }

    @PostMapping(value = "/upload-batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CompletableFuture<ResponseEntity<List<FileDto>>> uploadFilesBatch(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "folderId", required = false) Long folderId) {
        Long userId = currentUserProvider.getCurrentUserId();
        return fileService.uploadFilesAsync(userId, files, folderId)
                .thenApply(result -> ResponseEntity.status(HttpStatus.CREATED).body(result));
    }
}
