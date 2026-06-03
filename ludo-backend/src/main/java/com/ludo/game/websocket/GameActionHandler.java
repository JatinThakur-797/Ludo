package com.ludo.game.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.dto.LudoRoom;
import com.ludo.game.dto.GameState;
import com.ludo.game.dto.ValidMove;
import com.ludo.game.engine.LudoEngine;
import com.ludo.game.model.enums.Color;
import com.ludo.game.model.enums.GameStatus;
import com.ludo.game.security.UserPrincipal;
import com.ludo.game.service.RoomService;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Controller
public class GameActionHandler {

    private final RoomService roomService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public GameActionHandler(RoomService roomService,
                             RedisTemplate<String, Object> redisTemplate,
                             SimpMessagingTemplate messagingTemplate,
                             ObjectMapper objectMapper) {
        this.roomService = roomService;
        this.redisTemplate = redisTemplate;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    private UserPrincipal getUserPrincipal(SimpMessageHeaderAccessor headerAccessor) {
        Principal user = headerAccessor.getUser();
        if (user instanceof UsernamePasswordAuthenticationToken) {
            UsernamePasswordAuthenticationToken token = (UsernamePasswordAuthenticationToken) user;
            if (token.getPrincipal() instanceof UserPrincipal) {
                return (UserPrincipal) token.getPrincipal();
            }
        }
        return null;
    }

    @MessageMapping("/room/{roomCode}/join")
    public void handleJoinRoom(
            @DestinationVariable String roomCode,
            SimpMessageHeaderAccessor headerAccessor) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        if (principal == null) return;

        UUID userId = principal.getId();
        String displayName = principal.getDisplayName();

        // Register session ID in Redis for disconnect tracking
        String sessionId = headerAccessor.getSessionId();
        redisTemplate.opsForValue().set("ludo:session:" + sessionId, roomCode + ":" + userId, Duration.ofHours(2));

        roomService.joinRoom(roomCode, userId, displayName);
    }

    @MessageMapping("/room/{roomCode}/ready")
    public void handleReady(
            @DestinationVariable String roomCode,
            @Payload Map<String, Boolean> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        if (principal == null) return;

        UUID userId = principal.getId();
        boolean isReady = payload.containsKey("ready") ? payload.get("ready") : payload.containsKey("isReady") ? payload.get("isReady") : false;

        roomService.toggleReady(roomCode, userId, isReady);
    }

    @MessageMapping("/room/{roomCode}/start")
    public void handleStartGame(
            @DestinationVariable String roomCode,
            SimpMessageHeaderAccessor headerAccessor) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        if (principal == null) return;

        UUID userId = principal.getId();
        roomService.startGame(roomCode, userId);
    }

    @MessageMapping("/game/{roomCode}/roll")
    public void handleRollDice(
            @DestinationVariable String roomCode,
            SimpMessageHeaderAccessor headerAccessor) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        if (principal == null) return;

        UUID userId = principal.getId();
        LudoRoom room = roomService.getRoom(roomCode);
        if (room == null || room.getStatus() != GameStatus.ACTIVE || room.getGameState() == null) {
            return;
        }

        GameState gameState = room.getGameState();
        Color playerColor = roomService.getPlayerColor(room, userId.toString());
        if (playerColor == null || playerColor != gameState.getActiveColor()) {
            sendError(headerAccessor, "Not your turn to roll");
            return;
        }

        if (!"WAITING_FOR_ROLL".equals(gameState.getTurnPhase())) {
            sendError(headerAccessor, "Cannot roll now");
            return;
        }

        // Roll dice
        LudoEngine.EngineResult result = LudoEngine.rollDice(gameState, null);
        GameState nextState = result.getNextState();

        room.setGameState(nextState);

        if ("WAITING_FOR_ROLL".equals(nextState.getTurnPhase())) {
            // Turn forfeited (consecutive 6s or no moves possible).
            roomService.cancelTurnTimer(roomCode);
            roomService.saveRoom(room);
            roomService.broadcastGameState(room, result.getEffects());

            if (room.getStatus() == GameStatus.ACTIVE) {
                roomService.scheduleTurnTimer(roomCode, nextState.getSequenceNumber());
                roomService.triggerAiMove(roomCode);
            }
        } else {
            // Waiting for move
            roomService.cancelTurnTimer(roomCode);
            roomService.saveRoom(room);
            roomService.broadcastGameState(room, result.getEffects());
            
            if (room.getStatus() == GameStatus.ACTIVE) {
                roomService.scheduleTurnTimer(roomCode, nextState.getSequenceNumber());
            }
        }
    }

    @MessageMapping("/game/{roomCode}/move")
    public void handleMoveToken(
            @DestinationVariable String roomCode,
            @Payload Map<String, Integer> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        if (principal == null) return;

        UUID userId = principal.getId();
        LudoRoom room = roomService.getRoom(roomCode);
        if (room == null || room.getStatus() != GameStatus.ACTIVE || room.getGameState() == null) {
            return;
        }

        GameState gameState = room.getGameState();
        Color playerColor = roomService.getPlayerColor(room, userId.toString());
        if (playerColor == null || playerColor != gameState.getActiveColor()) {
            sendError(headerAccessor, "Not your turn to move");
            return;
        }

        if (!"WAITING_FOR_MOVE".equals(gameState.getTurnPhase())) {
            sendError(headerAccessor, "Cannot move now");
            return;
        }

        int tokenIndex = payload.get("tokenIndex");
        boolean valid = false;
        for (ValidMove m : gameState.getAvailableMoves()) {
            if (m.getTokenIndex() == tokenIndex) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            sendError(headerAccessor, "Invalid token selected");
            return;
        }

        // Move token
        LudoEngine.EngineResult result = LudoEngine.moveToken(gameState, tokenIndex);
        GameState nextState = result.getNextState();
        room.setGameState(nextState);

        roomService.cancelTurnTimer(roomCode);

        if (nextState.getStatus() == GameStatus.COMPLETED) {
            room.setStatus(GameStatus.COMPLETED);
            roomService.saveRoom(room);
            roomService.broadcastGameState(room, result.getEffects());
            roomService.saveMatchToDatabase(room);
        } else {
            roomService.saveRoom(room);
            roomService.broadcastGameState(room, result.getEffects());
            
            if (room.getStatus() == GameStatus.ACTIVE) {
                roomService.scheduleTurnTimer(roomCode, nextState.getSequenceNumber());
                roomService.triggerAiMove(roomCode);
            }
        }
    }

    @MessageMapping("/room/{roomCode}/chat")
    public void handleChatMessage(
            @DestinationVariable String roomCode,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        String sender = (principal != null) ? principal.getUsername() : "Anonymous";

        Map<String, Object> data = new HashMap<>();
        data.put("sender", sender);
        data.put("content", payload.get("content"));

        Map<String, Object> envelope = new HashMap<>();
        envelope.put("eventId", UUID.randomUUID().toString());
        envelope.put("eventType", "CHAT_MESSAGE");
        envelope.put("type", "CHAT_MESSAGE");
        envelope.put("timestamp", java.time.Instant.now().toString());
        envelope.put("sequenceNumber", 0);
        envelope.put("payload", data);
        envelope.put("data", data);

        roomService.broadcast("/topic/room/" + roomCode, envelope);
    }

    // Keep this test mapping to maintain compatibility with Phase 7 integration tests
    @MessageMapping("/game/{roomCode}/action")
    public void handleGameAction(
            @DestinationVariable String roomCode,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        String username = (principal != null) ? principal.getUsername() : "Anonymous";

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("processedBy", username);
        responseData.put("receivedPayload", payload);

        Map<String, Object> envelope = new HashMap<>();
        envelope.put("eventId", UUID.randomUUID().toString());
        envelope.put("eventType", "GAME_ACTION_ECHO");
        envelope.put("type", "GAME_ACTION_ECHO");
        envelope.put("timestamp", java.time.Instant.now().toString());
        envelope.put("payload", responseData);
        envelope.put("data", responseData);

        roomService.broadcast("/topic/room/" + roomCode, envelope);
    }

    private void sendError(SimpMessageHeaderAccessor headerAccessor, String message) {
        UserPrincipal principal = getUserPrincipal(headerAccessor);
        if (principal == null) return;

        Map<String, Object> errorPayload = new HashMap<>();
        errorPayload.put("error", message);
        errorPayload.put("timestamp", java.time.Instant.now().toString());

        messagingTemplate.convertAndSendToUser(principal.getUsername(), "/queue/errors", errorPayload);
    }
}
