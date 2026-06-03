package com.ludo.game.service;

import com.ludo.game.dto.UserDto;
import com.ludo.game.model.entity.User;
import com.ludo.game.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeaderboardService {

    private final UserRepository userRepository;

    public LeaderboardService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<UserDto> getLeaderboard(Pageable pageable) {
        Page<User> usersPage = userRepository.findAllByOrderByRatingMmrDesc(pageable);
        return usersPage.map(u -> new UserDto(u.getId(), u.getEmail(), u.getDisplayName(), u.getRatingMmr()));
    }
}
