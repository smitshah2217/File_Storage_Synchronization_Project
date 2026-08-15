package com.cloudstorage.repository;

import com.cloudstorage.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByOwnerIdAndDeletedFalse(Long ownerId);
    List<Folder> findByOwnerIdAndParentFolderIdAndDeletedFalse(Long ownerId, Long parentFolderId);
    List<Folder> findByOwnerIdAndParentFolderIsNullAndDeletedFalse(Long ownerId);
    List<Folder> findByOwnerIdAndParentFolderId(Long ownerId, Long parentFolderId);
    List<Folder> findByOwnerIdAndDeletedTrue(Long ownerId);
    boolean existsByOwnerIdAndParentFolderIdAndNameIgnoreCaseAndDeletedFalse(Long ownerId, Long parentFolderId, String name);
    boolean existsByOwnerIdAndParentFolderIsNullAndNameIgnoreCaseAndDeletedFalse(Long ownerId, String name);

    @Query("SELECT f FROM Folder f WHERE f.owner.id = :ownerId AND f.deleted = false AND LOWER(f.name) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Folder> searchByName(@Param("ownerId") Long ownerId, @Param("query") String query);

    long countByOwnerIdAndDeletedFalse(Long ownerId);

    List<Folder> findByDeletedTrueAndDeletedAtBefore(java.time.Instant threshold);
}
