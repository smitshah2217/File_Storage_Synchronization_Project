package com.cloudstorage.repository;

import com.cloudstorage.entity.FileEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface FileEntityRepository extends JpaRepository<FileEntity, Long> {
    List<FileEntity> findByOwnerIdAndDeletedFalse(Long ownerId);
    List<FileEntity> findByOwnerIdAndFolderIdAndDeletedFalse(Long ownerId, Long folderId);
    List<FileEntity> findByOwnerIdAndFolderIsNullAndDeletedFalse(Long ownerId);
    Page<FileEntity> findByOwnerIdAndFolderIsNullAndDeletedFalse(Long ownerId, Pageable pageable);
    Page<FileEntity> findByOwnerIdAndFolderIdAndDeletedFalse(Long ownerId, Long folderId, Pageable pageable);
    List<FileEntity> findByOwnerIdAndFolderId(Long ownerId, Long folderId);
    List<FileEntity> findByOwnerIdAndDeletedTrue(Long ownerId);
    Page<FileEntity> findByOwnerIdAndDeletedTrue(Long ownerId, Pageable pageable);

    boolean existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalse(Long ownerId, Long folderId, String name);
    boolean existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalse(Long ownerId, String name);
    boolean existsByOwnerIdAndFolderIdAndNameIgnoreCaseAndDeletedFalseAndIdNot(Long ownerId, Long folderId, String name, Long id);
    boolean existsByOwnerIdAndFolderIsNullAndNameIgnoreCaseAndDeletedFalseAndIdNot(Long ownerId, String name, Long id);

    @Query("SELECT f FROM FileEntity f WHERE f.owner.id = :ownerId AND f.deleted = false AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<FileEntity> searchByName(@Param("ownerId") Long ownerId, @Param("query") String query);

    @Query(value = "SELECT f FROM FileEntity f WHERE f.deleted = false AND (f.owner.id = :userId OR EXISTS (SELECT s.id FROM Share s WHERE s.file.id = f.id AND s.sharedWithUser.id = :userId)) AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))",
            countQuery = "SELECT COUNT(f) FROM FileEntity f WHERE f.deleted = false AND (f.owner.id = :userId OR EXISTS (SELECT s.id FROM Share s WHERE s.file.id = f.id AND s.sharedWithUser.id = :userId)) AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<FileEntity> searchAccessibleByName(@Param("userId") Long userId, @Param("query") String query, Pageable pageable);

    @Query(value = "SELECT f FROM FileEntity f WHERE f.owner.id = :ownerId AND f.deleted = true AND (f.folder IS NULL OR f.folder.deleted = false)",
            countQuery = "SELECT COUNT(f) FROM FileEntity f WHERE f.owner.id = :ownerId AND f.deleted = true AND (f.folder IS NULL OR f.folder.deleted = false)")
    Page<FileEntity> findVisibleTrashFiles(@Param("ownerId") Long ownerId, Pageable pageable);

    long countByOwnerIdAndDeletedFalse(Long ownerId);

    List<FileEntity> findByDeletedTrueAndDeletedAtBefore(Instant threshold);
}
