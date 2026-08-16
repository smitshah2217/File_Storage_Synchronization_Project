package com.cloudstorage.repository;

import com.cloudstorage.entity.Share;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ShareRepository extends JpaRepository<Share, Long> {
    List<Share> findByFileId(Long fileId);
    List<Share> findBySharedWithUserId(Long sharedWithUserId);
    Optional<Share> findByFileIdAndSharedWithUserId(Long fileId, Long sharedWithUserId);
    boolean existsByFileIdAndSharedWithUserId(Long fileId, Long sharedWithUserId);

    @Query("SELECT s FROM Share s WHERE s.sharedWithUser.id = :userId AND s.file.deleted = false")
    List<Share> findSharedWithMeExcludingDeleted(@Param("userId") Long userId);

    List<Share> findByFileIdAndOwnerId(Long fileId, Long ownerId);
}
