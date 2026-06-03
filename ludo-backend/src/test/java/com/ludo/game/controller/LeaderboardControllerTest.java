package com.ludo.game.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.model.entity.User;
import com.ludo.game.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.security.test.context.support.WithMockUser;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser
public class LeaderboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void getLeaderboard_ReturnsPaginatedAndSortedUsers() throws Exception {
        // Seed 3 users with different MMRs
        User user1 = User.builder()
                .id(UUID.randomUUID())
                .email("user1@example.com")
                .passwordHash("hash")
                .displayName("BronzePlayer")
                .ratingMmr(800)
                .build();

        User user2 = User.builder()
                .id(UUID.randomUUID())
                .email("user2@example.com")
                .passwordHash("hash")
                .displayName("GoldPlayer")
                .ratingMmr(1600)
                .build();

        User user3 = User.builder()
                .id(UUID.randomUUID())
                .email("user3@example.com")
                .passwordHash("hash")
                .displayName("SilverPlayer")
                .ratingMmr(1200)
                .build();

        userRepository.save(user1);
        userRepository.save(user2);
        userRepository.save(user3);

        // Fetch leaderboard page 0, size 2 (should get user2 then user3)
        mockMvc.perform(get("/api/leaderboard")
                .param("page", "0")
                .param("size", "2")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].displayName", is("GoldPlayer")))
                .andExpect(jsonPath("$.content[0].ratingMmr", is(1600)))
                .andExpect(jsonPath("$.content[1].displayName", is("SilverPlayer")))
                .andExpect(jsonPath("$.content[1].ratingMmr", is(1200)))
                .andExpect(jsonPath("$.totalElements", is(3)))
                .andExpect(jsonPath("$.totalPages", is(2)));

        // Fetch leaderboard page 1, size 2 (should get user1)
        mockMvc.perform(get("/api/leaderboard")
                .param("page", "1")
                .param("size", "2")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].displayName", is("BronzePlayer")))
                .andExpect(jsonPath("$.content[0].ratingMmr", is(800)));
    }
}
