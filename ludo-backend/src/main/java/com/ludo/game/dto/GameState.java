package com.ludo.game.dto;

import com.ludo.game.model.enums.Color;
import com.ludo.game.model.enums.GameStatus;
import java.util.List;
import java.util.Map;

public class GameState {
    private String gameId;
    private GameStatus status;
    private Map<Color, PlayerState> players;
    private Color activeColor;
    private String turnPhase;
    private Integer lastRoll;
    private int consecutiveSixesCount;
    private List<ValidMove> availableMoves;
    private Color winnerColor;
    private int sequenceNumber;

    public GameState() {}

    public GameState(String gameId, GameStatus status, Map<Color, PlayerState> players, Color activeColor,
                     String turnPhase, Integer lastRoll, int consecutiveSixesCount,
                     List<ValidMove> availableMoves, Color winnerColor, int sequenceNumber) {
        this.gameId = gameId;
        this.status = status;
        this.players = players;
        this.activeColor = activeColor;
        this.turnPhase = turnPhase;
        this.lastRoll = lastRoll;
        this.consecutiveSixesCount = consecutiveSixesCount;
        this.availableMoves = availableMoves;
        this.winnerColor = winnerColor;
        this.sequenceNumber = sequenceNumber;
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
    }

    public Map<Color, PlayerState> getPlayers() {
        return players;
    }

    public void setPlayers(Map<Color, PlayerState> players) {
        this.players = players;
    }

    public Color getActiveColor() {
        return activeColor;
    }

    public void setActiveColor(Color activeColor) {
        this.activeColor = activeColor;
    }

    public String getTurnPhase() {
        return turnPhase;
    }

    public void setTurnPhase(String turnPhase) {
        this.turnPhase = turnPhase;
    }

    public Integer getLastRoll() {
        return lastRoll;
    }

    public void setLastRoll(Integer lastRoll) {
        this.lastRoll = lastRoll;
    }

    public int getConsecutiveSixesCount() {
        return consecutiveSixesCount;
    }

    public void setConsecutiveSixesCount(int consecutiveSixesCount) {
        this.consecutiveSixesCount = consecutiveSixesCount;
    }

    public List<ValidMove> getAvailableMoves() {
        return availableMoves;
    }

    public void setAvailableMoves(List<ValidMove> availableMoves) {
        this.availableMoves = availableMoves;
    }

    public Color getWinnerColor() {
        return winnerColor;
    }

    public void setWinnerColor(Color winnerColor) {
        this.winnerColor = winnerColor;
    }

    public int getSequenceNumber() {
        return sequenceNumber;
    }

    public void setSequenceNumber(int sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String gameId;
        private GameStatus status;
        private Map<Color, PlayerState> players;
        private Color activeColor;
        private String turnPhase;
        private Integer lastRoll;
        private int consecutiveSixesCount;
        private List<ValidMove> availableMoves;
        private Color winnerColor;
        private int sequenceNumber;

        public Builder gameId(String gameId) {
            this.gameId = gameId;
            return this;
        }

        public Builder status(GameStatus status) {
            this.status = status;
            return this;
        }

        public Builder players(Map<Color, PlayerState> players) {
            this.players = players;
            return this;
        }

        public Builder activeColor(Color activeColor) {
            this.activeColor = activeColor;
            return this;
        }

        public Builder turnPhase(String turnPhase) {
            this.turnPhase = turnPhase;
            return this;
        }

        public Builder lastRoll(Integer lastRoll) {
            this.lastRoll = lastRoll;
            return this;
        }

        public Builder consecutiveSixesCount(int consecutiveSixesCount) {
            this.consecutiveSixesCount = consecutiveSixesCount;
            return this;
        }

        public Builder availableMoves(List<ValidMove> availableMoves) {
            this.availableMoves = availableMoves;
            return this;
        }

        public Builder winnerColor(Color winnerColor) {
            this.winnerColor = winnerColor;
            return this;
        }

        public Builder sequenceNumber(int sequenceNumber) {
            this.sequenceNumber = sequenceNumber;
            return this;
        }

        public GameState build() {
            return new GameState(gameId, status, players, activeColor, turnPhase, lastRoll, consecutiveSixesCount, availableMoves, winnerColor, sequenceNumber);
        }
    }
}
