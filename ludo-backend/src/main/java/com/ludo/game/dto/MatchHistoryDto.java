package com.ludo.game.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class MatchHistoryDto {
    private UUID matchId;
    private String roomCode;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private String winnerName;
    private String userColor;
    private int userRank;
    private int kills;
    private int deaths;
    private int mmrChange;
    private List<MatchHistoryPlayerDto> players;

    public MatchHistoryDto() {}

    public MatchHistoryDto(UUID matchId, String roomCode, OffsetDateTime startTime, OffsetDateTime endTime, 
                           String winnerName, String userColor, int userRank, int kills, int deaths, 
                           int mmrChange, List<MatchHistoryPlayerDto> players) {
        this.matchId = matchId;
        this.roomCode = roomCode;
        this.startTime = startTime;
        this.endTime = endTime;
        this.winnerName = winnerName;
        this.userColor = userColor;
        this.userRank = userRank;
        this.kills = kills;
        this.deaths = deaths;
        this.mmrChange = mmrChange;
        this.players = players;
    }

    public UUID getMatchId() {
        return matchId;
    }

    public void setMatchId(UUID matchId) {
        this.matchId = matchId;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
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

    public String getWinnerName() {
        return winnerName;
    }

    public void setWinnerName(String winnerName) {
        this.winnerName = winnerName;
    }

    public String getUserColor() {
        return userColor;
    }

    public void setUserColor(String userColor) {
        this.userColor = userColor;
    }

    public int getUserRank() {
        return userRank;
    }

    public void setUserRank(int userRank) {
        this.userRank = userRank;
    }

    public int getKills() {
        return kills;
    }

    public void setKills(int kills) {
        this.kills = kills;
    }

    public int getDeaths() {
        return deaths;
    }

    public void setDeaths(int deaths) {
        this.deaths = deaths;
    }

    public int getMmrChange() {
        return mmrChange;
    }

    public void setMmrChange(int mmrChange) {
        this.mmrChange = mmrChange;
    }

    public List<MatchHistoryPlayerDto> getPlayers() {
        return players;
    }

    public void setPlayers(List<MatchHistoryPlayerDto> players) {
        this.players = players;
    }
}
