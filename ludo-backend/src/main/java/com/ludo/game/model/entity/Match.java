package com.ludo.game.model.entity;

import com.ludo.game.model.enums.GameStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "matches")
public class Match {
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_code", nullable = false, length = 10)
    private String roomCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private GameStatus status;

    @Column(name = "start_time", nullable = false, updatable = false)
    private OffsetDateTime startTime = OffsetDateTime.now();

    @Column(name = "end_time")
    private OffsetDateTime endTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "game_state_snapshot")
    private String gameStateSnapshot;

    public Match() {
    }

    public Match(UUID id, String roomCode, GameStatus status, OffsetDateTime startTime, OffsetDateTime endTime, User winner, String gameStateSnapshot) {
        this.id = id;
        this.roomCode = roomCode;
        this.status = status;
        this.startTime = startTime != null ? startTime : OffsetDateTime.now();
        this.endTime = endTime;
        this.winner = winner;
        this.gameStateSnapshot = gameStateSnapshot;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
    }

    public OffsetDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(OffsetDateTime startTime) {
        this.startTime = startTime;
    }

    public OffsetDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(OffsetDateTime endTime) {
        this.endTime = endTime;
    }

    public User getWinner() {
        return winner;
    }

    public void setWinner(User winner) {
        this.winner = winner;
    }

    public String getGameStateSnapshot() {
        return gameStateSnapshot;
    }

    public void setGameStateSnapshot(String gameStateSnapshot) {
        this.gameStateSnapshot = gameStateSnapshot;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private String roomCode;
        private GameStatus status;
        private OffsetDateTime startTime = OffsetDateTime.now();
        private OffsetDateTime endTime;
        private User winner;
        private String gameStateSnapshot;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder roomCode(String roomCode) {
            this.roomCode = roomCode;
            return this;
        }

        public Builder status(GameStatus status) {
            this.status = status;
            return this;
        }

        public Builder startTime(OffsetDateTime startTime) {
            this.startTime = startTime;
            return this;
        }

        public Builder endTime(OffsetDateTime endTime) {
            this.endTime = endTime;
            return this;
        }

        public Builder winner(User winner) {
            this.winner = winner;
            return this;
        }

        public Builder gameStateSnapshot(String gameStateSnapshot) {
            this.gameStateSnapshot = gameStateSnapshot;
            return this;
        }

        public Match build() {
            return new Match(id, roomCode, status, startTime, endTime, winner, gameStateSnapshot);
        }
    }
}
