package com.ludo.game.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.config.RedisConfig;
import com.ludo.game.config.RedisMessageListener;
import com.ludo.game.dto.RedisPubSubMessage;
import com.ludo.game.model.entity.User;
import com.ludo.game.repository.UserRepository;
import com.ludo.game.security.JwtTokenProvider;
import com.ludo.game.security.UserPrincipal;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration,org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration"
    }
)
@ActiveProfiles("test")
public class WebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private RedisMessageListener redisMessageListener;

    @MockBean
    private RedisTemplate<String, Object> redisTemplate;

    private User testUser;
    private String jwtToken;
    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUp() {
        // Delete user table and seed test user
        userRepository.deleteAll();
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("ws-test@example.com")
                .passwordHash("hashedpassword")
                .displayName("WsTester")
                .ratingMmr(1200)
                .build();
        userRepository.save(testUser);

        // Generate valid JWT
        UserPrincipal principal = UserPrincipal.create(testUser);
        jwtToken = jwtTokenProvider.generateAccessToken(principal);

        // Initialize STOMP client
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
        stompClient.setDefaultHeartbeat(new long[]{0, 0});

        // Redirect Redis Pub/Sub directly to local listener for in-memory loopback
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

            // Construct standard spring redis Message and trigger local listener
            org.springframework.data.redis.connection.Message redisMessage = 
                    new org.springframework.data.redis.connection.DefaultMessage(topic.getBytes(), bodyBytes);
            redisMessageListener.onMessage(redisMessage, null);
            return null;
        }).when(redisTemplate).convertAndSend(anyString(), any());
    }

    @AfterEach
    void tearDown() {
        if (stompClient != null) {
            stompClient.stop();
        }
        userRepository.deleteAll();
    }

    @Test
    void webSocket_ChatBroadcast_Success() throws Exception {
        String wsUrl = "ws://localhost:" + port + "/ws?token=" + jwtToken;

        CompletableFuture<StompSession> sessionFuture = new CompletableFuture<>();
        stompClient.connectAsync(wsUrl, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                sessionFuture.complete(session);
            }

            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                sessionFuture.completeExceptionally(exception);
            }
        });

        // 1. Await STOMP Connection
        StompSession session = sessionFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(session);

        // 2. Subscribe to Chat topic
        String roomCode = "test-room";
        CompletableFuture<Map<String, Object>> chatBroadcastFuture = new CompletableFuture<>();
        session.subscribe("/topic/room/" + roomCode, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                chatBroadcastFuture.complete((Map<String, Object>) payload);
            }
        });

        // 3. Publish Chat Message to /app/room/{roomCode}/chat
        Map<String, Object> chatRequest = new HashMap<>();
        chatRequest.put("content", "Hello Ludo World!");
        session.send("/app/room/" + roomCode + "/chat", chatRequest);

        // 4. Validate message was received on topic
        Map<String, Object> broadcastResponse = chatBroadcastFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(broadcastResponse);
        assertEquals("CHAT_MESSAGE", broadcastResponse.get("type"));
        
        Map<String, Object> responseData = (Map<String, Object>) broadcastResponse.get("data");
        assertNotNull(responseData);
        assertEquals("ws-test@example.com", responseData.get("sender"));
        assertEquals("Hello Ludo World!", responseData.get("content"));
    }

    @Test
    void webSocket_ActionEchoBroadcast_Success() throws Exception {
        String wsUrl = "ws://localhost:" + port + "/ws?token=" + jwtToken;

        CompletableFuture<StompSession> sessionFuture = new CompletableFuture<>();
        stompClient.connectAsync(wsUrl, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                sessionFuture.complete(session);
            }

            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                sessionFuture.completeExceptionally(exception);
            }
        });

        StompSession session = sessionFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(session);

        String roomCode = "action-room";
        CompletableFuture<Map<String, Object>> actionBroadcastFuture = new CompletableFuture<>();
        session.subscribe("/topic/room/" + roomCode, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                actionBroadcastFuture.complete((Map<String, Object>) payload);
            }
        });

        // Publish Action Message to /app/game/{roomCode}/action
        Map<String, Object> actionRequest = new HashMap<>();
        actionRequest.put("action", "DICE_ROLL");
        session.send("/app/game/" + roomCode + "/action", actionRequest);

        // Validate response was received on topic
        Map<String, Object> broadcastResponse = actionBroadcastFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(broadcastResponse);
        assertEquals("GAME_ACTION_ECHO", broadcastResponse.get("type"));

        Map<String, Object> responseData = (Map<String, Object>) broadcastResponse.get("data");
        assertNotNull(responseData);
        assertEquals("ws-test@example.com", responseData.get("processedBy"));
        assertEquals("DICE_ROLL", ((Map<String, Object>) responseData.get("receivedPayload")).get("action"));
    }
}
