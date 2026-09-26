package ph.brylesdiamonds.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/** The session token lives in an HttpOnly, SameSite=Strict cookie so page scripts can never read it. */
@Component
public class AuthCookies {
    public static final String NAME = "BD_SESSION";

    private final boolean secure;

    public AuthCookies(@Value("${app.cookie.secure:false}") boolean secure) {
        this.secure = secure;
    }

    public boolean secure() { return secure; }

    public void set(HttpServletResponse res, String token, Duration ttl) {
        res.addHeader(HttpHeaders.SET_COOKIE, build(token, ttl).toString());
    }

    public void clear(HttpServletResponse res) {
        res.addHeader(HttpHeaders.SET_COOKIE, build("", Duration.ZERO).toString());
    }

    public static Optional<String> read(HttpServletRequest req) {
        if (req.getCookies() == null) return Optional.empty();
        for (Cookie c : req.getCookies()) {
            if (NAME.equals(c.getName()) && !c.getValue().isBlank()) return Optional.of(c.getValue());
        }
        return Optional.empty();
    }

    private ResponseCookie build(String value, Duration ttl) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path("/")
                .maxAge(ttl)
                .build();
    }
}
