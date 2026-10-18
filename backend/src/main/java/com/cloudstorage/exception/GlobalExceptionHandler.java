package com.cloudstorage.exception;

import com.cloudstorage.dto.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.beans.TypeMismatchException;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler({DuplicateResourceException.class, ConflictException.class, DataIntegrityViolationException.class,
            org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<ApiErrorResponse> handleConflict(Exception ex, HttpServletRequest request) {
        String message = ex instanceof org.springframework.orm.ObjectOptimisticLockingFailureException
                ? "Resource was updated by another user. Please refresh and try again."
                : ex instanceof DataIntegrityViolationException
                    ? "The request conflicts with an existing resource"
                    : ex.getMessage();
        return build(HttpStatus.CONFLICT, "CONFLICT", message, request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    @ExceptionHandler(ForbiddenOperationException.class)
    public ResponseEntity<ApiErrorResponse> handleForbidden(ForbiddenOperationException ex, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Invalid credentials", request);
    }

    @ExceptionHandler(StorageLimitExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleStorageLimit(StorageLimitExceededException ex, HttpServletRequest request) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "PAYLOAD_TOO_LARGE", ex.getMessage(), request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSize(HttpServletRequest request) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "PAYLOAD_TOO_LARGE", "Uploaded file exceeds the configured size limit", request);
    }

    @ExceptionHandler(UnsupportedMediaTypeException.class)
    public ResponseEntity<ApiErrorResponse> handleUnsupportedMediaType(UnsupportedMediaTypeException ex, HttpServletRequest request) {
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", ex.getMessage(), request);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(BadRequestException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiErrorResponse.FieldErrorDto> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> ApiErrorResponse.FieldErrorDto.builder()
                        .field(error.getField())
                        .message(error.getDefaultMessage())
                        .build())
                .toList();
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Request validation failed", request, errors);
    }

    @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class, TypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> handleMalformedRequest(Exception ex, HttpServletRequest request) {
        String message = ex instanceof ConstraintViolationException
                ? "Request validation failed"
                : "Request contains a missing or invalid value";
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error processing {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "An unexpected error occurred", request);
    }

    public static ApiErrorResponse error(HttpStatus status, String error, String message, String path) {
        return ApiErrorResponse.builder()
                .timestamp(Instant.now())
                .status(status.value())
                .error(error)
                .message(message)
                .path(path)
                .build();
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String error, String message, HttpServletRequest request) {
        return build(status, error, message, request, null);
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String error, String message,
                                                   HttpServletRequest request,
                                                   List<ApiErrorResponse.FieldErrorDto> errors) {
        ApiErrorResponse body = ApiErrorResponse.builder()
                .timestamp(Instant.now())
                .status(status.value())
                .error(error)
                .message(message == null ? status.getReasonPhrase() : message)
                .path(request.getRequestURI())
                .fieldErrors(errors)
                .build();
        return ResponseEntity.status(status).body(body);
    }
}
