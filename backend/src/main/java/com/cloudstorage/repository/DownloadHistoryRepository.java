package com.cloudstorage.repository;

import com.cloudstorage.entity.DownloadHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DownloadHistoryRepository extends JpaRepository<DownloadHistory, Long> {
    Page<DownloadHistory> findByUserIdOrderByDownloadedAtDesc(Long userId, Pageable pageable);
    void deleteByUserId(Long userId);

    @Modifying
    @Transactional
    @Query("UPDATE DownloadHistory h SET h.file = null WHERE h.file.id = :fileId")
    int detachFile(@Param("fileId") Long fileId);
}
