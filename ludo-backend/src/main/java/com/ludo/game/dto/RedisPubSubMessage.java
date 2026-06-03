package com.ludo.game.dto;

public class RedisPubSubMessage {
    private String destination;
    private String payload;

    public RedisPubSubMessage() {
    }

    public RedisPubSubMessage(String destination, String payload) {
        this.destination = destination;
        this.payload = payload;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String destination;
        private String payload;

        public Builder destination(String destination) {
            this.destination = destination;
            return this;
        }

        public Builder payload(String payload) {
            this.payload = payload;
            return this;
        }

        public RedisPubSubMessage build() {
            return new RedisPubSubMessage(destination, payload);
        }
    }
}
