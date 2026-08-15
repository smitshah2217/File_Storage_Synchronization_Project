package com.cloudstorage.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ShareRequest {
    @NotNull
    private Long sharedWithUserId;

    private String permission = "VIEW"; // VIEW or EDIT
}
