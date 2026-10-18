package com.cloudstorage.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.annotation.DirtiesContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class UserControllerTest extends BaseIntegrationTest {
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = registerAndLogin("profileuser", "profile@example.com", "Password1");
    }

    @Test
    @DisplayName("GET /api/users/me - returns the authenticated profile")
    void getProfile() throws Exception {
        mockMvc.perform(get("/api/users/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("profileuser"))
                .andExpect(jsonPath("$.email").value("profile@example.com"));
    }

    @Test
    @DisplayName("PUT /api/users/me - updates username and email")
    void updateProfile() throws Exception {
        mockMvc.perform(put("/api/users/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"username\":\"newprofile\",\"email\":\"newprofile@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("newprofile"))
                .andExpect(jsonPath("$.email").value("newprofile@example.com"));
    }

    @Test
    @DisplayName("PUT /api/users/me/password - changes password only with the correct current password")
    void changePassword() throws Exception {
        mockMvc.perform(put("/api/users/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"currentPassword\":\"Password1\",\"newPassword\":\"NewPassword2\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"usernameOrEmail\":\"profileuser\",\"password\":\"NewPassword2\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/users/me/storage - returns storage quota")
    void getStorageUsage() throws Exception {
        mockMvc.perform(get("/api/users/me/storage").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storageUsedBytes").value(0))
                .andExpect(jsonPath("$.storageLimitBytes").value(5368709120L));
    }

    @Test
    @DisplayName("GET /api/users/me - requires authentication")
    void profileRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
    }
}
