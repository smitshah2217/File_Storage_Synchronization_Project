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
class FileControllerTest extends BaseIntegrationTest {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndLogin("fileuser", "file@example.com", "Password1");
    }

    // ========== Upload ==========

    @Test
    @DisplayName("POST /api/files/upload - Fail: requires authentication")
    void uploadFile_Unauthorized() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "hello".getBytes());
        mockMvc.perform(multipart("/api/files/upload").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/files/upload - Success: uploads file to root")
    void uploadFile_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "document.txt", "text/plain", "Hello World!".getBytes());
        mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("document.txt"))
                .andExpect(jsonPath("$.mimeType").value("text/plain"))
                .andExpect(jsonPath("$.sizeBytes").value(12));
    }

    @Test
    @DisplayName("POST /api/files/upload - Success: uploads file into folder")
    void uploadFile_IntoFolder() throws Exception {
        // Create a folder first
        String folderResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Uploads\"}"))
                .andReturn().getResponse().getContentAsString();

        Long folderId = objectMapper.readTree(folderResponse).get("id").asLong();

        // Upload into folder
        MockMultipartFile file = new MockMultipartFile("file", "report.pdf", "application/pdf", "pdf-data".getBytes());
        mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .param("folderId", folderId.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.folderId").value(folderId));
    }

    // ========== Get File Metadata ==========

    @Test
    @DisplayName("GET /api/files/{id} - Success: returns file metadata")
    void getFile_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "meta.txt", "text/plain", "content".getBytes());
        String uploadResponse = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        Long fileId = objectMapper.readTree(uploadResponse).get("id").asLong();

        mockMvc.perform(get("/api/files/" + fileId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("meta.txt"))
                .andExpect(jsonPath("$.mimeType").value("text/plain"));
    }

    // ========== Rename File ==========

    @Test
    @DisplayName("PUT /api/files/{id} - Success: renames file")
    void renameFile_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "old.txt", "text/plain", "data".getBytes());
        String uploadResponse = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        Long fileId = objectMapper.readTree(uploadResponse).get("id").asLong();

        mockMvc.perform(put("/api/files/" + fileId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"renamed.txt\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("renamed.txt"));
    }

    // ========== Soft Delete & Restore ==========

    @Test
    @DisplayName("DELETE /api/files/{id} - Success: soft deletes file")
    void deleteFile_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "deleteme.txt", "text/plain", "data".getBytes());
        String uploadResponse = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        Long fileId = objectMapper.readTree(uploadResponse).get("id").asLong();

        mockMvc.perform(delete("/api/files/" + fileId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify it's gone from root listing
        mockMvc.perform(get("/api/folders/root")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.files", hasSize(0)));
    }

    @Test
    @DisplayName("POST /api/files/{id}/restore - Success: restores a soft-deleted file")
    void restoreFile_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "restoreme.txt", "text/plain", "data".getBytes());
        String uploadResponse = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        Long fileId = objectMapper.readTree(uploadResponse).get("id").asLong();

        // Delete
        mockMvc.perform(delete("/api/files/" + fileId)
                .header("Authorization", "Bearer " + token));

        // Restore
        mockMvc.perform(post("/api/files/" + fileId + "/restore")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Verify it reappears in root listing
        mockMvc.perform(get("/api/folders/root")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.files", hasSize(1)))
                .andExpect(jsonPath("$.files[0].name").value("restoreme.txt"));
    }

    // ========== Version History ==========

    @Test
    @DisplayName("GET /api/files/{id}/versions - Success: returns version list")
    void getVersions_Success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "versioned.txt", "text/plain", "v1".getBytes());
        String uploadResponse = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        Long fileId = objectMapper.readTree(uploadResponse).get("id").asLong();

        mockMvc.perform(get("/api/files/" + fileId + "/versions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].versionNumber").value(1));
    }
}
