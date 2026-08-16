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
class ShareControllerTest extends BaseIntegrationTest {

    private String tokenOwner;
    private String tokenReceiver;
    private Long fileId;

    @BeforeEach
    void setUp() throws Exception {
        tokenOwner = registerAndLogin("shareowner", "owner@example.com", "Password1");
        tokenReceiver = registerAndLogin("sharereceiver", "receiver@example.com", "Password1");

        MockMultipartFile file = new MockMultipartFile("file", "shareable.txt", "text/plain", "data".getBytes());
        String uploadResponse = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + tokenOwner))
                .andReturn().getResponse().getContentAsString();

        fileId = objectMapper.readTree(uploadResponse).get("id").asLong();
    }

    @Test
    @DisplayName("POST /api/files/{fileId}/shares - Success: Create restricted share")
    void shareFile_Restricted_Success() throws Exception {
        String body = "{\"type\":\"RESTRICTED\",\"sharedWithUsername\":\"sharereceiver\",\"permission\":\"VIEW\"}";
        mockMvc.perform(post("/api/files/" + fileId + "/shares")
                        .header("Authorization", "Bearer " + tokenOwner)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("RESTRICTED"))
                .andExpect(jsonPath("$.sharedWith.username").value("sharereceiver"))
                .andExpect(jsonPath("$.permission").value("VIEW"));
    }

    @Test
    @DisplayName("POST /api/files/{fileId}/shares - Success: Create public share")
    void shareFile_Public_Success() throws Exception {
        String body = "{\"type\":\"PUBLIC\",\"permission\":\"VIEW\"}";
        mockMvc.perform(post("/api/files/" + fileId + "/shares")
                        .header("Authorization", "Bearer " + tokenOwner)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("PUBLIC"))
                .andExpect(jsonPath("$.shareLink").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/shared-with-me - Success: See restricted shared file")
    void getSharedWithMe_Success() throws Exception {
        // Create share
        String body = "{\"type\":\"RESTRICTED\",\"sharedWithUsername\":\"sharereceiver\",\"permission\":\"VIEW\"}";
        mockMvc.perform(post("/api/files/" + fileId + "/shares")
                        .header("Authorization", "Bearer " + tokenOwner)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated());

        // Receiver requests shared files
        mockMvc.perform(get("/api/shared-with-me")
                        .header("Authorization", "Bearer " + tokenReceiver))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].file.name").value("shareable.txt"));
    }

    @Test
    @DisplayName("DELETE /api/files/{fileId}/shares/{shareId} - Success: Revoke share")
    void revokeShare_Success() throws Exception {
        // Create share
        String body = "{\"type\":\"PUBLIC\",\"permission\":\"VIEW\"}";
        String shareResponse = mockMvc.perform(post("/api/files/" + fileId + "/shares")
                        .header("Authorization", "Bearer " + tokenOwner)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long shareId = objectMapper.readTree(shareResponse).get("id").asLong();

        // Revoke share
        mockMvc.perform(delete("/api/files/" + fileId + "/shares/" + shareId)
                        .header("Authorization", "Bearer " + tokenOwner))
                .andExpect(status().isNoContent());

        // Verify share list is empty
        mockMvc.perform(get("/api/files/" + fileId + "/shares")
                        .header("Authorization", "Bearer " + tokenOwner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
