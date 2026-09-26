package ph.brylesdiamonds.security;

import ph.brylesdiamonds.model.Role;

import java.security.Principal;

/**
 * The authenticated caller. {@link #getName()} is the user id, which is also the key
 * for WebSocket user destinations (/user/{id}/queue/...).
 */
public record AuthUser(Long id, String email, Role role) implements Principal {
    @Override
    public String getName() { return String.valueOf(id); }

    public boolean isAdmin() { return role == Role.ADMIN; }
}
