package com.ludo.game.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.dto.LoginRequest;
import com.ludo.game.dto.SignupRequest;
import com.ludo.game.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void signup_Success() throws Exception {
        SignupRequest request = new SignupRequest("test@example.com", "password123", "Tester");

        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.user.email", is("test@example.com")))
                .andExpect(jsonPath("$.user.displayName", is("Tester")))
                .andExpect(cookie().exists("refreshToken"));
    }

    @Test
    void signup_FailDuplicateEmail() throws Exception {
        SignupRequest first = new SignupRequest("duplicate@example.com", "password123", "Tester1");
        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(first)))
                .andExpect(status().isOk());

        SignupRequest second = new SignupRequest("duplicate@example.com", "otherpassword", "Tester2");
        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(second)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Email address already in use.")));
    }

    @Test
    void login_Success() throws Exception {
        SignupRequest signup = new SignupRequest("login@example.com", "password123", "LoginTester");
        mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isOk());

        LoginRequest login = new LoginRequest("login@example.com", "password123");
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.user.displayName", is("LoginTester")))
                .andExpect(cookie().exists("refreshToken"));
    }

    @Test
    void login_FailInvalidCredentials() throws Exception {
        LoginRequest login = new LoginRequest("nonexistent@example.com", "wrongpassword");
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refresh_Success() throws Exception {
        SignupRequest signup = new SignupRequest("refresh@example.com", "password123", "RefreshTester");
        MvcResult signupResult = mockMvc.perform(post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signup)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = signupResult.getResponse().getCookie("refreshToken");

        mockMvc.perform(post("/api/v1/auth/refresh")
                .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.user.email", is("refresh@example.com")));
    }

    @Test
    void refresh_FailInvalidCookie() throws Exception {
        Cookie invalidCookie = new Cookie("refreshToken", "invalidtokenhere");
        mockMvc.perform(post("/api/v1/auth/refresh")
                .cookie(invalidCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_Success() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("refreshToken", 0));
    }

    @Test
    void secureEndpoint_RejectsUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/matches"))
                .andExpect(status().isForbidden());
    }
}
