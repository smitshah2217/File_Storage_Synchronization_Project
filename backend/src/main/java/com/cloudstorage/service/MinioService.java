package com.cloudstorage.service;

import io.minio.BucketExistsArgs;
import io.minio.CopyObjectArgs;
import io.minio.CopySource;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.InputStream;
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioService {
    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @PostConstruct
    public void init() {
        RuntimeException lastFailure = null;
        for (int attempt = 1; attempt <= 30; attempt++) {
            try {
                boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
                if (!exists) {
                    minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                }
                log.info("MinIO bucket '{}' is ready", bucketName);
                return;
            } catch (Exception exception) {
                lastFailure = new RuntimeException("Could not initialize MinIO bucket", exception);
                if (attempt < 30) {
                    try {
                        Thread.sleep(2_000L);
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException("Interrupted while waiting for MinIO", interrupted);
                    }
                }
            }
        }
        throw lastFailure == null ? new IllegalStateException("Could not initialize MinIO bucket") : lastFailure;
    }

    public void uploadFile(String objectKey, InputStream stream, long size, String contentType) {
        try {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .stream(stream, size, -1)
                    .contentType(contentType)
                    .build());
        } catch (Exception exception) {
            throw new IllegalStateException("Error uploading file to MinIO", exception);
        }
    }

    public InputStream downloadFile(String objectKey) {
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
        } catch (Exception exception) {
            throw new IllegalStateException("Error downloading file from MinIO", exception);
        }
    }

    public void copyFile(String sourceObjectKey, String destinationObjectKey) {
        try {
            minioClient.copyObject(CopyObjectArgs.builder()
                    .bucket(bucketName)
                    .object(destinationObjectKey)
                    .source(CopySource.builder().bucket(bucketName).object(sourceObjectKey).build())
                    .build());
        } catch (Exception exception) {
            throw new IllegalStateException("Error copying file in MinIO", exception);
        }
    }

    public void deleteFile(String objectKey) {
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build());
        } catch (Exception exception) {
            throw new IllegalStateException("Error deleting file from MinIO", exception);
        }
    }

    /** Register an uploaded object for compensation if its metadata transaction rolls back. */
    public void deleteFileOnRollback(String objectKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    deleteQuietly(objectKey);
                }
            }
        });
    }

    /** Delete remote bytes only after metadata has committed, avoiding DB rows pointing at missing objects. */
    public void deleteFilesAfterCommit(Collection<String> objectKeys) {
        List<String> keys = List.copyOf(objectKeys);
        if (keys.isEmpty()) {
            return;
        }
        Runnable deleteObjects = () -> keys.forEach(this::deleteQuietly);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteObjects.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteObjects.run();
            }
        });
    }

    private void deleteQuietly(String objectKey) {
        try {
            deleteFile(objectKey);
        } catch (RuntimeException exception) {
            log.error("Unable to remove orphaned MinIO object '{}'", objectKey, exception);
        }
    }
}
