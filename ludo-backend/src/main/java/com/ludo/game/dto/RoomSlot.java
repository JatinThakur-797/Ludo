package com.ludo.game.dto;

import com.ludo.game.model.enums.Color;

public class RoomSlot {
    private String userId;
    private String displayName;
    private Color color;
    private boolean isReady;
    private boolean isOnline;

    public RoomSlot() {}

    public RoomSlot(String userId, String displayName, Color color, boolean isReady, boolean isOnline) {
        this.userId = userId;
        this.displayName = displayName;
        this.color = color;
        this.isReady = isReady;
        this.isOnline = isOnline;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Color getColor() {
        return color;
    }

    public void setColor(Color color) {
        this.color = color;
    }

    public boolean isReady() {
        return isReady;
    }

    public void setReady(boolean ready) {
        isReady = ready;
    }

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String userId;
        private String displayName;
        private Color color;
        private boolean isReady;
        private boolean isOnline;

        public Builder userId(String userId) {
            this.userId = userId;
            return this;
        }

        public Builder displayName(String displayName) {
            this.displayName = displayName;
            return this;
        }

        public Builder color(Color color) {
            this.color = color;
            return this;
        }

        public Builder isReady(boolean isReady) {
            this.isReady = isReady;
            return this;
        }

        public Builder isOnline(boolean isOnline) {
            this.isOnline = isOnline;
            return this;
        }

        public RoomSlot build() {
            return new RoomSlot(userId, displayName, color, isReady, isOnline);
        }
    }
}
