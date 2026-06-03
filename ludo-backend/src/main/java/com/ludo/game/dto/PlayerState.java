package com.ludo.game.dto;

import com.ludo.game.model.enums.Color;
import java.util.List;

public class PlayerState {
    private String userId;
    private String displayName;
    private Color color;
    private boolean isOnline;
    private boolean isAi;
    private List<TokenState> tokens;
    private Integer finishOrder;

    public PlayerState() {}

    public PlayerState(String userId, String displayName, Color color, boolean isOnline, boolean isAi, List<TokenState> tokens, Integer finishOrder) {
        this.userId = userId;
        this.displayName = displayName;
        this.color = color;
        this.isOnline = isOnline;
        this.isAi = isAi;
        this.tokens = tokens;
        this.finishOrder = finishOrder;
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

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public boolean isAi() {
        return isAi;
    }

    public void setAi(boolean ai) {
        isAi = ai;
    }

    public List<TokenState> getTokens() {
        return tokens;
    }

    public void setTokens(List<TokenState> tokens) {
        this.tokens = tokens;
    }

    public Integer getFinishOrder() {
        return finishOrder;
    }

    public void setFinishOrder(Integer finishOrder) {
        this.finishOrder = finishOrder;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String userId;
        private String displayName;
        private Color color;
        private boolean isOnline;
        private boolean isAi;
        private List<TokenState> tokens;
        private Integer finishOrder;

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

        public Builder isOnline(boolean isOnline) {
            this.isOnline = isOnline;
            return this;
        }

        public Builder isAi(boolean isAi) {
            this.isAi = isAi;
            return this;
        }

        public Builder tokens(List<TokenState> tokens) {
            this.tokens = tokens;
            return this;
        }

        public Builder finishOrder(Integer finishOrder) {
            this.finishOrder = finishOrder;
            return this;
        }

        public PlayerState build() {
            return new PlayerState(userId, displayName, color, isOnline, isAi, tokens, finishOrder);
        }
    }
}
