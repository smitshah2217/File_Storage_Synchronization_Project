package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FolderContentDto {
    private FolderDto folder;
    private PageResponse<FolderDto> subfolders;
    private PageResponse<FileDto> files;
}
