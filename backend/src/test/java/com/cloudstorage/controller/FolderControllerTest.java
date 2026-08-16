package com.cloudstorage.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.annotation.DirtiesContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class FolderControllerTest extends BaseIntegrationTest {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndLogin("folderuser", "folder@example.com", "Password1");
    }

    // ========== Create Folder ==========

    @Test
    @DisplayName("POST /api/folders - Success: create root-level folder")
    void createFolder_Success() throws Exception {
        String body = "{\"name\":\"Documents\"}";
        mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Documents"))
                .andExpect(jsonPath("$.parentFolderId").isEmpty());
    }

    @Test
    @DisplayName("POST /api/folders - Success: create nested subfolder")
    void createSubfolder_Success() throws Exception {
        // Create parent
        String parentBody = "{\"name\":\"Parent\"}";
        String parentResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(parentBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long parentId = objectMapper.readTree(parentResponse).get("id").asLong();

        // Create child
        String childBody = String.format("{\"name\":\"Child\",\"parentFolderId\":%d}", parentId);
        mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(childBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Child"))
                .andExpect(jsonPath("$.parentFolderId").value(parentId));
    }

    @Test
    @DisplayName("POST /api/folders - Fail: requires authentication")
    void createFolder_Unauthorized() throws Exception {
        String body = "{\"name\":\"NoAuth\"}";
        mockMvc.perform(post("/api/folders")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/folders - Fail: invalid name returns 400")
    void createFolder_InvalidName() throws Exception {
        String body = "{\"name\":\"\"}";
        mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ========== Get Root Contents ==========

    @Test
    @DisplayName("GET /api/folders/root - Success: returns root-level contents")
    void getRootContents_Success() throws Exception {
        // Create two folders at root
        mockMvc.perform(post("/api/folders")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"Folder1\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/folders")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"name\":\"Folder2\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/folders/root")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subfolders", hasSize(2)))
                .andExpect(jsonPath("$.subfolders[*].name", containsInAnyOrder("Folder1", "Folder2")));
    }

    @Test
    @DisplayName("GET /api/folders/root - Success: empty when no folders created")
    void getRootContents_Empty() throws Exception {
        mockMvc.perform(get("/api/folders/root")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subfolders", hasSize(0)))
                .andExpect(jsonPath("$.files", hasSize(0)));
    }

    // ========== Get Folder Contents ==========

    @Test
    @DisplayName("GET /api/folders/{id} - Success: returns subfolder contents")
    void getFolderContents_Success() throws Exception {
        // Create parent
        String parentResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Parent\"}"))
                .andReturn().getResponse().getContentAsString();

        Long parentId = objectMapper.readTree(parentResponse).get("id").asLong();

        // Create child inside parent
        mockMvc.perform(post("/api/folders")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(String.format("{\"name\":\"NestedChild\",\"parentFolderId\":%d}", parentId)));

        mockMvc.perform(get("/api/folders/" + parentId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.folder.name").value("Parent"))
                .andExpect(jsonPath("$.subfolders", hasSize(1)))
                .andExpect(jsonPath("$.subfolders[0].name").value("NestedChild"));
    }

    // ========== Breadcrumb ==========

    @Test
    @DisplayName("GET /api/folders/{id}/breadcrumb - Success: returns ancestry path")
    void getBreadcrumb_Success() throws Exception {
        // Create grandparent -> parent -> child
        String gpResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Grandparent\"}"))
                .andReturn().getResponse().getContentAsString();
        Long gpId = objectMapper.readTree(gpResponse).get("id").asLong();

        String pResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(String.format("{\"name\":\"Parent\",\"parentFolderId\":%d}", gpId)))
                .andReturn().getResponse().getContentAsString();
        Long pId = objectMapper.readTree(pResponse).get("id").asLong();

        String cResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(String.format("{\"name\":\"Child\",\"parentFolderId\":%d}", pId)))
                .andReturn().getResponse().getContentAsString();
        Long cId = objectMapper.readTree(cResponse).get("id").asLong();

        mockMvc.perform(get("/api/folders/" + cId + "/breadcrumb")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].name").value("Grandparent"))
                .andExpect(jsonPath("$[1].name").value("Parent"))
                .andExpect(jsonPath("$[2].name").value("Child"));
    }

    // ========== Update (Rename) Folder ==========

    @Test
    @DisplayName("PUT /api/folders/{id} - Success: rename folder")
    void renameFolder_Success() throws Exception {
        String createResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"OldName\"}"))
                .andReturn().getResponse().getContentAsString();

        Long folderId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(put("/api/folders/" + folderId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"NewName\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("NewName"));
    }

    // ========== Soft Delete & Restore ==========

    @Test
    @DisplayName("DELETE /api/folders/{id} - Success: soft deletes folder")
    void deleteFolder_Success() throws Exception {
        String createResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"ToDelete\"}"))
                .andReturn().getResponse().getContentAsString();

        Long folderId = objectMapper.readTree(createResponse).get("id").asLong();

        // Delete it
        mockMvc.perform(delete("/api/folders/" + folderId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // Verify it's gone from root listing
        mockMvc.perform(get("/api/folders/root")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subfolders", hasSize(0)));
    }

    @Test
    @DisplayName("POST /api/folders/{id}/restore - Success: restores soft-deleted folder")
    void restoreFolder_Success() throws Exception {
        String createResponse = mockMvc.perform(post("/api/folders")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"ToRestore\"}"))
                .andReturn().getResponse().getContentAsString();

        Long folderId = objectMapper.readTree(createResponse).get("id").asLong();

        // Soft delete
        mockMvc.perform(delete("/api/folders/" + folderId)
                .header("Authorization", "Bearer " + token));

        // Restore
        mockMvc.perform(post("/api/folders/" + folderId + "/restore")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // Verify it reappears
        mockMvc.perform(get("/api/folders/root")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subfolders", hasSize(1)))
                .andExpect(jsonPath("$.subfolders[0].name").value("ToRestore"));
    }
}
