package com.ludo.game.config;

import com.ludo.game.security.JwtChannelInterceptor;
import com.ludo.game.security.WebSocketHandshakeInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor;

    // Same env var as CORS — e.g. "http://localhost:5173,https://ludo-game.vercel.app"
    @Value("${app.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOriginsRaw;

    public WebSocketConfig(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Simple in-memory message broker prefixes
        config.enableSimpleBroker("/topic", "/queue");
        // Inbound message routing prefix
        config.setApplicationDestinationPrefixes("/app");
        // User specific message routing prefix
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = java.util.Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        // Native WebSocket endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .addInterceptors(new WebSocketHandshakeInterceptor());

        // SockJS fallback configuration
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(origins)
                .addInterceptors(new WebSocketHandshakeInterceptor())
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor);
    }
}
