package com.ludo.game.service;

import com.ludo.game.dto.MatchHistoryDto;
import com.ludo.game.dto.UserStatsDto;
import com.ludo.game.model.entity.Match;
import com.ludo.game.model.entity.MatchPlayer;
import com.ludo.game.model.entity.User;
import com.ludo.game.model.enums.Color;
import com.ludo.game.model.enums.GameStatus;
import com.ludo.game.repository.MatchPlayerRepository;
import com.ludo.game.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private MatchPlayerRepository matchPlayerRepository;

    @InjectMocks
    private ProfileService profileService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getUserStats_CalculatesCorrectStatistics() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("test@example.com")
                .displayName("TestUser")
                .ratingMmr(1550)
                .build();

        Match match1 = Match.builder().id(UUID.randomUUID()).build();
        Match match2 = Match.builder().id(UUID.randomUUID()).build();

        MatchPlayer mp1 = MatchPlayer.builder()
                .id(UUID.randomUUID())
                .match(match1)
                .user(user)
                .playerColor(Color.RED)
                .rankPosition(1) // Win
                .totalKills(5)
                .totalDeaths(2)
                .build();

        MatchPlayer mp2 = MatchPlayer.builder()
                .id(UUID.randomUUID())
                .match(match2)
                .user(user)
                .playerColor(Color.BLUE)
                .rankPosition(3) // Loss
                .totalKills(2)
                .totalDeaths(4)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(matchPlayerRepository.findByUserId(userId)).thenReturn(Arrays.asList(mp1, mp2));

        UserStatsDto stats = profileService.getUserStats(userId);

        assertNotNull(stats);
        assertEquals(1550, stats.getRatingMmr());
        assertEquals("Gold III", stats.getRankTier()); // 1550 is between 1500 and 1600 (Gold III)
        assertEquals(2, stats.getMatchesPlayed());
        assertEquals(1, stats.getMatchesWon());
        assertEquals(50.0, stats.getWinRate(), 0.001);
        assertEquals(7, stats.getTotalKills());
        assertEquals(6, stats.getTotalDeaths());
    }

    @Test
    void getUserMatches_ReturnsFormattedMatchHistory() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("test@example.com")
                .displayName("TestUser")
                .ratingMmr(1550)
                .build();

        UUID matchId = UUID.randomUUID();
        Match match = Match.builder()
                .id(matchId)
                .roomCode("ABCD12")
                .status(GameStatus.COMPLETED)
                .startTime(OffsetDateTime.now().minusMinutes(30))
                .endTime(OffsetDateTime.now())
                .winner(user)
                .build();

        MatchPlayer userPlay = MatchPlayer.builder()
                .id(UUID.randomUUID())
                .match(match)
                .user(user)
                .playerColor(Color.RED)
                .rankPosition(1)
                .totalKills(3)
                .totalDeaths(1)
                .build();

        MatchPlayer opponentPlay = MatchPlayer.builder()
                .id(UUID.randomUUID())
                .match(match)
                .user(User.builder().displayName("Opponent").build())
                .playerColor(Color.GREEN)
                .rankPosition(2)
                .totalKills(1)
                .totalDeaths(3)
                .build();

        when(matchPlayerRepository.findByUserId(userId)).thenReturn(Collections.singletonList(userPlay));
        when(matchPlayerRepository.findByMatchIdIn(Collections.singletonList(matchId)))
                .thenReturn(Arrays.asList(userPlay, opponentPlay));

        List<MatchHistoryDto> history = profileService.getUserMatches(userId);

        assertNotNull(history);
        assertEquals(1, history.size());

        MatchHistoryDto dto = history.get(0);
        assertEquals(matchId, dto.getMatchId());
        assertEquals("ABCD12", dto.getRoomCode());
        assertEquals("TestUser", dto.getWinnerName());
        assertEquals("RED", dto.getUserColor());
        assertEquals(1, dto.getUserRank());
        assertEquals(3, dto.getKills());
        assertEquals(1, dto.getDeaths());
        assertEquals(32, dto.getMmrChange());
        assertEquals(2, dto.getPlayers().size());
    }
}
