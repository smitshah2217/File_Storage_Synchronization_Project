package com.cloudstorage.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class SearchDashboardControllerTest extends BaseIntegrationTest {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndLogin("searchuser", "search@example.com", "Password1");
    }

    // ========== Search ==========

    @Test
    @DisplayName("GET /api/search - Success: returns matching files and folders")
    void search_Success() throws Exception {
        // Create a folder named "Projects"
        mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Projects\"}"))
                .andExpect(status().isCreated());

        // Upload a file named "project_report.pdf"
        MockMultipartFile file = new MockMultipartFile("file", "project_report.pdf", "application/pdf", "data".getBytes());
        mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());

        // Search for "project"
        mockMvc.perform(get("/api/search")
                        .param("q", "project")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.folders", hasSize(1)))
                .andExpect(jsonPath("$.folders[0].name").value("Projects"))
                .andExpect(jsonPath("$.files", hasSize(1)))
                .andExpect(jsonPath("$.files[0].name").value("project_report.pdf"));
    }

    @Test
    @DisplayName("GET /api/search - Success: empty results for no match")
    void search_EmptyResults() throws Exception {
        mockMvc.perform(get("/api/search")
                        .param("q", "nothing")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.folders", hasSize(0)))
                .andExpect(jsonPath("$.files", hasSize(0)));
    }

    // ========== Dashboard ==========

    @Test
    @DisplayName("GET /api/storage/dashboard - Success: returns storage stats")
    void getStorageDashboard_Success() throws Exception {
        // Create a folder
        mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Data\"}"))
                .andExpect(status().isCreated());

        // Upload a file (5 bytes)
        MockMultipartFile file = new MockMultipartFile("file", "data.txt", "text/plain", "12345".getBytes());
        mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/storage/dashboard")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFiles").value(1))
                .andExpect(jsonPath("$.totalFolders").value(1))
                .andExpect(jsonPath("$.storageUsedBytes").value(5))
                .andExpect(jsonPath("$.storageLimitBytes").value(5368709120L)); // 5GB default
    }
}
