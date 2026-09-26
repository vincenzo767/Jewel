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
import ph.brylesdiamonds.repo.UserRepository;

import java.io.IOException;
import java.util.List;

/**
 * Authenticates a request from the session cookie. The user is re-read on every request so a
 * suspended account, a role change, or a logout elsewhere (token version bump) takes effect immediately.
 */
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
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
        users.findById(id)
                .filter(u -> u.isEnabled() && version != null && version == u.getTokenVersion())
                .ifPresent(u -> {
                    AuthUser principal = new AuthUser(u.getId(), u.getEmail(), u.getRole());
                    var auth = new UsernamePasswordAuthenticationToken(principal, null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name())));
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
    }
}
