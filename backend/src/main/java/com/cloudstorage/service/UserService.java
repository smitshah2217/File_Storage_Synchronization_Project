package com.cloudstorage.service;

import com.cloudstorage.dto.request.PasswordChangeRequest;
import com.cloudstorage.dto.request.ProfileUpdateRequest;
import com.cloudstorage.dto.response.StorageUsageDto;
import com.cloudstorage.dto.response.UserDto;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ConflictException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public UserDto getProfile() {
        return toDto(currentUser());
    }

    @Transactional
    public UserDto updateProfile(ProfileUpdateRequest request) {
        User user = currentUser();
        String username = request.getUsername();
        String email = request.getEmail();
        if (username == null && email == null) {
            throw new BadRequestException("Provide a username or email to update");
        }

        if (username != null) {
            username = username.trim();
            if (username.isEmpty()) {
                throw new BadRequestException("Username must not be blank");
            }
            if (userRepository.existsByUsernameIgnoreCaseAndIdNot(username, user.getId())) {
                throw new ConflictException("Username already taken");
            }
            user.setUsername(username);
        }

        if (email != null) {
            email = email.trim().toLowerCase(Locale.ROOT);
            if (email.isEmpty()) {
                throw new BadRequestException("Email must not be blank");
            }
            if (userRepository.existsByEmailIgnoreCaseAndIdNot(email, user.getId())) {
                throw new ConflictException("Email already taken");
            }
            user.setEmail(email);
        }
        return toDto(userRepository.save(user));
    }

    @Transactional
    public void changePassword(PasswordChangeRequest request) {
        User user = currentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BadRequestException("New password must be different from the current password");
        }
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public StorageUsageDto getStorageUsage() {
        User user = currentUser();
        return StorageUsageDto.builder()
                .storageUsedBytes(user.getStorageUsedBytes())
                .storageLimitBytes(user.getStorageLimitBytes())
                .build();
    }

    private User currentUser() {
        return userRepository.findById(currentUserProvider.getCurrentUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }
}
