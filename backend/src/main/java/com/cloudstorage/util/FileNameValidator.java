package com.cloudstorage.util;

import com.cloudstorage.exception.BadRequestException;

public final class FileNameValidator {
    private FileNameValidator() {}

    public static String normalize(String suppliedName) {
        if (suppliedName == null) {
            throw new BadRequestException("File name is required");
        }
        String name = suppliedName.trim();
        if (name.isEmpty()) {
            throw new BadRequestException("File name must not be blank");
        }
        if (name.length() > 255) {
            throw new BadRequestException("File name must be 255 characters or fewer");
        }
        for (int i = 0; i < name.length(); i++) {
            char character = name.charAt(i);
            if (Character.isISOControl(character) || "\\/:*?\"<>|".indexOf(character) >= 0) {
                throw new BadRequestException("File name contains an invalid character");
            }
        }
        return name;
    }
}
