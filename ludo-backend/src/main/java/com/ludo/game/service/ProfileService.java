package com.ludo.game.service;

import com.ludo.game.dto.MatchHistoryDto;
import com.ludo.game.dto.MatchHistoryPlayerDto;
import com.ludo.game.dto.UserStatsDto;
import com.ludo.game.model.entity.MatchPlayer;
import com.ludo.game.model.entity.User;
import com.ludo.game.repository.MatchPlayerRepository;
import com.ludo.game.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final MatchPlayerRepository matchPlayerRepository;

    public ProfileService(UserRepository userRepository, MatchPlayerRepository matchPlayerRepository) {
        this.userRepository = userRepository;
        this.matchPlayerRepository = matchPlayerRepository;
    }

    @Transactional(readOnly = true)
    public UserStatsDto getUserStats(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<MatchPlayer> userPlays = matchPlayerRepository.findByUserId(userId);

        int ratingMmr = user.getRatingMmr();
        String rankTier = calculateRankTier(ratingMmr);
        int matchesPlayed = userPlays.size();

        int matchesWon = 0;
        int totalKills = 0;
        int totalDeaths = 0;

        for (MatchPlayer mp : userPlays) {
            if (mp.getRankPosition() != null && mp.getRankPosition() == 1) {
                matchesWon++;
            }
            totalKills += mp.getTotalKills();
            totalDeaths += mp.getTotalDeaths();
        }

        double winRate = matchesPlayed > 0 ? ((double) matchesWon / matchesPlayed) * 100.0 : 0.0;

        return new UserStatsDto(ratingMmr, rankTier, matchesPlayed, matchesWon, winRate, totalKills, totalDeaths);
    }

    @Transactional(readOnly = true)
    public List<MatchHistoryDto> getUserMatches(UUID userId) {
        List<MatchPlayer> userPlays = matchPlayerRepository.findByUserId(userId);
        if (userPlays.isEmpty()) {
            return Collections.emptyList();
        }

        // Extract match IDs
        List<UUID> matchIds = userPlays.stream()
                .map(mp -> mp.getMatch().getId())
                .collect(Collectors.toList());

        // Batch retrieve all participants for these matches to avoid N+1
        List<MatchPlayer> allParticipants = matchPlayerRepository.findByMatchIdIn(matchIds);

        // Group participants by Match ID
        Map<UUID, List<MatchPlayer>> participantsByMatch = allParticipants.stream()
                .collect(Collectors.groupingBy(mp -> mp.getMatch().getId()));

        List<MatchHistoryDto> history = new ArrayList<>();

        for (MatchPlayer userPlay : userPlays) {
            UUID matchId = userPlay.getMatch().getId();
            List<MatchPlayer> matchParticipants = participantsByMatch.getOrDefault(matchId, Collections.emptyList());

            List<MatchHistoryPlayerDto> playerDtos = matchParticipants.stream()
                    .map(p -> {
                        String name = p.getUser() != null ? p.getUser().getDisplayName() : "Bot AI";
                        return new MatchHistoryPlayerDto(name, p.getPlayerColor().name(), p.getRankPosition() != null ? p.getRankPosition() : 4);
                    })
                    .collect(Collectors.toList());

            String winnerName = userPlay.getMatch().getWinner() != null 
                    ? userPlay.getMatch().getWinner().getDisplayName() 
                    : "No Winner";

            int userRank = userPlay.getRankPosition() != null ? userPlay.getRankPosition() : 4;
            int mmrChange = (userRank == 1) ? 32 : -16;

            MatchHistoryDto dto = new MatchHistoryDto(
                    matchId,
                    userPlay.getMatch().getRoomCode(),
                    userPlay.getMatch().getStartTime(),
                    userPlay.getMatch().getEndTime(),
                    winnerName,
                    userPlay.getPlayerColor().name(),
                    userRank,
                    userPlay.getTotalKills(),
                    userPlay.getTotalDeaths(),
                    mmrChange,
                    playerDtos
            );

            history.add(dto);
        }

        return history;
    }

    private String calculateRankTier(int mmr) {
        if (mmr < 1000) {
            if (mmr < 250) return "Bronze IV";
            if (mmr < 500) return "Bronze III";
            if (mmr < 750) return "Bronze II";
            return "Bronze I";
        } else if (mmr < 1400) {
            if (mmr < 1100) return "Silver IV";
            if (mmr < 1200) return "Silver III";
            if (mmr < 1300) return "Silver II";
            return "Silver I";
        } else if (mmr < 1800) {
            if (mmr < 1500) return "Gold IV";
            if (mmr < 1600) return "Gold III";
            if (mmr < 1700) return "Gold II";
            return "Gold I";
        } else if (mmr < 2200) {
            if (mmr < 1900) return "Platinum IV";
            if (mmr < 2000) return "Platinum III";
            if (mmr < 2100) return "Platinum II";
            return "Platinum I";
        } else if (mmr < 2600) {
            if (mmr < 2300) return "Diamond IV";
            if (mmr < 2400) return "Diamond III";
            if (mmr < 2500) return "Diamond II";
            return "Diamond I";
        } else {
            return "Master";
        }
    }
}
