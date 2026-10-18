package com.cloudstorage.repository;

import com.cloudstorage.entity.Folder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByOwnerIdAndDeletedFalse(Long ownerId);
    List<Folder> findByOwnerIdAndParentFolderIdAndDeletedFalse(Long ownerId, Long parentFolderId);
    List<Folder> findByOwnerIdAndParentFolderIsNullAndDeletedFalse(Long ownerId);
    Page<Folder> findByOwnerIdAndParentFolderIsNullAndDeletedFalse(Long ownerId, Pageable pageable);
    Page<Folder> findByOwnerIdAndParentFolderIdAndDeletedFalse(Long ownerId, Long parentFolderId, Pageable pageable);
    List<Folder> findByOwnerIdAndParentFolderId(Long ownerId, Long parentFolderId);
    List<Folder> findByOwnerIdAndDeletedTrue(Long ownerId);

    boolean existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalse(Long ownerId, Long parentFolderId, String name);
    boolean existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalse(Long ownerId, String name);
    boolean existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalseAndIdNot(Long ownerId, Long parentFolderId, String name, Long id);
    boolean existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalseAndIdNot(Long ownerId, String name, Long id);

    @Query(value = "SELECT f FROM Folder f WHERE f.owner.id = :ownerId AND f.deleted = false AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))",
            countQuery = "SELECT COUNT(f) FROM Folder f WHERE f.owner.id = :ownerId AND f.deleted = false AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Folder> searchByName(@Param("ownerId") Long ownerId, @Param("query") String query, Pageable pageable);

    @Query(value = "SELECT f FROM Folder f WHERE f.owner.id = :ownerId AND f.deleted = true AND (f.parentFolder IS NULL OR f.parentFolder.deleted = false)",
            countQuery = "SELECT COUNT(f) FROM Folder f WHERE f.owner.id = :ownerId AND f.deleted = true AND (f.parentFolder IS NULL OR f.parentFolder.deleted = false)")
    Page<Folder> findVisibleTrashFolders(@Param("ownerId") Long ownerId, Pageable pageable);

    long countByOwnerIdAndDeletedFalse(Long ownerId);

    List<Folder> findByDeletedTrueAndDeletedAtBefore(Instant threshold);
}
