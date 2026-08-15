package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StorageDashboardDto {
    private Long storageLimitBytes;
    private Long storageUsedBytes;
    private Long storageAvailableBytes;
    private double usagePercentage;
    private long totalFiles;
    private long totalFolders;
}
