package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TrashContentsDto {
    private PageResponse<FolderDto> folders;
    private PageResponse<FileDto> files;
}
