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

    public JwtAuthFilter(JwtService jwt, AuthStateCache states) {
        this.jwt = jwt;
        this.states = states;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        AuthCookies.read(req).flatMap(jwt::parse).ifPresent(claims -> authenticate(claims, req));
        chain.doFilter(req, res);
    }

    private void authenticate(Claims claims, HttpServletRequest req) {
        long id;
        try {
            id = Long.parseLong(claims.getSubject());
        } catch (NumberFormatException e) {
            return;
        }
        Integer version = claims.get("ver", Integer.class);
        states.get(id)
                .filter(u -> u.enabled() && version != null && version == u.tokenVersion())
                .ifPresent(u -> {
                    AuthUser principal = new AuthUser(u.id(), u.email(), u.role());
                    var auth = new UsernamePasswordAuthenticationToken(principal, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + u.role().name())));
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
    }
}
