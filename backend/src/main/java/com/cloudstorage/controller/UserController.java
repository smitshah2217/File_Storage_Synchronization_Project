package com.cloudstorage.controller;

import com.cloudstorage.dto.request.PasswordChangeRequest;
import com.cloudstorage.dto.request.ProfileUpdateRequest;
import com.cloudstorage.dto.response.StorageUsageDto;
import com.cloudstorage.dto.response.UserDto;
import com.cloudstorage.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping
    public ResponseEntity<UserDto> getProfile() {
        return ResponseEntity.ok(userService.getProfile());
    }

    @PutMapping
    public ResponseEntity<UserDto> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile(request));
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        userService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/storage")
    public ResponseEntity<StorageUsageDto> getStorageUsage() {
        return ResponseEntity.ok(userService.getStorageUsage());
    }
}
