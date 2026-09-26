package ph.brylesdiamonds.security;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ph.brylesdiamonds.model.Role;
import ph.brylesdiamonds.repo.UserRepository;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Remembers each signed-in user's session state (enabled, role, token version) for a short time,
 * so authenticating a request doesn't cost a database round trip every time. Anything that changes
 * that state (sign-out, password change, suspension) evicts the entry once its transaction commits,
 * so revocation still takes effect on the very next request.
 */
@Component
public class AuthStateCache {
    public record AuthState(Long id, String email, Role role, boolean enabled, int tokenVersion) {}

    private record Entry(AuthState state, long loadedAt) {}

    private static final long TTL_MS = Duration.ofSeconds(60).toMillis();

    private final UserRepository users;
    private final Map<Long, Entry> cache = new ConcurrentHashMap<>();

    public AuthStateCache(UserRepository users) {
        this.users = users;
    }

    public Optional<AuthState> get(long id) {
        long now = System.currentTimeMillis();
        Entry e = cache.get(id);
        if (e != null && now - e.loadedAt() < TTL_MS) return Optional.ofNullable(e.state());
        AuthState state = users.findById(id)
                .map(u -> new AuthState(u.getId(), u.getEmail(), u.getRole(), u.isEnabled(), u.getTokenVersion()))
                .orElse(null);
        if (cache.size() > 10_000) cache.clear();
        cache.put(id, new Entry(state, now));
        return Optional.ofNullable(state);
    }

    /** Forgets a user's cached state, after the current transaction commits (or right away if there is none). */
    public void evict(long id) {
        cache.remove(id);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    cache.remove(id);
                }
            });
        }
    }
}
