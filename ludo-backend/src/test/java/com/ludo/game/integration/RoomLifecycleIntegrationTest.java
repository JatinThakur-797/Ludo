package com.ludo.game.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.config.RedisConfig;
import com.ludo.game.config.RedisMessageListener;
import com.ludo.game.dto.LudoRoom;
import com.ludo.game.dto.RoomSlot;
import com.ludo.game.dto.RoomSettings;
import com.ludo.game.model.entity.User;
import com.ludo.game.model.enums.GameStatus;
import com.ludo.game.repository.UserRepository;
import com.ludo.game.security.JwtTokenProvider;
import com.ludo.game.security.UserPrincipal;
import com.ludo.game.service.RoomService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration"
    }
)
@ActiveProfiles("test")
public class RoomLifecycleIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private RedisMessageListener redisMessageListener;

    @Autowired
    private RoomService roomService;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    private User hostUser;
    private User guestUser;
    private String hostJwt;
    private String guestJwt;
    private WebSocketStompClient stompClient;

    private final Map<String, Object> redisStorage = new ConcurrentHashMap<>();

    @BeforeEach
    void setUp() {
        redisStorage.clear();
        userRepository.deleteAll();

        // 1. Seed two test users
        hostUser = User.builder()
                .id(UUID.randomUUID())
                .email("host@example.com")
                .passwordHash("password")
                .displayName("RoomHost")
                .ratingMmr(1200)
                .build();

        guestUser = User.builder()
                .id(UUID.randomUUID())
                .email("guest@example.com")
                .passwordHash("password")
                .displayName("RoomGuest")
                .ratingMmr(1200)
                .build();

        userRepository.save(hostUser);
        userRepository.save(guestUser);

        // 2. Generate JWTs
        hostJwt = jwtTokenProvider.generateAccessToken(UserPrincipal.create(hostUser));
        guestJwt = jwtTokenProvider.generateAccessToken(UserPrincipal.create(guestUser));

        // 3. Mock Redis operations
        ValueOperations<String, Object> valueOps = mock(ValueOperations.class);

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return redisStorage.get(key);
        }).when(valueOps).get(anyString());

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            Object val = invocation.getArgument(1);
            redisStorage.put(key, val);
            return null;
        }).when(valueOps).set(anyString(), any());

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            Object val = invocation.getArgument(1);
            if (redisStorage.containsKey(key)) {
                return false;
            }
            redisStorage.put(key, val);
            return true;
        }).when(valueOps).setIfAbsent(anyString(), any(), any(Duration.class));

        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return redisStorage.containsKey(key);
        }).when(redisTemplate).hasKey(anyString());

        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return redisStorage.remove(key) != null;
        }).when(redisTemplate).delete(anyString());

        // 4. Redirect Redis Pub/Sub directly to local listener for in-memory loopback
        doAnswer(invocation -> {
            String topic = invocation.getArgument(0);
            Object rawMessage = invocation.getArgument(1);
            
            byte[] bodyBytes;
            if (rawMessage instanceof String) {
                bodyBytes = ((String) rawMessage).getBytes();
            } else {
                ObjectMapper mapper = new ObjectMapper();
                bodyBytes = mapper.writeValueAsBytes(rawMessage);
            }

            org.springframework.data.redis.connection.Message redisMessage = 
                    new org.springframework.data.redis.connection.DefaultMessage(topic.getBytes(), bodyBytes);
            redisMessageListener.onMessage(redisMessage, null);
            return null;
        }).when(redisTemplate).convertAndSend(anyString(), any());

        // 5. Initialize STOMP client
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
        stompClient.setDefaultHeartbeat(new long[]{0, 0});
    }

    @AfterEach
    void tearDown() {
        if (stompClient != null) {
            stompClient.stop();
        }
        userRepository.deleteAll();
    }

    @Test
    void testRoomLifecycle_LobbyToStart() throws Exception {
        // 1. Create Room via REST/Service level
        RoomSettings settings = new RoomSettings(2, 15, true);
        LudoRoom room = roomService.createRoom(hostUser.getId(), hostUser.getDisplayName(), settings);
        assertNotNull(room);
        String roomCode = room.getRoomCode();
        assertEquals(GameStatus.LOBBY, room.getStatus());

        // 2. Connect Host Stomp Session
        String hostUrl = "ws://localhost:" + port + "/ws?token=" + hostJwt;
        CompletableFuture<StompSession> hostConnFuture = new CompletableFuture<>();
        stompClient.connectAsync(hostUrl, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                hostConnFuture.complete(session);
            }
            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                hostConnFuture.completeExceptionally(exception);
            }
        });
        StompSession hostSession = hostConnFuture.get(3, TimeUnit.SECONDS);
        assertNotNull(hostSession);

        // 3. Connect Guest Stomp Session
        String guestUrl = "ws://localhost:" + port + "/ws?token=" + guestJwt;
        CompletableFuture<StompSession> guestConnFuture = new CompletableFuture<>();
        stompClient.connectAsync(guestUrl, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                guestConnFuture.complete(session);
            }
            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                guestConnFuture.completeExceptionally(exception);
            }
        });
        StompSession guestSession = guestConnFuture.get(3, TimeUnit.SECONDS);
        assertNotNull(guestSession);

        // 4. Set up message queue to collect events on the Room Topic
        LinkedBlockingQueue<Map<String, Object>> topicEvents = new LinkedBlockingQueue<>();
        
        StompFrameHandler topicHandler = new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }
            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                topicEvents.add((Map<String, Object>) payload);
            }
        };

        hostSession.subscribe("/topic/room/" + roomCode, topicHandler);

        // 5. Host joins room over WebSocket
        hostSession.send("/app/room/" + roomCode + "/join", new HashMap<>());
        
        // Host should see 1 user in slots. Let's wait for the update.
        Map<String, Object> event1 = topicEvents.poll(3, TimeUnit.SECONDS);
        assertNotNull(event1);
        assertEquals("ROOM_STATE_UPDATE", event1.get("type"));

        // 6. Guest joins room over WebSocket
        guestSession.send("/app/room/" + roomCode + "/join", new HashMap<>());

        // We should receive another ROOM_STATE_UPDATE
        Map<String, Object> event2 = topicEvents.poll(3, TimeUnit.SECONDS);
        assertNotNull(event2);
        assertEquals("ROOM_STATE_UPDATE", event2.get("type"));

        // Validate slots contain 2 users now
        Map<String, Object> roomData = (Map<String, Object>) event2.get("data");
        List<Map<String, Object>> slots = (List<Map<String, Object>>) roomData.get("slots");
        assertEquals(2, slots.size());

        // 7. Guest toggles ready state
        Map<String, Object> readyPayload = new HashMap<>();
        readyPayload.put("ready", true);
        guestSession.send("/app/room/" + roomCode + "/ready", readyPayload);

        // Wait for ready state update
        Map<String, Object> event3 = topicEvents.poll(3, TimeUnit.SECONDS);
        assertNotNull(event3);
        assertEquals("ROOM_STATE_UPDATE", event3.get("type"));
        
        Map<String, Object> roomDataReady = (Map<String, Object>) event3.get("data");
        List<Map<String, Object>> slotsReady = (List<Map<String, Object>>) roomDataReady.get("slots");
        Map<String, Object> guestSlot = slotsReady.stream()
                .filter(s -> guestUser.getDisplayName().equals(s.get("displayName")))
                .findFirst()
                .orElse(null);
        assertNotNull(guestSlot);
        assertEquals(true, guestSlot.get("ready"));

        // 8. Host launches game
        hostSession.send("/app/room/" + roomCode + "/start", new HashMap<>());

        // Wait for game start broadcast
        Map<String, Object> event4 = topicEvents.poll(3, TimeUnit.SECONDS);
        assertNotNull(event4);
        assertEquals("GAME_STARTED", event4.get("type"));
        
        Map<String, Object> startedRoomData = (Map<String, Object>) event4.get("data");
        assertEquals("ACTIVE", startedRoomData.get("status"));
        assertNotNull(startedRoomData.get("gameState"));
    }
}
