package com.cloudstorage.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class ApiErrorResponse {
    private Instant timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private List<FieldErrorDto> fieldErrors;

    @Data
    @Builder
    public static class FieldErrorDto {
        private String field;
        private String message;
    }
}
