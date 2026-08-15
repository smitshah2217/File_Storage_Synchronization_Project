package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class SearchResultDto {
    private List<FolderDto> folders;
    private List<FileDto> files;
}
