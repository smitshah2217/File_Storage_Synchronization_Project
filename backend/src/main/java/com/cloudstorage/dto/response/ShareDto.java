package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data
@Builder
public class ShareDto {
    private Long id;
    private Long fileId;
    private String fileName;
    private Long ownerId;
    private String ownerUsername;
    private Long sharedWithUserId;
    private String sharedWithUsername;
    private String permission;
    private Instant createdAt;
}
