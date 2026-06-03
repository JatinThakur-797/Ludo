package com.ludo.game.controller;

import com.ludo.game.dto.MatchHistoryDto;
import com.ludo.game.dto.UserStatsDto;
import com.ludo.game.security.UserPrincipal;
import com.ludo.game.service.ProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    private UUID getUserId(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken) {
            UsernamePasswordAuthenticationToken token = (UsernamePasswordAuthenticationToken) principal;
            if (token.getPrincipal() instanceof UserPrincipal) {
                return ((UserPrincipal) token.getPrincipal()).getId();
            }
        }
        throw new IllegalArgumentException("Unauthorized access");
    }

    @GetMapping("/stats")
    public ResponseEntity<UserStatsDto> getStats(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            UUID userId = getUserId(principal);
            UserStatsDto stats = profileService.getUserStats(userId);
            return ResponseEntity.ok(stats);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).build();
        }
    }

    @GetMapping("/matches")
    public ResponseEntity<List<MatchHistoryDto>> getMatches(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            UUID userId = getUserId(principal);
            List<MatchHistoryDto> matches = profileService.getUserMatches(userId);
            return ResponseEntity.ok(matches);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).build();
        }
    }
}
