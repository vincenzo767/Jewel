package ph.brylesdiamonds.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.LoginRequest;
import ph.brylesdiamonds.dto.Dtos.RegisterRequest;
import ph.brylesdiamonds.dto.Dtos.UserDto;
import ph.brylesdiamonds.model.Role;
import ph.brylesdiamonds.model.User;
import ph.brylesdiamonds.repo.UserRepository;
import ph.brylesdiamonds.security.AuthCookies;
import ph.brylesdiamonds.security.AuthStateCache;
import ph.brylesdiamonds.security.CurrentUser;
import ph.brylesdiamonds.security.JwtService;
import ph.brylesdiamonds.security.RateLimiter;
import ph.brylesdiamonds.service.ChatService;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private static final String INVALID = "Invalid email or password.";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthCookies cookies;
    private final RateLimiter limiter;
    private final CurrentUser current;
    private final ChatService chat;
    private final AuthStateCache authStates;
    private final int maxFailed;
    private final int lockMinutes;
    private final int ipLoginLimit;
    private final int ipRegisterLimit;
    /** Compared against when the email is unknown, so response time doesn't reveal which emails exist. */
    private final String dummyHash;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, AuthCookies cookies,
                          RateLimiter limiter, CurrentUser current, ChatService chat, AuthStateCache authStates,
                          @Value("${app.security.max-failed-logins:5}") int maxFailed,
                          @Value("${app.security.lock-minutes:15}") int lockMinutes,
                          @Value("${app.security.ip-login-attempts-per-15min:30}") int ipLoginLimit,
                          @Value("${app.security.ip-registrations-per-hour:10}") int ipRegisterLimit) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.cookies = cookies;
        this.limiter = limiter;
        this.current = current;
        this.chat = chat;
        this.authStates = authStates;
        this.maxFailed = maxFailed;
        this.lockMinutes = lockMinutes;
        this.ipLoginLimit = ipLoginLimit;
        this.ipRegisterLimit = ipRegisterLimit;
        this.dummyHash = encoder.encode("not-a-real-password-" + System.nanoTime());
    }

    /** Returns the signed-in user (if any) and makes sure the browser holds a CSRF token. */
    @GetMapping("/session")
    public Map<String, Object> session(CsrfToken csrf) {
        csrf.getToken();
        return current.principal()
                .flatMap(p -> users.findById(p.id()))
                .<Map<String, Object>>map(u -> Map.of("authenticated", true, "user", UserDto.of(u)))
                .orElseGet(() -> Map.of("authenticated", false));
    }

    @PostMapping("/login")
    @Transactional(noRollbackFor = ApiException.class)
    public UserDto login(@Valid @RequestBody LoginRequest req, HttpServletRequest http, HttpServletResponse res) {
        if (!limiter.tryAcquire("login:" + http.getRemoteAddr(), ipLoginLimit, Duration.ofMinutes(15))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many sign-in attempts. Please wait a few minutes.");
        }
        String email = req.email().strip().toLowerCase(Locale.ROOT);
        User user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            encoder.matches(req.password(), dummyHash);
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID);
        }
        if (user.isLocked()) {
            long mins = Math.max(1, Duration.between(Instant.now(), user.getLockedUntil()).toMinutes() + 1);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "This account is temporarily locked after several failed attempts. Try again in " + mins + " minute" + (mins == 1 ? "" : "s") + ".");
        }
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            int failed = user.getFailedLogins() + 1;
            user.setFailedLogins(failed);
            if (failed >= maxFailed) {
                user.setFailedLogins(0);
                user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(lockMinutes)));
                log.warn("Account {} locked after {} failed sign-ins from {}", user.getId(), failed, http.getRemoteAddr());
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Too many failed attempts. This account is locked for " + lockMinutes + " minutes.");
            }
            int left = maxFailed - failed;
            throw new ApiException(HttpStatus.UNAUTHORIZED, left <= 2
                    ? INVALID + " " + left + " attempt" + (left == 1 ? "" : "s") + " left before a temporary lock."
                    : INVALID);
        }
        if (!user.isEnabled()) {
            throw ApiException.forbidden("This account has been suspended. Please contact the shop.");
        }
        user.setFailedLogins(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        cookies.set(res, jwt.issue(user), jwt.ttl());
        return UserDto.of(user);
    }

    @PostMapping("/register")
    @Transactional
    public UserDto register(@Valid @RequestBody RegisterRequest req, HttpServletRequest http, HttpServletResponse res) {
        if (!limiter.tryAcquire("register:" + http.getRemoteAddr(), ipRegisterLimit, Duration.ofHours(1))) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many new accounts from this network. Please try later.");
        }
        if (req.website() != null && !req.website().isBlank()) {
            throw ApiException.badRequest("We couldn't create your account.");
        }
        String email = req.email().strip().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists. Try signing in.");
        }
        String name = req.fullName().strip().replaceAll("\\s+", " ");
        if (req.password().toLowerCase(Locale.ROOT).contains(email.substring(0, email.indexOf('@')))) {
            throw ApiException.badRequest("Your password shouldn't contain your email name.");
        }
        User user = new User();
        user.setFullName(name);
        user.setEmail(email);
        user.setPasswordHash(encoder.encode(req.password()));
        // Self-registration always creates a customer; the role is never taken from the request.
        user.setRole(Role.CUSTOMER);
        user.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone().strip());
        user.setLastLoginAt(Instant.now());
        users.save(user);
        chat.welcome(user);
        cookies.set(res, jwt.issue(user), jwt.ttl());
        return UserDto.of(user);
    }

    /**
     * A 60-second ticket for opening the chat WebSocket directly on the API's host. Used when the site is
     * served from another host (e.g. Vercel proxying /api), since the session cookie never reaches the API's host.
     */
    @GetMapping("/ws-ticket")
    public Map<String, Object> wsTicket() {
        User u = current.get();
        return Map.of("ticket", jwt.issueWsTicket(u.getId(), u.getTokenVersion()));
    }

    /** Signs out everywhere: bumping the token version revokes every token issued so far. */
    @PostMapping("/logout")
    @Transactional
    public Map<String, Object> logout(HttpServletResponse res) {
        current.principal().flatMap(p -> users.findById(p.id()))
                .ifPresent(u -> {
                    u.setTokenVersion(u.getTokenVersion() + 1);
                    authStates.evict(u.getId());
                });
        cookies.clear(res);
        return Map.of("ok", true);
    }
}
