package com.ludo.game.dto;

import com.ludo.game.model.enums.GameStatus;
import java.util.List;
import java.util.Map;

public class LudoRoom {
    private String roomCode;
    private GameStatus status;
    private String hostId;
    private RoomSettings settings;
    private List<RoomSlot> slots;
    private GameState gameState;
    private Map<String, Long> disconnectedTimestampMap;
    private Map<String, Integer> consecutiveTimeoutsMap;

    public LudoRoom() {}

    public LudoRoom(String roomCode, GameStatus status, String hostId, RoomSettings settings, List<RoomSlot> slots, GameState gameState, Map<String, Long> disconnectedTimestampMap, Map<String, Integer> consecutiveTimeoutsMap) {
        this.roomCode = roomCode;
        this.status = status;
        this.hostId = hostId;
        this.settings = settings;
        this.slots = slots;
        this.gameState = gameState;
        this.disconnectedTimestampMap = disconnectedTimestampMap;
        this.consecutiveTimeoutsMap = consecutiveTimeoutsMap;
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

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
    }

    public RoomSettings getSettings() {
        return settings;
    }

    public void setSettings(RoomSettings settings) {
        this.settings = settings;
    }

    public List<RoomSlot> getSlots() {
        return slots;
    }

    public void setSlots(List<RoomSlot> slots) {
        this.slots = slots;
    }

    public GameState getGameState() {
        return gameState;
    }

    public void setGameState(GameState gameState) {
        this.gameState = gameState;
    }

    public Map<String, Long> getDisconnectedTimestampMap() {
        return disconnectedTimestampMap;
    }

    public void setDisconnectedTimestampMap(Map<String, Long> disconnectedTimestampMap) {
        this.disconnectedTimestampMap = disconnectedTimestampMap;
    }

    public Map<String, Integer> getConsecutiveTimeoutsMap() {
        return consecutiveTimeoutsMap;
    }

    public void setConsecutiveTimeoutsMap(Map<String, Integer> consecutiveTimeoutsMap) {
        this.consecutiveTimeoutsMap = consecutiveTimeoutsMap;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String roomCode;
        private GameStatus status;
        private String hostId;
        private RoomSettings settings;
        private List<RoomSlot> slots;
        private GameState gameState;
        private Map<String, Long> disconnectedTimestampMap;
        private Map<String, Integer> consecutiveTimeoutsMap;

        public Builder roomCode(String roomCode) {
            this.roomCode = roomCode;
            return this;
        }

        public Builder status(GameStatus status) {
            this.status = status;
            return this;
        }

        public Builder hostId(String hostId) {
            this.hostId = hostId;
            return this;
        }

        public Builder settings(RoomSettings settings) {
            this.settings = settings;
            return this;
        }

        public Builder slots(List<RoomSlot> slots) {
            this.slots = slots;
            return this;
        }

        public Builder gameState(GameState gameState) {
            this.gameState = gameState;
            return this;
        }

        public Builder disconnectedTimestampMap(Map<String, Long> disconnectedTimestampMap) {
            this.disconnectedTimestampMap = disconnectedTimestampMap;
            return this;
        }

        public Builder consecutiveTimeoutsMap(Map<String, Integer> consecutiveTimeoutsMap) {
            this.consecutiveTimeoutsMap = consecutiveTimeoutsMap;
            return this;
        }

        public LudoRoom build() {
            return new LudoRoom(roomCode, status, hostId, settings, slots, gameState, disconnectedTimestampMap, consecutiveTimeoutsMap);
        }
    }
}
