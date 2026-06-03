package com.ludo.game.model.entity;

import com.ludo.game.model.enums.Color;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "match_players", uniqueConstraints = {
    @UniqueConstraint(name = "unique_match_player_color", columnNames = {"match_id", "player_color"})
})
public class MatchPlayer {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "player_color", nullable = false, length = 10)
    private Color playerColor;

    @Column(name = "rank_position")
    private Integer rankPosition;

    @Column(name = "total_kills", nullable = false)
    private Integer totalKills = 0;

    @Column(name = "total_deaths", nullable = false)
    private Integer totalDeaths = 0;

    public MatchPlayer() {
    }

    public MatchPlayer(UUID id, Match match, User user, Color playerColor, Integer rankPosition, Integer totalKills, Integer totalDeaths) {
        this.id = id;
        this.match = match;
        this.user = user;
        this.playerColor = playerColor;
        this.rankPosition = rankPosition;
        this.totalKills = totalKills != null ? totalKills : 0;
        this.totalDeaths = totalDeaths != null ? totalDeaths : 0;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Match getMatch() {
        return match;
    }

    public void setMatch(Match match) {
        this.match = match;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Color getPlayerColor() {
        return playerColor;
    }

    public void setPlayerColor(Color playerColor) {
        this.playerColor = playerColor;
    }

    public Integer getRankPosition() {
        return rankPosition;
    }

    public void setRankPosition(Integer rankPosition) {
        this.rankPosition = rankPosition;
    }

    public Integer getTotalKills() {
        return totalKills;
    }

    public void setTotalKills(Integer totalKills) {
        this.totalKills = totalKills;
    }

    public Integer getTotalDeaths() {
        return totalDeaths;
    }

    public void setTotalDeaths(Integer totalDeaths) {
        this.totalDeaths = totalDeaths;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private Match match;
        private User user;
        private Color playerColor;
        private Integer rankPosition;
        private Integer totalKills = 0;
        private Integer totalDeaths = 0;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder match(Match match) {
            this.match = match;
            return this;
        }

        public Builder user(User user) {
            this.user = user;
            return this;
        }

        public Builder playerColor(Color playerColor) {
            this.playerColor = playerColor;
            return this;
        }

        public Builder rankPosition(Integer rankPosition) {
            this.rankPosition = rankPosition;
            return this;
        }

        public Builder totalKills(Integer totalKills) {
            this.totalKills = totalKills;
            return this;
        }

        public Builder totalDeaths(Integer totalDeaths) {
            this.totalDeaths = totalDeaths;
            return this;
        }

        public MatchPlayer build() {
            return new MatchPlayer(id, match, user, playerColor, rankPosition, totalKills, totalDeaths);
        }
    }
}
