package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class DownloadHistoryDto {
    private Long id;
    private Long fileId;
    private String fileNameSnapshot;
    private Instant downloadedAt;
}
