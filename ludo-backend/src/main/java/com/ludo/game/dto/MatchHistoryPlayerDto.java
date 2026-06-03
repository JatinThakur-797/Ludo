package com.ludo.game.dto;

public class MatchHistoryPlayerDto {
    private String displayName;
    private String color;
    private int rankPosition;

    public MatchHistoryPlayerDto() {}

    public MatchHistoryPlayerDto(String displayName, String color, int rankPosition) {
        this.displayName = displayName;
        this.color = color;
        this.rankPosition = rankPosition;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getRankPosition() {
        return rankPosition;
    }

    public void setRankPosition(int rankPosition) {
        this.rankPosition = rankPosition;
    }
}
