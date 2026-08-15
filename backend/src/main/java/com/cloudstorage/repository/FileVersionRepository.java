package com.cloudstorage.repository;

import com.cloudstorage.entity.FileVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FileVersionRepository extends JpaRepository<FileVersion, Long> {
    List<FileVersion> findByFileIdOrderByVersionNumberDesc(Long fileId);
}
