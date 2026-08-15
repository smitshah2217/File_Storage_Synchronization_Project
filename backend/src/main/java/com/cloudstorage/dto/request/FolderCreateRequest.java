package com.cloudstorage.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FolderCreateRequest {
    @NotBlank
    @Size(max = 255)
    @Pattern(regexp = "^[^\\\\/:*?\"<>|]+$", message = "Invalid characters in folder name")
    private String name;

    private Long parentFolderId;
}
