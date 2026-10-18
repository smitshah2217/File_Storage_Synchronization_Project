package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StorageUsageDto {
    private Long storageUsedBytes;
    private Long storageLimitBytes;
}
