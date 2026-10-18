package com.cloudstorage.repository;

import com.cloudstorage.entity.Share;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ShareRepository extends JpaRepository<Share, Long> {
    List<Share> findByFileId(Long fileId);
    void deleteByFileId(Long fileId);
    List<Share> findByFileIdAndFileDeletedFalse(Long fileId);
    Page<Share> findByFileIdAndFileDeletedFalse(Long fileId, Pageable pageable);
    List<Share> findBySharedWithUserId(Long sharedWithUserId);
    Optional<Share> findByFileIdAndSharedWithUserId(Long fileId, Long sharedWithUserId);
    Optional<Share> findByFileIdAndSharedWithUserIdAndFileDeletedFalse(Long fileId, Long sharedWithUserId);
    boolean existsByFileIdAndSharedWithUserId(Long fileId, Long sharedWithUserId);

    @Query(value = "SELECT s FROM Share s WHERE s.sharedWithUser.id = :userId AND s.file.deleted = false",
            countQuery = "SELECT COUNT(s) FROM Share s WHERE s.sharedWithUser.id = :userId AND s.file.deleted = false")
    Page<Share> findSharedWithMeExcludingDeleted(@Param("userId") Long userId, Pageable pageable);

    @Query(value = "SELECT s FROM Share s WHERE s.owner.id = :userId AND s.file.deleted = false",
            countQuery = "SELECT COUNT(s) FROM Share s WHERE s.owner.id = :userId AND s.file.deleted = false")
    Page<Share> findSharedByMeExcludingDeleted(@Param("userId") Long userId, Pageable pageable);

    List<Share> findByFileIdAndOwnerId(Long fileId, Long ownerId);
}
