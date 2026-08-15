package com.cloudstorage.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FileUpdateRequest {
    @Size(max = 255)
    @Pattern(regexp = "^[^\\\\/:*?\"<>|]+$", message = "Invalid characters in file name")
    private String name;

    private Long folderId;
    
    private Boolean moveToRoot;
}
