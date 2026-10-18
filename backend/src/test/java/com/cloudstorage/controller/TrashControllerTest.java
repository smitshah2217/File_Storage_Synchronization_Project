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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class TrashControllerTest extends BaseIntegrationTest {
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndLogin("trashuser", "trash@example.com", "Password1");
    }

    @Test
    @DisplayName("GET /api/trash - returns soft-deleted files")
    void listsTrashedFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "trashed.txt", "text/plain", "content".getBytes());
        String upload = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long fileId = objectMapper.readTree(upload).get("id").asLong();
        mockMvc.perform(delete("/api/files/" + fileId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/trash").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.files.content", hasSize(1)))
                .andExpect(jsonPath("$.files.content[0].name").value("trashed.txt"));
    }

    @Test
    @DisplayName("DELETE /api/trash - permanently deletes trashed data and frees quota")
    void emptiesTrashAndFreesQuota() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "trashed.txt", "text/plain", "content".getBytes());
        String upload = mockMvc.perform(multipart("/api/files/upload")
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long fileId = objectMapper.readTree(upload).get("id").asLong();
        mockMvc.perform(delete("/api/files/" + fileId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/trash").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/users/me/storage").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storageUsedBytes").value(0));
    }
}
