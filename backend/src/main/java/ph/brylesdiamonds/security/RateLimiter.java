package ph.brylesdiamonds.security;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** A small fixed-window limiter for auth endpoints (per client IP). */
@Component
public class RateLimiter {
    private record Window(long start, int count) {}

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public boolean tryAcquire(String key, int limit, Duration window) {
        long now = System.currentTimeMillis();
        long span = window.toMillis();
        if (windows.size() > 50_000) windows.values().removeIf(w -> now - w.start() > span);
        Window w = windows.compute(key, (k, old) ->
                old == null || now - old.start() > span ? new Window(now, 1) : new Window(old.start(), old.count() + 1));
        return w.count() <= limit;
    }
}
