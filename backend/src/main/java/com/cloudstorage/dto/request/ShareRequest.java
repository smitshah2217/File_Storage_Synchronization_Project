package com.cloudstorage.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ShareRequest {
    @NotBlank
    @Pattern(regexp = "^[a-zA-Z0-9_]{3,30}$", message = "Must be a valid username")
    private String sharedWithUsername;

    @Pattern(regexp = "^(VIEW|EDIT)$", message = "Permission must be VIEW or EDIT")
    private String permission = "VIEW";
}
