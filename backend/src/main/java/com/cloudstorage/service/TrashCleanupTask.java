package com.cloudstorage.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class TrashCleanupTask {

    private final TrashService trashService;

    // Run every day at 2:00 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanupOldTrash() {
        log.info("Starting background trash cleanup task...");
        // 30 days retention policy
        Instant threshold = Instant.now().minus(30, ChronoUnit.DAYS);
        
        try {
            trashService.permanentlyDeleteOlderThan(threshold);
            log.info("Finished background trash cleanup task successfully.");
        } catch (Exception e) {
            log.error("Error occurred during background trash cleanup: {}", e.getMessage(), e);
        }
    }
}
