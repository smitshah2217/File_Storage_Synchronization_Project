package com.cloudstorage.util;

import com.cloudstorage.exception.BadRequestException;

public final class ItemNameValidator {
    private ItemNameValidator() {}

    public static String normalize(String suppliedName, String itemType) {
        if (suppliedName == null) {
            throw new BadRequestException(itemType + " name is required");
        }
        String name = suppliedName.trim();
        if (name.isEmpty()) {
            throw new BadRequestException(itemType + " name must not be blank");
        }
        if (name.length() > 255) {
            throw new BadRequestException(itemType + " name must be 255 characters or fewer");
        }
        for (int i = 0; i < name.length(); i++) {
            char character = name.charAt(i);
            if (Character.isISOControl(character) || "\\/:*?\"<>|".indexOf(character) >= 0) {
                throw new BadRequestException(itemType + " name contains an invalid character");
            }
        }
        return name;
    }
}
