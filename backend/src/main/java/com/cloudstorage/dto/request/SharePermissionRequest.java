package com.cloudstorage.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SharePermissionRequest {
    @NotBlank
    @Pattern(regexp = "^(VIEW|EDIT)$", message = "Permission must be VIEW or EDIT")
    private String permission;
}
