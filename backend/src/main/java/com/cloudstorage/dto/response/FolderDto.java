package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class FolderDto {
    private Long id;
    private String name;
    private Long parentFolderId;
    private Long ownerId;
    private Instant createdAt;
}
