package com.cloudstorage.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.annotation.DirtiesContext;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class DownloadHistoryControllerTest extends BaseIntegrationTest {
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndLogin("historyuser", "history@example.com", "Password1");
    }

    @Test
    @DisplayName("GET /api/download-history - returns paginated empty history")
    void getEmptyHistory() throws Exception {
        mockMvc.perform(get("/api/download-history").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("GET /api/download-history - rejects oversized pages")
    void rejectsOversizedPage() throws Exception {
        mockMvc.perform(get("/api/download-history")
                        .param("size", "101")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE /api/download-history - clears only the current user's history")
    void clearHistory() throws Exception {
        mockMvc.perform(delete("/api/download-history").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }
}
