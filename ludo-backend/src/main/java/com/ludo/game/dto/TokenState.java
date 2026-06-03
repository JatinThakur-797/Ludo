package com.ludo.game.dto;

public class TokenState {
    private int index;
    private int position;
    private String status;
    private boolean isSafe;

    public TokenState() {}

    public TokenState(int index, int position, String status, boolean isSafe) {
        this.index = index;
        this.position = position;
        this.status = status;
        this.isSafe = isSafe;
    }

    public int getIndex() {
        return index;
    }

    public void setIndex(int index) {
        this.index = index;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isSafe() {
        return isSafe;
    }

    public void setSafe(boolean safe) {
        isSafe = safe;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int index;
        private int position;
        private String status;
        private boolean isSafe;

        public Builder index(int index) {
            this.index = index;
            return this;
        }

        public Builder position(int position) {
            this.position = position;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder isSafe(boolean isSafe) {
            this.isSafe = isSafe;
            return this;
        }

        public TokenState build() {
            return new TokenState(index, position, status, isSafe);
        }
    }
}
