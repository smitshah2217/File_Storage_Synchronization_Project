package com.cloudstorage.controller;

import com.cloudstorage.dto.response.TrashContentsDto;
import com.cloudstorage.service.TrashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trash")
@RequiredArgsConstructor
public class TrashController {

    private final TrashService trashService;

    @GetMapping
    public ResponseEntity<TrashContentsDto> getTrashContents() {
        return ResponseEntity.ok(trashService.getTrashContents());
    }

    @DeleteMapping
    public ResponseEntity<Void> emptyTrash() {
        trashService.emptyTrash();
        return ResponseEntity.noContent().build();
    }
}
