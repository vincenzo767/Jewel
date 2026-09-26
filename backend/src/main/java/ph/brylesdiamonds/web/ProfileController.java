package ph.brylesdiamonds.web;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ph.brylesdiamonds.dto.Dtos.PasswordChange;
import ph.brylesdiamonds.dto.Dtos.ProfileStats;
import ph.brylesdiamonds.dto.Dtos.ProfileUpdate;
import ph.brylesdiamonds.dto.Dtos.UserDto;
import ph.brylesdiamonds.model.User;
import ph.brylesdiamonds.repo.CartItemRepository;
import ph.brylesdiamonds.repo.ChatMessageRepository;
import ph.brylesdiamonds.repo.FavoriteRepository;
import ph.brylesdiamonds.repo.OrderRepository;
import ph.brylesdiamonds.security.AuthCookies;
import ph.brylesdiamonds.security.CurrentUser;
import ph.brylesdiamonds.security.JwtService;
import ph.brylesdiamonds.service.FileStorageService;

import java.util.Map;

/** Profile for both customers and admins. */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final CurrentUser current;
    private final PasswordEncoder encoder;
    private final FileStorageService files;
    private final JwtService jwt;
    private final AuthCookies cookies;
    private final FavoriteRepository favorites;
    private final CartItemRepository cart;
    private final OrderRepository orders;
    private final ChatMessageRepository messages;

    public ProfileController(CurrentUser current, PasswordEncoder encoder, FileStorageService files, JwtService jwt,
                             AuthCookies cookies, FavoriteRepository favorites, CartItemRepository cart,
                             OrderRepository orders, ChatMessageRepository messages) {
        this.current = current;
        this.encoder = encoder;
        this.files = files;
        this.jwt = jwt;
        this.cookies = cookies;
        this.favorites = favorites;
        this.cart = cart;
        this.orders = orders;
        this.messages = messages;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public UserDto me() {
        return UserDto.of(current.get());
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ProfileStats stats() {
        Long id = current.id();
        return new ProfileStats(favorites.findForUser(id).size(),
                cart.findForUser(id).stream().mapToInt(c -> c.getQuantity()).sum(),
                orders.countByCustomerId(id), orders.spentBy(id), messages.countUnread(id, true));
    }

    @PutMapping
    @Transactional
    public UserDto update(@Valid @RequestBody ProfileUpdate req) {
        User u = current.get();
        u.setFullName(req.fullName().strip().replaceAll("\\s+", " "));
        u.setPhone(blankToNull(req.phone()));
        u.setAddress(blankToNull(req.address()));
        u.setBio(blankToNull(req.bio()));
        return UserDto.of(u);
    }

    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    @Transactional
    public UserDto avatar(@RequestParam("file") MultipartFile file) {
        User u = current.get();
        String old = u.getAvatarUrl();
        u.setAvatarUrl(files.store(file));
        files.delete(old);
        return UserDto.of(u);
    }

    @DeleteMapping("/avatar")
    @Transactional
    public UserDto removeAvatar() {
        User u = current.get();
        files.delete(u.getAvatarUrl());
        u.setAvatarUrl(null);
        return UserDto.of(u);
    }

    /** Changing the password signs out every other device; this one gets a fresh session. */
    @PostMapping("/password")
    @Transactional
    public Map<String, Object> password(@Valid @RequestBody PasswordChange req, HttpServletResponse res) {
        User u = current.get();
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your current password is incorrect.");
        }
        if (encoder.matches(req.newPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Choose a password you haven't used here before.");
        }
        u.setPasswordHash(encoder.encode(req.newPassword()));
        u.setTokenVersion(u.getTokenVersion() + 1);
        cookies.set(res, jwt.issue(u), jwt.ttl());
        return Map.of("ok", true);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
