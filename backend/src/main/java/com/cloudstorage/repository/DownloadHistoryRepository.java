package com.cloudstorage.repository;

import com.cloudstorage.entity.DownloadHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DownloadHistoryRepository extends JpaRepository<DownloadHistory, Long> {
    List<DownloadHistory> findByUserIdOrderByDownloadedAtDesc(Long userId);
}
