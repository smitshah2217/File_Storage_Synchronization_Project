package com.cloudstorage.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        fileId = objectMapper.readTree(uploadResponse).get("id").asLong();
    }

    @Test
    @DisplayName("POST /api/files/{fileId}/share - creates a user-to-user VIEW share")
    void shareFile_Success() throws Exception {
        mockMvc.perform(post("/api/files/" + fileId + "/share")
                        .header("Authorization", "Bearer " + tokenOwner)
                        .contentType("application/json")
                        .content("{\"sharedWithUsername\":\"sharereceiver\",\"permission\":\"VIEW\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileId").value(fileId))
                .andExpect(jsonPath("$.fileName").value("shareable.txt"))
                .andExpect(jsonPath("$.sharedWithUsername").value("sharereceiver"))
                .andExpect(jsonPath("$.permission").value("VIEW"));
    }

    @Test
    @DisplayName("POST /api/files/{fileId}/share - rejects public links")
    void shareFile_PublicLinksNotSupported() throws Exception {
        mockMvc.perform(post("/api/files/" + fileId + "/share")
                        .header("Authorization", "Bearer " + tokenOwner)
                        .contentType("application/json")
                        .content("{\"type\":\"PUBLIC\",\"permission\":\"VIEW\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/shared/files - recipient sees the shared file")
    void getSharedWithMe_Success() throws Exception {
        mockMvc.perform(post("/api/files/" + fileId + "/share")
                .header("Authorization", "Bearer " + tokenOwner)
                .contentType("application/json")
                .content("{\"sharedWithUsername\":\"sharereceiver\",\"permission\":\"VIEW\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/shared/files")
                        .header("Authorization", "Bearer " + tokenReceiver))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].fileName").value("shareable.txt"))
                .andExpect(jsonPath("$.content[0].ownerUsername").value("shareowner"));

        mockMvc.perform(get("/api/files/" + fileId)
                        .header("Authorization", "Bearer " + tokenReceiver))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("shareable.txt"));
    }

    @Test
    @DisplayName("VIEW share permits reads but denies edits")
    void viewShare_DeniesEdit() throws Exception {
        mockMvc.perform(post("/api/files/" + fileId + "/share")
                .header("Authorization", "Bearer " + tokenOwner)
                .contentType("application/json")
                .content("{\"sharedWithUsername\":\"sharereceiver\",\"permission\":\"VIEW\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/files/" + fileId)
                        .header("Authorization", "Bearer " + tokenReceiver)
                        .contentType("application/json")
                        .content("{\"name\":\"changed.txt\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("EDIT share allows permitted file updates")
    void editShare_AllowsRename() throws Exception {
        mockMvc.perform(post("/api/files/" + fileId + "/share")
                .header("Authorization", "Bearer " + tokenOwner)
                .contentType("application/json")
                .content("{\"sharedWithUsername\":\"sharereceiver\",\"permission\":\"EDIT\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/files/" + fileId)
                        .header("Authorization", "Bearer " + tokenReceiver)
                        .contentType("application/json")
                        .content("{\"name\":\"changed.txt\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("changed.txt"));
    }

    @Test
    @DisplayName("DELETE /api/files/{fileId}/share/{shareId} - revokes the share")
    void revokeShare_Success() throws Exception {
        String shareResponse = mockMvc.perform(post("/api/files/" + fileId + "/share")
                        .header("Authorization", "Bearer " + tokenOwner)
                        .contentType("application/json")
                        .content("{\"sharedWithUsername\":\"sharereceiver\",\"permission\":\"VIEW\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long shareId = objectMapper.readTree(shareResponse).get("id").asLong();

        mockMvc.perform(delete("/api/files/" + fileId + "/share/" + shareId)
                        .header("Authorization", "Bearer " + tokenOwner))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/files/" + fileId + "/share")
                        .header("Authorization", "Bearer " + tokenOwner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));
        mockMvc.perform(get("/api/files/" + fileId)
                        .header("Authorization", "Bearer " + tokenReceiver))
                .andExpect(status().isNotFound());
    }
}
