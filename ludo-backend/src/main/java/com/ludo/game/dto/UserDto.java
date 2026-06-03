package com.ludo.game.dto;

import java.util.UUID;

public class UserDto {
    private UUID id;
    private String email;
    private String displayName;
    private Integer ratingMmr;

    public UserDto() {
    }

    public UserDto(UUID id, String email, String displayName, Integer ratingMmr) {
        this.id = id;
        this.email = email;
        this.displayName = displayName;
        this.ratingMmr = ratingMmr;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Integer getRatingMmr() {
        return ratingMmr;
    }

    public void setRatingMmr(Integer ratingMmr) {
        this.ratingMmr = ratingMmr;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private UUID id;
        private String email;
        private String displayName;
        private Integer ratingMmr;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder displayName(String displayName) {
            this.displayName = displayName;
            return this;
        }

        public Builder ratingMmr(Integer ratingMmr) {
            this.ratingMmr = ratingMmr;
            return this;
        }

        public UserDto build() {
            return new UserDto(id, email, displayName, ratingMmr);
        }
    }
}
