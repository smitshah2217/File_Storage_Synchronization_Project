package com.cloudstorage.dto.response;

import com.cloudstorage.exception.BadRequestException;
import lombok.Builder;
import lombok.Data;
import org.springframework.data.domain.Page;

import java.util.List;

/** A bounded, zero-based page response used by collection endpoints. */
@Data
@Builder
public class PageResponse<T> {
    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 100;

    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public static void validate(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be zero or greater");
        }
        if (size < 1 || size > MAX_SIZE) {
            throw new BadRequestException("size must be between 1 and " + MAX_SIZE);
        }
    }

    public static <T> PageResponse<T> from(Page<T> source) {
        return PageResponse.<T>builder()
                .content(List.copyOf(source.getContent()))
                .page(source.getNumber())
                .size(source.getSize())
                .totalElements(source.getTotalElements())
                .totalPages(source.getTotalPages())
                .build();
    }

    public static <T> PageResponse<T> from(List<T> allItems, int page, int size) {
        validate(page, size);
        long startLong = (long) page * size;
        int start = (int) Math.min(startLong, allItems.size());
        int end = Math.min(start + size, allItems.size());
        int totalPages = allItems.isEmpty() ? 0 : (int) Math.ceil((double) allItems.size() / size);
        return PageResponse.<T>builder()
                .content(List.copyOf(allItems.subList(start, end)))
                .page(page)
                .size(size)
                .totalElements(allItems.size())
                .totalPages(totalPages)
                .build();
    }
}
