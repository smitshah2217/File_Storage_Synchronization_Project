package com.cloudstorage.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.annotation.DirtiesContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class AuthControllerTest extends BaseIntegrationTest {

    // ========== Registration Tests ==========

    @Test
    @DisplayName("POST /api/auth/register - Success: returns 201 with user details")
    void register_Success() throws Exception {
        String body = "{\"username\":\"testuser\",\"email\":\"test@example.com\",\"password\":\"Password1\"}";

        mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    @DisplayName("POST /api/auth/register - Fail: duplicate username returns 409")
    void register_DuplicateUsername() throws Exception {
        String body = "{\"username\":\"dupuser\",\"email\":\"dup1@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(body))
                .andExpect(status().isCreated());

        // Same username, different email
        String body2 = "{\"username\":\"dupuser\",\"email\":\"dup2@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(body2))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/auth/register - Fail: duplicate email returns 409")
    void register_DuplicateEmail() throws Exception {
        String body = "{\"username\":\"emailuser1\",\"email\":\"same@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(body))
                .andExpect(status().isCreated());

        String body2 = "{\"username\":\"emailuser2\",\"email\":\"same@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(body2))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/auth/register - Fail: invalid password (no uppercase) returns 400")
    void register_WeakPassword() throws Exception {
        String body = "{\"username\":\"weakuser\",\"email\":\"weak@example.com\",\"password\":\"password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/register - Fail: username too short returns 400")
    void register_ShortUsername() throws Exception {
        String body = "{\"username\":\"ab\",\"email\":\"short@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/register - Fail: blank fields return 400")
    void register_BlankFields() throws Exception {
        String body = "{\"username\":\"\",\"email\":\"\",\"password\":\"\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(body))
                .andExpect(status().isBadRequest());
    }

    // ========== Login Tests ==========

    @Test
    @DisplayName("POST /api/auth/login - Success: returns JWT token")
    void login_Success() throws Exception {
        // First register
        String regBody = "{\"username\":\"loginuser\",\"email\":\"login@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(regBody))
                .andExpect(status().isCreated());

        // Then login
        String loginBody = "{\"usernameOrEmail\":\"loginuser\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json").content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiresIn").isNumber())
                .andExpect(jsonPath("$.user.username").value("loginuser"));
    }

    @Test
    @DisplayName("POST /api/auth/login - Success: can login with email")
    void login_WithEmail() throws Exception {
        String regBody = "{\"username\":\"emaillogin\",\"email\":\"emaillogin@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(regBody))
                .andExpect(status().isCreated());

        String loginBody = "{\"usernameOrEmail\":\"emaillogin@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json").content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/auth/login - Fail: wrong password returns 401")
    void login_WrongPassword() throws Exception {
        String regBody = "{\"username\":\"wrongpw\",\"email\":\"wrongpw@example.com\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/register")
                .contentType("application/json").content(regBody))
                .andExpect(status().isCreated());

        String loginBody = "{\"usernameOrEmail\":\"wrongpw\",\"password\":\"WrongPassword1\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json").content(loginBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/login - Fail: non-existent user returns 401")
    void login_UserNotFound() throws Exception {
        String loginBody = "{\"usernameOrEmail\":\"ghostuser\",\"password\":\"Password1\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType("application/json").content(loginBody))
                .andExpect(status().isUnauthorized());
    }

    // ========== Token Refresh Tests ==========

    @Test
    @DisplayName("POST /api/auth/refresh - Success: returns new token")
    void refresh_Success() throws Exception {
        String token = registerAndLogin("refreshuser", "refresh@example.com", "Password1");

        mockMvc.perform(post("/api/auth/refresh")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/auth/refresh - Fail: no token returns 401")
    void refresh_NoToken() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }
}
