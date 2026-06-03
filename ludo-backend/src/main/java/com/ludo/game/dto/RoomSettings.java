package com.ludo.game.dto;

public class RoomSettings {
    private int maxPlayers = 4;
    private int turnTimerSeconds = 15;
    private boolean killRequiredToEnterHome = true;

    public RoomSettings() {}

    public RoomSettings(int maxPlayers, int turnTimerSeconds, boolean killRequiredToEnterHome) {
        this.maxPlayers = maxPlayers;
        this.turnTimerSeconds = turnTimerSeconds;
        this.killRequiredToEnterHome = killRequiredToEnterHome;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(int maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public int getTurnTimerSeconds() {
        return turnTimerSeconds;
    }

    public void setTurnTimerSeconds(int turnTimerSeconds) {
        this.turnTimerSeconds = turnTimerSeconds;
    }

    public boolean isKillRequiredToEnterHome() {
        return killRequiredToEnterHome;
    }

    public void setKillRequiredToEnterHome(boolean killRequiredToEnterHome) {
        this.killRequiredToEnterHome = killRequiredToEnterHome;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int maxPlayers = 4;
        private int turnTimerSeconds = 15;
        private boolean killRequiredToEnterHome = true;

        public Builder maxPlayers(int maxPlayers) {
            this.maxPlayers = maxPlayers;
            return this;
        }

        public Builder turnTimerSeconds(int turnTimerSeconds) {
            this.turnTimerSeconds = turnTimerSeconds;
            return this;
        }

        public Builder killRequiredToEnterHome(boolean killRequiredToEnterHome) {
            this.killRequiredToEnterHome = killRequiredToEnterHome;
            return this;
        }

        public RoomSettings build() {
            return new RoomSettings(maxPlayers, turnTimerSeconds, killRequiredToEnterHome);
        }
    }
}
