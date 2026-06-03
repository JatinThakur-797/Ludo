package com.ludo.game.dto;

public class GameEffect {
    private String type;
    private Object payload;

    public GameEffect() {}

    public GameEffect(String type, Object payload) {
        this.type = type;
        this.payload = payload;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Object getPayload() {
        return payload;
    }

    public void setPayload(Object payload) {
        this.payload = payload;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String type;
        private Object payload;

        public Builder type(String type) {
            this.type = type;
            return this;
        }

        public Builder payload(Object payload) {
            this.payload = payload;
            return this;
        }

        public GameEffect build() {
            return new GameEffect(type, payload);
        }
    }
}
