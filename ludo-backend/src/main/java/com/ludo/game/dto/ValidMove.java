package com.ludo.game.dto;

public class ValidMove {
    private int tokenIndex;
    private int fromPosition;
    private int toPosition;
    private boolean isCapture;
    private boolean isGoalEntry;

    public ValidMove() {}

    public ValidMove(int tokenIndex, int fromPosition, int toPosition, boolean isCapture, boolean isGoalEntry) {
        this.tokenIndex = tokenIndex;
        this.fromPosition = fromPosition;
        this.toPosition = toPosition;
        this.isCapture = isCapture;
        this.isGoalEntry = isGoalEntry;
    }

    public int getTokenIndex() {
        return tokenIndex;
    }

    public void setTokenIndex(int tokenIndex) {
        this.tokenIndex = tokenIndex;
    }

    public int getFromPosition() {
        return fromPosition;
    }

    public void setFromPosition(int fromPosition) {
        this.fromPosition = fromPosition;
    }

    public int getToPosition() {
        return toPosition;
    }

    public void setToPosition(int toPosition) {
        this.toPosition = toPosition;
    }

    public boolean isCapture() {
        return isCapture;
    }

    public void setCapture(boolean capture) {
        isCapture = capture;
    }

    public boolean isGoalEntry() {
        return isGoalEntry;
    }

    public void setGoalEntry(boolean goalEntry) {
        isGoalEntry = goalEntry;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private int tokenIndex;
        private int fromPosition;
        private int toPosition;
        private boolean isCapture;
        private boolean isGoalEntry;

        public Builder tokenIndex(int tokenIndex) {
            this.tokenIndex = tokenIndex;
            return this;
        }

        public Builder fromPosition(int fromPosition) {
            this.fromPosition = fromPosition;
            return this;
        }

        public Builder toPosition(int toPosition) {
            this.toPosition = toPosition;
            return this;
        }

        public Builder isCapture(boolean isCapture) {
            this.isCapture = isCapture;
            return this;
        }

        public Builder isGoalEntry(boolean isGoalEntry) {
            this.isGoalEntry = isGoalEntry;
            return this;
        }

        public ValidMove build() {
            return new ValidMove(tokenIndex, fromPosition, toPosition, isCapture, isGoalEntry);
        }
    }
}
