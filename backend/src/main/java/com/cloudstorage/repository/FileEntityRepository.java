package com.cloudstorage.repository;

import com.cloudstorage.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FileEntityRepository extends JpaRepository<FileEntity, Long> {
    List<FileEntity> findByOwnerIdAndDeletedFalse(Long ownerId);
    List<FileEntity> findByOwnerIdAndFolderIdAndDeletedFalse(Long ownerId, Long folderId);
    List<FileEntity> findByOwnerIdAndFolderIsNullAndDeletedFalse(Long ownerId);
    List<FileEntity> findByOwnerIdAndFolderId(Long ownerId, Long folderId);
    List<FileEntity> findByOwnerIdAndDeletedTrue(Long ownerId);
    boolean existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalse(Long ownerId, Long folderId, String name);
    boolean existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalse(Long ownerId, String name);

    @Query("SELECT f FROM FileEntity f WHERE f.owner.id = :ownerId AND f.deleted = false AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<FileEntity> searchByName(@Param("ownerId") Long ownerId, @Param("query") String query);

    long countByOwnerIdAndDeletedFalse(Long ownerId);

    List<FileEntity> findByDeletedTrueAndDeletedAtBefore(java.time.Instant threshold);
}
