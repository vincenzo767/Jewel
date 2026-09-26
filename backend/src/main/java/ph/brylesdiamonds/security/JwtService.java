package ph.brylesdiamonds.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import ph.brylesdiamonds.model.User;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Service
public class JwtService {
    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String ISSUER = "brylesdiamonds";

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(@Value("${app.jwt.secret:}") String secret, @Value("${app.jwt.ttl-minutes:120}") long ttlMinutes) {
        if (secret == null || secret.isBlank()) {
            byte[] random = new byte[64];
            new SecureRandom().nextBytes(random);
            this.key = Keys.hmacShaKeyFor(random);
            log.warn("JWT_SECRET is not set - using a random key. Sessions will not survive a restart.");
        } else {
            byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32) throw new IllegalStateException("JWT_SECRET must be at least 32 bytes long.");
            this.key = Keys.hmacShaKeyFor(bytes);
        }
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    public Duration ttl() { return ttl; }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(ISSUER)
                .subject(String.valueOf(user.getId()))
                .claim("ver", user.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Optional<Claims> parse(String token) {
        try {
            return Optional.of(Jwts.parser().verifyWith(key).requireIssuer(ISSUER).build()
                    .parseSignedClaims(token).getPayload());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
