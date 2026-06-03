package com.ludo.game.websocket;

import com.ludo.game.service.RoomService;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
public class WebSocketEventListener {

    private final RoomService roomService;
    private final RedisTemplate<String, Object> redisTemplate;

    public WebSocketEventListener(RoomService roomService, RedisTemplate<String, Object> redisTemplate) {
        this.roomService = roomService;
        this.redisTemplate = redisTemplate;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = headerAccessor.getUser();
        String username = (user != null) ? user.getName() : "Anonymous";
        System.out.println("Received a new web socket connection from user: " + username + " with session id: " + headerAccessor.getSessionId());
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        // Fetch session mapping from Redis
        Object valObj = redisTemplate.opsForValue().get("ludo:session:" + sessionId);
        if (valObj != null) {
            String val = valObj.toString();
            String[] parts = val.split(":");
            if (parts.length == 2) {
                String roomCode = parts[0];
                String userId = parts[1];
                
                System.out.println("User disconnected, starting 60s grace timer for user: " + userId + " in room: " + roomCode);
                roomService.handlePlayerDisconnect(roomCode, userId);
            }
            redisTemplate.delete("ludo:session:" + sessionId);
        }
    }
}
