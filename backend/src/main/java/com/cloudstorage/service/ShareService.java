package com.cloudstorage.service;

import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.FileDto;
import com.cloudstorage.dto.response.ShareDto;
import com.cloudstorage.entity.FileEntity;
import com.cloudstorage.entity.Share;
import com.cloudstorage.entity.User;
import com.cloudstorage.exception.BadRequestException;
import com.cloudstorage.exception.ConflictException;
import com.cloudstorage.exception.ForbiddenOperationException;
import com.cloudstorage.exception.ResourceNotFoundException;
import com.cloudstorage.repository.FileEntityRepository;
import com.cloudstorage.repository.ShareRepository;
import com.cloudstorage.repository.UserRepository;
import com.cloudstorage.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShareService {

    private final ShareRepository shareRepository;
    private final FileEntityRepository fileRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public ShareDto shareFile(Long fileId, ShareRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();

        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getOwner().getId().equals(userId)) {
            throw new ForbiddenOperationException("Only the file owner can share this file");
        }

        if (file.isDeleted()) {
            throw new BadRequestException("Cannot share a deleted file");
        }

        if (userId.equals(request.getSharedWithUserId())) {
            throw new BadRequestException("Cannot share a file with yourself");
        }

        User sharedWithUser = userRepository.findById(request.getSharedWithUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Target user not found"));

        if (shareRepository.existsByFileIdAndSharedWithUserId(fileId, request.getSharedWithUserId())) {
            throw new ConflictException("File is already shared with this user");
        }

        String permission = request.getPermission();
        if (permission == null || (!permission.equals("VIEW") && !permission.equals("EDIT"))) {
            permission = "VIEW";
        }

        Share share = new Share();
        share.setFile(file);
        share.setOwner(file.getOwner());
        share.setSharedWithUser(sharedWithUser);
        share.setPermission(permission);

        Share saved = shareRepository.save(share);
        return mapToDto(saved);
    }

    @Transactional
    public void revokeShare(Long fileId, Long shareId) {
        Long userId = currentUserProvider.getCurrentUserId();

        Share share = shareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));

        if (!share.getFile().getId().equals(fileId)) {
            throw new ResourceNotFoundException("Share not found for this file");
        }

        if (!share.getOwner().getId().equals(userId)) {
            throw new ForbiddenOperationException("Only the file owner can revoke sharing");
        }

        shareRepository.delete(share);
    }

    @Transactional(readOnly = true)
    public List<ShareDto> getSharesForFile(Long fileId) {
        Long userId = currentUserProvider.getCurrentUserId();

        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getOwner().getId().equals(userId)) {
            throw new ForbiddenOperationException("Only the file owner can view shares");
        }

        return shareRepository.findByFileId(fileId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ShareDto> getSharedWithMe() {
        Long userId = currentUserProvider.getCurrentUserId();

        return shareRepository.findSharedWithMeExcludingDeleted(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ShareDto updateSharePermission(Long fileId, Long shareId, String permission) {
        Long userId = currentUserProvider.getCurrentUserId();

        Share share = shareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));

        if (!share.getFile().getId().equals(fileId)) {
            throw new ResourceNotFoundException("Share not found for this file");
        }

        if (!share.getOwner().getId().equals(userId)) {
            throw new ForbiddenOperationException("Only the file owner can modify sharing permissions");
        }

        if (!permission.equals("VIEW") && !permission.equals("EDIT")) {
            throw new BadRequestException("Permission must be VIEW or EDIT");
        }

        share.setPermission(permission);
        Share updated = shareRepository.save(share);
        return mapToDto(updated);
    }

    /**
     * Check if a user has at least VIEW access to a file via sharing.
     */
    public boolean hasAccess(Long fileId, Long userId) {
        return shareRepository.findByFileIdAndSharedWithUserId(fileId, userId).isPresent();
    }

    /**
     * Check if a user has EDIT access to a file via sharing.
     */
    public boolean hasEditAccess(Long fileId, Long userId) {
        return shareRepository.findByFileIdAndSharedWithUserId(fileId, userId)
                .map(share -> "EDIT".equals(share.getPermission()))
                .orElse(false);
    }

    private ShareDto mapToDto(Share share) {
        return ShareDto.builder()
                .id(share.getId())
                .fileId(share.getFile().getId())
                .fileName(share.getFile().getName())
                .ownerId(share.getOwner().getId())
                .ownerUsername(share.getOwner().getUsername())
                .sharedWithUserId(share.getSharedWithUser().getId())
                .sharedWithUsername(share.getSharedWithUser().getUsername())
                .permission(share.getPermission())
                .createdAt(share.getCreatedAt())
                .build();
    }
}
