package com.cloudstorage.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfileUpdateRequest {
    @Size(min = 3, max = 30)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Must be alphanumeric + underscore")
    private String username;

    @Email
    @Size(max = 255)
    private String email;
}
