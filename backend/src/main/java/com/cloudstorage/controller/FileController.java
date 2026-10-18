package com.cloudstorage.controller;

import com.cloudstorage.dto.request.FileUpdateRequest;
import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.FileVersionDto;
import com.cloudstorage.dto.response.PageResponse;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.security.CurrentUserProvider;
import com.cloudstorage.service.FileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CompletableFuture;

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
        return ResponseEntity.status(201).body(fileService.uploadFile(file, folderId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FileDto> getFile(@PathVariable Long id) {
        return ResponseEntity.ok(fileService.getFileDetails(id));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<InputStreamResource> downloadFile(@PathVariable Long id) {
        FileEntity file = fileService.getFileEntity(id);
        InputStream stream = fileService.downloadFile(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(file.getName(), false))
                .header("X-Content-Type-Options", "nosniff")
                .contentType(mediaType(file.getMimeType()))
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<InputStreamResource> previewFile(@PathVariable Long id) {
        FileEntity file = fileService.getFileEntity(id);
        InputStream stream = fileService.previewFile(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(file.getName(), true))
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .contentType(mediaType(file.getMimeType()))
                .body(new InputStreamResource(stream));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FileDto> updateFile(@PathVariable Long id, @Valid @RequestBody FileUpdateRequest request) {
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
    public ResponseEntity<FileDto> uploadNewVersion(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(201).body(fileService.uploadNewVersion(id, file));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<PageResponse<FileVersionDto>> getFileVersions(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(fileService.getFileVersions(id, page, size));
    }

    @GetMapping("/{id}/versions/{version}")
    public ResponseEntity<FileVersionDto> getFileVersion(@PathVariable Long id, @PathVariable Integer version) {
        return ResponseEntity.ok(fileService.getFileVersion(id, version));
    }

    @GetMapping("/{id}/versions/{version}/download")
    public ResponseEntity<InputStreamResource> downloadFileVersion(@PathVariable Long id, @PathVariable Integer version) {
        FileEntity file = fileService.getFileEntity(id);
        FileVersionDto versionDetails = fileService.getFileVersion(id, version);
        InputStream stream = fileService.downloadFileVersion(id, version);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(file.getName(), false))
                .header("X-Content-Type-Options", "nosniff")
                .contentType(mediaType(versionDetails.getMimeType()))
                .body(new InputStreamResource(stream));
    }

    @GetMapping("/{id}/versions/{version}/preview")
    public ResponseEntity<InputStreamResource> previewFileVersion(@PathVariable Long id, @PathVariable Integer version) {
        FileEntity file = fileService.getFileEntity(id);
        FileVersionDto versionDetails = fileService.getFileVersion(id, version);
        InputStream stream = fileService.previewFileVersion(id, version);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(file.getName(), true))
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .contentType(mediaType(versionDetails.getMimeType()))
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
                .thenApply(ResponseEntity::ok);
    }

    private String contentDisposition(String filename, boolean inline) {
        ContentDisposition.Builder builder = inline ? ContentDisposition.inline() : ContentDisposition.attachment();
        return builder.filename(filename, StandardCharsets.UTF_8).build().toString();
    }

    private MediaType mediaType(String value) {
        try {
            return value == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(value);
        } catch (IllegalArgumentException exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
