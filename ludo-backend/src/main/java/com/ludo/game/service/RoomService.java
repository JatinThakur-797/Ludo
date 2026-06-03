package com.ludo.game.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.config.RedisConfig;
import com.ludo.game.dto.*;
import com.ludo.game.engine.LudoEngine;
import com.ludo.game.model.entity.Match;
import com.ludo.game.model.entity.MatchPlayer;
import com.ludo.game.model.entity.User;
import com.ludo.game.model.enums.Color;
import com.ludo.game.model.enums.GameStatus;
import com.ludo.game.repository.MatchPlayerRepository;
import com.ludo.game.repository.MatchRepository;
import com.ludo.game.repository.UserRepository;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class RoomService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final MatchRepository matchRepository;
    private final MatchPlayerRepository matchPlayerRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final Map<String, ScheduledFuture<?>> activeTimers = new ConcurrentHashMap<>();

    public RoomService(RedisTemplate<String, Object> redisTemplate,
                       MatchRepository matchRepository,
                       MatchPlayerRepository matchPlayerRepository,
                       UserRepository userRepository,
                       ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.matchRepository = matchRepository;
        this.matchPlayerRepository = matchPlayerRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public LudoRoom getRoom(String roomCode) {
        Object raw = redisTemplate.opsForValue().get("ludo:room:" + roomCode);
        if (raw == null) {
            return null;
        }
        if (raw instanceof LudoRoom) {
            return (LudoRoom) raw;
        }
        return objectMapper.convertValue(raw, LudoRoom.class);
    }

    public void saveRoom(LudoRoom room) {
        redisTemplate.opsForValue().set("ludo:room:" + room.getRoomCode(), room);
    }

    public LudoRoom createRoom(UUID hostId, String hostDisplayName, RoomSettings settings) {
        String roomCode = generateUniqueRoomCode();
        
        List<RoomSlot> slots = new ArrayList<>();
        slots.add(new RoomSlot(hostId.toString(), hostDisplayName, Color.RED, true, true));

        LudoRoom room = LudoRoom.builder()
                .roomCode(roomCode)
                .status(GameStatus.LOBBY)
                .hostId(hostId.toString())
                .settings(settings != null ? settings : new RoomSettings())
                .slots(slots)
                .gameState(null)
                .disconnectedTimestampMap(new HashMap<>())
                .consecutiveTimeoutsMap(new HashMap<>())
                .build();

        saveRoom(room);
        return room;
    }

    public LudoRoom joinRoom(String roomCode, UUID userId, String displayName) {
        LudoRoom room = getRoom(roomCode);
        if (room == null) {
            throw new IllegalArgumentException("Room not found");
        }

        // Check if user already in room
        boolean alreadyInRoom = false;
        for (RoomSlot slot : room.getSlots()) {
            if (userId.toString().equals(slot.getUserId())) {
                alreadyInRoom = true;
                break;
            }
        }

        if (alreadyInRoom) {
            handlePlayerReconnect(roomCode, userId.toString());
            return getRoom(roomCode);
        }

        if (room.getStatus() != GameStatus.LOBBY) {
            throw new IllegalStateException("Room is not in lobby status");
        }

        if (room.getSlots().size() >= room.getSettings().getMaxPlayers()) {
            throw new IllegalStateException("Room is full");
        }

        // Assign color slot — for 2-player games, prefer opposite corners for fair board placement
        Color assignedColor = null;
        int maxPlayers = room.getSettings().getMaxPlayers();
        int currentCount = room.getSlots().size(); // host already occupies 1 slot

        if (maxPlayers == 2 && currentCount == 1) {
            // Host took a slot — give opposite color: RED→YELLOW, GREEN→BLUE, YELLOW→RED, BLUE→GREEN
            Color hostColor = room.getSlots().get(0).getColor();
            Color opposite;
            switch (hostColor) {
                case RED:    opposite = Color.YELLOW; break;
                case YELLOW: opposite = Color.RED;    break;
                case GREEN:  opposite = Color.BLUE;   break;
                case BLUE:   opposite = Color.GREEN;  break;
                default:     opposite = Color.YELLOW; break;
            }
            // Verify opposite is actually free
            boolean oppTaken = room.getSlots().stream().anyMatch(s -> s.getColor() == opposite);
            assignedColor = oppTaken ? null : opposite;
        }

        // Fallback: sequential assignment for 3/4 players or if opposite was taken
        if (assignedColor == null) {
            for (Color color : Color.values()) {
                boolean colorTaken = false;
                for (RoomSlot slot : room.getSlots()) {
                    if (slot.getColor() == color) {
                        colorTaken = true;
                        break;
                    }
                }
                if (!colorTaken) {
                    assignedColor = color;
                    break;
                }
            }
        }

        if (assignedColor == null) {
            throw new IllegalStateException("No color slots available");
        }

        room.getSlots().add(new RoomSlot(userId.toString(), displayName, assignedColor, false, true));
        saveRoom(room);
        broadcastLobbyState(room);
        return room;
    }

    public LudoRoom toggleReady(String roomCode, UUID userId, boolean isReady) {
        LudoRoom room = getRoom(roomCode);
        if (room == null) {
            throw new IllegalArgumentException("Room not found");
        }
        if (room.getStatus() != GameStatus.LOBBY) {
            throw new IllegalStateException("Room is not in lobby status");
        }

        for (RoomSlot slot : room.getSlots()) {
            if (userId.toString().equals(slot.getUserId())) {
                slot.setReady(isReady);
                break;
            }
        }

        saveRoom(room);
        broadcastLobbyState(room);
        return room;
    }

    public LudoRoom startGame(String roomCode, UUID hostId) {
        LudoRoom room = getRoom(roomCode);
        if (room == null) {
            throw new IllegalArgumentException("Room not found");
        }
        if (room.getStatus() != GameStatus.LOBBY) {
            throw new IllegalStateException("Room is not in lobby status");
        }
        if (!hostId.toString().equals(room.getHostId())) {
            throw new IllegalArgumentException("Only host can start the game");
        }
        if (room.getSlots().size() < 2) {
            throw new IllegalStateException("Need at least 2 players to start");
        }

        // Verify everyone is ready
        for (RoomSlot slot : room.getSlots()) {
            if (!slot.isReady()) {
                throw new IllegalStateException("Not all players are ready");
            }
        }

        // Initialize game state
        List<LudoEngine.PlayerConfig> configs = new ArrayList<>();
        for (RoomSlot slot : room.getSlots()) {
            configs.add(new LudoEngine.PlayerConfig(slot.getUserId(), slot.getDisplayName(), slot.getColor(), false));
        }

        GameState gameState = LudoEngine.createInitialGameState(UUID.randomUUID().toString(), configs);
        room.setGameState(gameState);
        room.setStatus(GameStatus.ACTIVE);

        saveRoom(room);

        // Broadcast game started
        Map<String, Object> envelope = createEnvelope("GAME_STARTED", room, 0);
        broadcast("/topic/room/" + roomCode, envelope);

        // Schedule first turn timer
        scheduleTurnTimer(roomCode, 0);

        return room;
    }

    public void handlePlayerDisconnect(String roomCode, String userId) {
        LudoRoom room = getRoom(roomCode);
        if (room == null) return;

        boolean updated = false;
        for (RoomSlot slot : room.getSlots()) {
            if (userId.equals(slot.getUserId())) {
                slot.setOnline(false);
                updated = true;
                break;
            }
        }

        if (room.getStatus() == GameStatus.ACTIVE && room.getGameState() != null) {
            PlayerState ps = room.getGameState().getPlayers().get(getPlayerColor(room, userId));
            if (ps != null) {
                ps.setOnline(false);
                updated = true;
            }
        }

        if (!updated) return;

        saveRoom(room);

        if (room.getStatus() == GameStatus.LOBBY) {
            broadcastLobbyState(room);
        } else {
            broadcastGameState(room, Collections.emptyList());
        }

        // Schedule 60-second grace timer
        String graceTimerKey = "grace:" + roomCode + ":" + userId;
        ScheduledFuture<?> future = scheduler.schedule(() -> {
            handleDisconnectGraceExpiry(roomCode, userId);
        }, 60, TimeUnit.SECONDS);

        activeTimers.put(graceTimerKey, future);
    }

    public void handlePlayerReconnect(String roomCode, String userId) {
        LudoRoom room = getRoom(roomCode);
        if (room == null) return;

        // Cancel grace timer
        String graceTimerKey = "grace:" + roomCode + ":" + userId;
        ScheduledFuture<?> future = activeTimers.remove(graceTimerKey);
        if (future != null) {
            future.cancel(true);
        }

        boolean updated = false;
        for (RoomSlot slot : room.getSlots()) {
            if (userId.equals(slot.getUserId())) {
                slot.setOnline(true);
                updated = true;
                break;
            }
        }

        if (room.getStatus() == GameStatus.ACTIVE && room.getGameState() != null) {
            PlayerState ps = room.getGameState().getPlayers().get(getPlayerColor(room, userId));
            if (ps != null) {
                ps.setOnline(true);
                updated = true;
            }
        }

        if (!updated) return;

        saveRoom(room);

        if (room.getStatus() == GameStatus.LOBBY) {
            broadcastLobbyState(room);
        } else {
            broadcastGameState(room, Collections.emptyList());
        }
    }

    private void handleDisconnectGraceExpiry(String roomCode, String userId) {
        LudoRoom room = getRoom(roomCode);
        if (room == null) return;

        boolean stillOffline = false;
        for (RoomSlot slot : room.getSlots()) {
            if (userId.equals(slot.getUserId()) && !slot.isOnline()) {
                stillOffline = true;
                break;
            }
        }

        if (!stillOffline) return;

        if (room.getStatus() == GameStatus.ACTIVE && room.getGameState() != null) {
            GameState gameState = room.getGameState();
            PlayerState player = gameState.getPlayers().get(getPlayerColor(room, userId));
            if (player != null) {
                player.setAi(true); // Takeover by AI
                saveRoom(room);
                broadcastGameState(room, Collections.emptyList());

                // Trigger AI action if it's currently their turn
                if (gameState.getActiveColor() == player.getColor() && "WAITING_FOR_ROLL".equals(gameState.getTurnPhase())) {
                    triggerAiMove(roomCode);
                }
            }
        } else if (room.getStatus() == GameStatus.LOBBY) {
            room.getSlots().removeIf(slot -> userId.equals(slot.getUserId()));
            if (userId.equals(room.getHostId())) {
                if (!room.getSlots().isEmpty()) {
                    room.setHostId(room.getSlots().get(0).getUserId());
                } else {
                    redisTemplate.delete("ludo:room:" + roomCode);
                    return;
                }
            }
            saveRoom(room);
            broadcastLobbyState(room);
        }
    }

    public void scheduleTurnTimer(String roomCode, int expectedSequenceNumber) {
        cancelTurnTimer(roomCode);

        ScheduledFuture<?> future = scheduler.schedule(() -> {
            handleTurnTimeout(roomCode, expectedSequenceNumber);
        }, 15, TimeUnit.SECONDS);

        activeTimers.put(roomCode, future);
    }

    public void cancelTurnTimer(String roomCode) {
        ScheduledFuture<?> existing = activeTimers.remove(roomCode);
        if (existing != null) {
            existing.cancel(true);
        }
    }

    private void handleTurnTimeout(String roomCode, int expectedSequenceNumber) {
        String lockKey = "lock:timer:" + roomCode + ":" + expectedSequenceNumber;
        Boolean lockAcquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "locked", Duration.ofSeconds(5));
        if (!Boolean.TRUE.equals(lockAcquired)) {
            return; // Already executed on another node
        }

        LudoRoom room = getRoom(roomCode);
        if (room == null || room.getStatus() != GameStatus.ACTIVE || room.getGameState() == null) {
            return;
        }

        GameState gameState = room.getGameState();
        if (gameState.getSequenceNumber() != expectedSequenceNumber) {
            return; // Action already processed
        }

        try {
            Color activeColor = gameState.getActiveColor();
            PlayerState activePlayer = gameState.getPlayers().get(activeColor);
            String activeUserId = activePlayer.getUserId();

            Map<String, Integer> timeoutsMap = room.getConsecutiveTimeoutsMap();
            if (timeoutsMap == null) {
                timeoutsMap = new HashMap<>();
                room.setConsecutiveTimeoutsMap(timeoutsMap);
            }

            int count = timeoutsMap.getOrDefault(activeUserId, 0) + 1;
            timeoutsMap.put(activeUserId, count);

            if (count >= 3) {
                activePlayer.setAi(true); // AI takeover
                timeoutsMap.put(activeUserId, 0);
            }

            LudoEngine.EngineResult result;
            List<GameEffect> effects = new ArrayList<>();

            if ("WAITING_FOR_ROLL".equals(gameState.getTurnPhase())) {
                // Auto roll
                result = LudoEngine.rollDice(gameState, null);
                GameState s1 = result.getNextState();
                effects.addAll(result.getEffects());

                if ("WAITING_FOR_MOVE".equals(s1.getTurnPhase())) {
                    ValidMove bestMove = LudoEngine.selectBestMove(s1.getAvailableMoves());
                    LudoEngine.EngineResult moveResult = LudoEngine.moveToken(s1, bestMove.getTokenIndex());
                    room.setGameState(moveResult.getNextState());
                    effects.addAll(moveResult.getEffects());
                } else {
                    room.setGameState(s1);
                }
            } else {
                // Auto move
                ValidMove bestMove = LudoEngine.selectBestMove(gameState.getAvailableMoves());
                result = LudoEngine.moveToken(gameState, bestMove.getTokenIndex());
                room.setGameState(result.getNextState());
                effects.addAll(result.getEffects());
            }

            saveRoom(room);
            broadcastGameState(room, effects);

            if (room.getStatus() == GameStatus.ACTIVE) {
                scheduleTurnTimer(roomCode, room.getGameState().getSequenceNumber());
            } else if (room.getStatus() == GameStatus.COMPLETED) {
                saveMatchToDatabase(room);
            }
        } catch (Exception e) {
            System.err.println("Failed to execute auto timeout: " + e.getMessage());
        }
    }

    public void triggerAiMove(String roomCode) {
        scheduler.schedule(() -> {
            executeAiMove(roomCode);
        }, 1, TimeUnit.SECONDS);
    }

    private void executeAiMove(String roomCode) {
        LudoRoom room = getRoom(roomCode);
        if (room == null || room.getStatus() != GameStatus.ACTIVE || room.getGameState() == null) {
            return;
        }

        GameState gameState = room.getGameState();
        Color activeColor = gameState.getActiveColor();
        PlayerState activePlayer = gameState.getPlayers().get(activeColor);

        if (activePlayer == null || !activePlayer.isAi()) {
            return;
        }

        // Roll or move
        try {
            LudoEngine.EngineResult result;
            List<GameEffect> effects = new ArrayList<>();

            if ("WAITING_FOR_ROLL".equals(gameState.getTurnPhase())) {
                result = LudoEngine.rollDice(gameState, null);
                GameState s1 = result.getNextState();
                effects.addAll(result.getEffects());

                if ("WAITING_FOR_MOVE".equals(s1.getTurnPhase())) {
                    ValidMove bestMove = LudoEngine.selectBestMove(s1.getAvailableMoves());
                    LudoEngine.EngineResult moveResult = LudoEngine.moveToken(s1, bestMove.getTokenIndex());
                    room.setGameState(moveResult.getNextState());
                    effects.addAll(moveResult.getEffects());
                } else {
                    room.setGameState(s1);
                }
            } else {
                ValidMove bestMove = LudoEngine.selectBestMove(gameState.getAvailableMoves());
                result = LudoEngine.moveToken(gameState, bestMove.getTokenIndex());
                room.setGameState(result.getNextState());
                effects.addAll(result.getEffects());
            }

            saveRoom(room);
            broadcastGameState(room, effects);

            if (room.getStatus() == GameStatus.ACTIVE) {
                scheduleTurnTimer(roomCode, room.getGameState().getSequenceNumber());
            } else if (room.getStatus() == GameStatus.COMPLETED) {
                saveMatchToDatabase(room);
            }
        } catch (Exception e) {
            System.err.println("Failed to execute AI turn: " + e.getMessage());
        }
    }

    public void saveMatchToDatabase(LudoRoom room) {
        try {
            Match match = new Match();
            match.setId(UUID.fromString(room.getGameState().getGameId()));
            match.setRoomCode(room.getRoomCode());
            match.setStatus(GameStatus.COMPLETED);
            match.setStartTime(OffsetDateTime.now().minusMinutes(5));
            match.setEndTime(OffsetDateTime.now());

            Color winnerColor = room.getGameState().getWinnerColor();
            PlayerState winnerPlayer = room.getGameState().getPlayers().get(winnerColor);
            if (winnerPlayer != null && winnerPlayer.getUserId() != null && !winnerPlayer.getUserId().startsWith("user-")) {
                userRepository.findById(UUID.fromString(winnerPlayer.getUserId())).ifPresent(match::setWinner);
            }

            match.setGameStateSnapshot(objectMapper.writeValueAsString(room.getGameState()));
            matchRepository.save(match);

            for (RoomSlot slot : room.getSlots()) {
                MatchPlayer mp = new MatchPlayer();
                mp.setId(UUID.randomUUID());
                mp.setMatch(match);

                User user = null;
                if (slot.getUserId() != null && !slot.getUserId().startsWith("user-")) {
                    Optional<User> userOpt = userRepository.findById(UUID.fromString(slot.getUserId()));
                    if (userOpt.isPresent()) {
                        user = userOpt.get();
                        mp.setUser(user);
                    }
                }

                mp.setPlayerColor(slot.getColor());
                PlayerState ps = room.getGameState().getPlayers().get(slot.getColor());
                if (ps != null) {
                    mp.setRankPosition(ps.getFinishOrder() != null ? ps.getFinishOrder() : 4);
                } else {
                    mp.setRankPosition(4);
                }
                mp.setTotalKills(0);
                mp.setTotalDeaths(0);

                matchPlayerRepository.save(mp);

                if (user != null) {
                    int oldMmr = user.getRatingMmr();
                    int mmrChange = (winnerColor == slot.getColor()) ? 32 : -16;
                    user.setRatingMmr(Math.max(0, oldMmr + mmrChange));
                    userRepository.save(user);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to persist match: " + e.getMessage());
        }
    }

    public Color getPlayerColor(LudoRoom room, String userId) {
        for (RoomSlot slot : room.getSlots()) {
            if (userId.equals(slot.getUserId())) {
                return slot.getColor();
            }
        }
        return null;
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder code = new StringBuilder();
        Random rand = new Random();
        for (int i = 0; i < 6; i++) {
            code.append(chars.charAt(rand.nextInt(chars.length())));
        }
        return code.toString();
    }

    private String generateUniqueRoomCode() {
        String code;
        do {
            code = generateRoomCode();
        } while (Boolean.TRUE.equals(redisTemplate.hasKey("ludo:room:" + code)));
        return code;
    }

    private Map<String, Object> createEnvelope(String eventType, Object payload, int sequenceNumber) {
        Map<String, Object> env = new HashMap<>();
        env.put("eventId", UUID.randomUUID().toString());
        env.put("eventType", eventType);
        env.put("type", eventType);
        env.put("timestamp", java.time.Instant.now().toString());
        env.put("sequenceNumber", sequenceNumber);
        env.put("payload", payload);
        env.put("data", payload);
        return env;
    }

    private void broadcastLobbyState(LudoRoom room) {
        Map<String, Object> env = createEnvelope("ROOM_STATE_UPDATE", room, 0);
        broadcast("/topic/room/" + room.getRoomCode(), env);
    }

    public void broadcastGameState(LudoRoom room, List<GameEffect> effects) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("gameState", room.getGameState());
        payload.put("effects", effects);

        Map<String, Object> env = createEnvelope("GAME_STATE_UPDATE", payload, room.getGameState().getSequenceNumber());
        broadcast("/topic/room/" + room.getRoomCode(), env);
    }

    public void broadcast(String destination, Object payload) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(payload);
            RedisPubSubMessage pubSubMessage = new RedisPubSubMessage(destination, jsonPayload);
            String jsonMessage = objectMapper.writeValueAsString(pubSubMessage);
            redisTemplate.convertAndSend(RedisConfig.ROOM_EVENTS_TOPIC, jsonMessage);
        } catch (Exception e) {
            System.err.println("Failed to publish cross-node broadcast: " + e.getMessage());
        }
    }
}
