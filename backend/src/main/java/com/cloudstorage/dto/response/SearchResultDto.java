package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SearchResultDto {
    private PageResponse<FolderDto> folders;
    private PageResponse<FileDto> files;
}
