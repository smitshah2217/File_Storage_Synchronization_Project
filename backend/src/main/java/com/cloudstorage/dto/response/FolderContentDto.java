package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class FolderContentDto {
    private FolderDto folder;
    private List<FolderDto> subfolders;
    private List<FileDto> files;
}
