package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class FileDto {
    private Long id;
    private String name;
    private Long folderId;
    private Long ownerId;
    private Long sizeBytes;
    private String mimeType;
    private Integer versionNumber;
    private Instant createdAt;
}
