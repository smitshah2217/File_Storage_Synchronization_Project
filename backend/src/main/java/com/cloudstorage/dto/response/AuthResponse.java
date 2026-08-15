package com.cloudstorage.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {
    private String token;
    private Long expiresIn;
    private UserDto user; // Will be omitted if null (e.g., refresh token response)
}
