package com.cloudstorage.util;

import com.cloudstorage.entity.Folder;
import com.cloudstorage.exception.BadRequestException;
import java.util.Objects;

public class FolderCycleValidator {
    public static void validateNoCycle(Folder source, Folder targetParent) {
        if (targetParent == null) return;
        
        Folder current = targetParent;
        while (current != null) {
            if (Objects.equals(current.getId(), source.getId())) {
                throw new BadRequestException("Cannot move a folder into itself or its descendant");
            }
            current = current.getParentFolder();
        }
    }
}
