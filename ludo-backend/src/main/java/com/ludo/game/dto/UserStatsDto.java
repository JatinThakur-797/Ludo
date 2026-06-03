package com.ludo.game.dto;

public class UserStatsDto {
    private int ratingMmr;
    private String rankTier;
    private int matchesPlayed;
    private int matchesWon;
    private double winRate;
    private int totalKills;
    private int totalDeaths;

    public UserStatsDto() {}

    public UserStatsDto(int ratingMmr, String rankTier, int matchesPlayed, int matchesWon, double winRate, int totalKills, int totalDeaths) {
        this.ratingMmr = ratingMmr;
        this.rankTier = rankTier;
        this.matchesPlayed = matchesPlayed;
        this.matchesWon = matchesWon;
        this.winRate = winRate;
        this.totalKills = totalKills;
        this.totalDeaths = totalDeaths;
    }

    public int getRatingMmr() {
        return ratingMmr;
    }

    public void setRatingMmr(int ratingMmr) {
        this.ratingMmr = ratingMmr;
    }

    public String getRankTier() {
        return rankTier;
    }

    public void setRankTier(String rankTier) {
        this.rankTier = rankTier;
    }

    public int getMatchesPlayed() {
        return matchesPlayed;
    }

    public void setMatchesPlayed(int matchesPlayed) {
        this.matchesPlayed = matchesPlayed;
    }

    public int getMatchesWon() {
        return matchesWon;
    }

    public void setMatchesWon(int matchesWon) {
        this.matchesWon = matchesWon;
    }

    public double getWinRate() {
        return winRate;
    }

    public void setWinRate(double winRate) {
        this.winRate = winRate;
    }

    public int getTotalKills() {
        return totalKills;
    }

    public void setTotalKills(int totalKills) {
        this.totalKills = totalKills;
    }

    public int getTotalDeaths() {
        return totalDeaths;
    }

    public void setTotalDeaths(int totalDeaths) {
        this.totalDeaths = totalDeaths;
    }
}
