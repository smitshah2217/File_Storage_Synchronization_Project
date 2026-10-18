package com.cloudstorage.service;

import com.cloudstorage.dto.request.SharePermissionRequest;
import com.cloudstorage.dto.request.ShareRequest;
import com.cloudstorage.dto.response.PageResponse;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
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
        Long ownerId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        if (!file.getOwner().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("File not found");
        }
        if (file.isDeleted()) {
            throw new BadRequestException("Cannot share a deleted file");
        }

        String username = request.getSharedWithUsername().trim();
        User recipient = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(username, username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (ownerId.equals(recipient.getId())) {
            throw new BadRequestException("A file cannot be shared with its owner");
        }
        if (shareRepository.existsByFileIdAndSharedWithUserId(fileId, recipient.getId())) {
            throw new ConflictException("File is already shared with this user. Update the existing permission instead.");
        }

        String permission = request.getPermission() == null ? "VIEW" : request.getPermission().toUpperCase(Locale.ROOT);
        validatePermission(permission);
        Share share = new Share();
        share.setFile(file);
        share.setOwner(file.getOwner());
        share.setSharedWithUser(recipient);
        share.setPermission(permission);
        return mapToDto(shareRepository.save(share));
    }

    @Transactional
    public void revokeShare(Long fileId, Long shareId) {
        Long userId = currentUserProvider.getCurrentUserId();
        Share share = shareRepository.findById(shareId)
                .filter(item -> item.getFile().getId().equals(fileId))
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));
        if (!share.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Share not found");
        }
        shareRepository.delete(share);
    }

    @Transactional(readOnly = true)
    public PageResponse<ShareDto> getSharesForFile(Long fileId, int page, int size) {
        PageResponse.validate(page, size);
        Long userId = currentUserProvider.getCurrentUserId();
        FileEntity file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        if (!file.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("File not found");
        }
        var shares = shareRepository.findByFileIdAndFileDeletedFalse(fileId,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::mapToDto);
        return PageResponse.from(shares);
    }

    @Transactional(readOnly = true)
    public PageResponse<ShareDto> getSharedWithMe(int page, int size) {
        PageResponse.validate(page, size);
        Long userId = currentUserProvider.getCurrentUserId();
        var shares = shareRepository.findSharedWithMeExcludingDeleted(userId,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::mapToDto);
        return PageResponse.from(shares);
    }

    @Transactional(readOnly = true)
    public PageResponse<ShareDto> getSharedByMe(int page, int size) {
        PageResponse.validate(page, size);
        Long userId = currentUserProvider.getCurrentUserId();
        var shares = shareRepository.findSharedByMeExcludingDeleted(userId,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::mapToDto);
        return PageResponse.from(shares);
    }

    @Transactional
    public ShareDto updateSharePermission(Long fileId, Long shareId, SharePermissionRequest request) {
        Long userId = currentUserProvider.getCurrentUserId();
        Share share = shareRepository.findById(shareId)
                .filter(item -> item.getFile().getId().equals(fileId))
                .orElseThrow(() -> new ResourceNotFoundException("Share not found"));
        if (!share.getOwner().getId().equals(userId)) {
            throw new ResourceNotFoundException("Share not found");
        }
        String permission = request.getPermission().toUpperCase(Locale.ROOT);
        validatePermission(permission);
        share.setPermission(permission);
        return mapToDto(shareRepository.save(share));
    }

    public boolean hasAccess(Long fileId, Long userId) {
        return shareRepository.findByFileIdAndSharedWithUserIdAndFileDeletedFalse(fileId, userId).isPresent();
    }

    public boolean hasEditAccess(Long fileId, Long userId) {
        return shareRepository.findByFileIdAndSharedWithUserIdAndFileDeletedFalse(fileId, userId)
                .map(share -> "EDIT".equals(share.getPermission()))
                .orElse(false);
    }

    private void validatePermission(String permission) {
        if (!"VIEW".equals(permission) && !"EDIT".equals(permission)) {
            throw new BadRequestException("Permission must be VIEW or EDIT");
        }
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
