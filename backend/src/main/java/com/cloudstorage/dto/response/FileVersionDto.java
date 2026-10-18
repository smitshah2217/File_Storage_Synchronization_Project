package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class FileVersionDto {
    private Long id;
    private Long fileId;
    private Integer versionNumber;
    private Long sizeBytes;
    private String mimeType;
    private Long uploadedById;
    private String uploadedByUsername;
    private Instant uploadedAt;
}
