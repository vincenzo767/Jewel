package ph.brylesdiamonds.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Arrays;

/**
 * Real-time chat delivery. The handshake is authenticated by the session cookie (see SecurityConfig);
 * clients may only subscribe to their own user queue and cannot publish - messages are sent via REST,
 * where they are validated and persisted, then pushed here.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] origins;

    public WebSocketConfig(@Value("${app.allowed-origins}") String origins) {
        this.origins = Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toArray(String[]::new);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(origins);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue");
        registry.setUserDestinationPrefix("/user");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (acc == null || acc.getCommand() == null) return message;
                StompCommand cmd = acc.getCommand();
                if ((cmd == StompCommand.CONNECT || cmd == StompCommand.SUBSCRIBE) && acc.getUser() == null) {
                    throw new MessageDeliveryException("Not authenticated");
                }
                if (cmd == StompCommand.SUBSCRIBE) {
                    String dest = acc.getDestination();
                    if (dest == null || !dest.startsWith("/user/queue/")) {
                        throw new MessageDeliveryException("Forbidden destination");
                    }
                }
                if (cmd == StompCommand.SEND) throw new MessageDeliveryException("Publishing is not allowed");
                return message;
            }
        });
    }
}
