package com.ludo.game.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.dto.RedisPubSubMessage;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class RedisMessageListener implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    // Use @Lazy to avoid circular reference since SimpMessagingTemplate depends on WebSocket config
    public RedisMessageListener(@Lazy SimpMessagingTemplate messagingTemplate, ObjectMapper objectMapper) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody(), StandardCharsets.UTF_8);
            
            // Jackson might serialize it with quotes if it was serialized as a JSON string,
            // or as a structured object. Let's handle it robustly.
            RedisPubSubMessage pubSubMessage;
            if (body.startsWith("\"") && body.endsWith("\"")) {
                // Unescape JSON string if double-serialized
                String unescaped = objectMapper.readValue(body, String.class);
                pubSubMessage = objectMapper.readValue(unescaped, RedisPubSubMessage.class);
            } else {
                pubSubMessage = objectMapper.readValue(body, RedisPubSubMessage.class);
            }

            if (pubSubMessage != null && pubSubMessage.getDestination() != null) {
                Object payloadObj;
                try {
                    payloadObj = objectMapper.readValue(pubSubMessage.getPayload(), Object.class);
                } catch (Exception e) {
                    payloadObj = pubSubMessage.getPayload();
                }
                // Forward the message body to the local STOMP broker clients
                messagingTemplate.convertAndSend(pubSubMessage.getDestination(), payloadObj);
            }
        } catch (Exception e) {
            System.err.println("Error processing Redis message: " + e.getMessage());
        }
    }
}
