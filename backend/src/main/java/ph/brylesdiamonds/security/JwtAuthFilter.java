package ph.brylesdiamonds.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authenticates a request from the session cookie. Account state comes from AuthStateCache, which is
 * evicted whenever it changes, so a suspension or a logout elsewhere (token version bump) takes effect immediately.
 */
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final AuthStateCache states;
    private final AuthCookies cookies;

    public JwtAuthFilter(JwtService jwt, AuthStateCache states, AuthCookies cookies) {
        this.jwt = jwt;
        this.states = states;
        this.cookies = cookies;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        AuthCookies.read(req).flatMap(jwt::parse).ifPresent(claims -> {
            if (authenticate(claims, req) && !req.getRequestURI().endsWith("/api/auth/logout")) renewIfAging(claims, res);
        });
        chain.doFilter(req, res);
    }

    /**
     * Sliding session: once a valid session is past half its lifetime, issue a fresh cookie, so people
     * who are actively using the app aren't signed out mid-task. Idle sessions still expire on time.
     * Sign-out requests are skipped, since they end the session anyway.
     */
    private void renewIfAging(Claims claims, HttpServletResponse res) {
        if (claims.getIssuedAt() == null || res.isCommitted()) return;
        long age = System.currentTimeMillis() - claims.getIssuedAt().getTime();
        if (age < jwt.ttl().toMillis() / 2) return;
        Integer version = claims.get("ver", Integer.class);
        cookies.set(res, jwt.issue(Long.parseLong(claims.getSubject()), version), jwt.ttl());
    }

    private boolean authenticate(Claims claims, HttpServletRequest req) {
        long id;
        try {
            id = Long.parseLong(claims.getSubject());
        } catch (NumberFormatException e) {
            return false;
        }
        Integer version = claims.get("ver", Integer.class);
        return states.get(id)
                .filter(u -> u.enabled() && version != null && version == u.tokenVersion())
                .map(u -> {
                    AuthUser principal = new AuthUser(u.id(), u.email(), u.role());
                    var auth = new UsernamePasswordAuthenticationToken(principal, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + u.role().name())));
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    return true;
                })
                .orElse(false);
    }
}
