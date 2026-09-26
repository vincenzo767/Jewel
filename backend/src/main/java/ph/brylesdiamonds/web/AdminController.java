package ph.brylesdiamonds.web;

import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.*;
import ph.brylesdiamonds.model.*;
import ph.brylesdiamonds.repo.ChatMessageRepository;
import ph.brylesdiamonds.repo.OrderRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.repo.UserRepository;
import ph.brylesdiamonds.security.AuthStateCache;
import ph.brylesdiamonds.security.CurrentUser;
import ph.brylesdiamonds.service.ChatService;
import ph.brylesdiamonds.service.OrderService;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** The owner's console: dashboard, reservations, customers and the chat inbox. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    public static final int LOW_STOCK = 3;

    private final ProductRepository products;
    private final OrderRepository orders;
    private final UserRepository users;
    private final ChatMessageRepository messages;
    private final OrderService orderService;
    private final ChatService chat;
    private final CurrentUser current;
    private final JdbcTemplate jdbc;
    private final AuthStateCache authStates;

    public AdminController(ProductRepository products, OrderRepository orders, UserRepository users,
                           ChatMessageRepository messages, OrderService orderService, ChatService chat,
                           CurrentUser current, JdbcTemplate jdbc, AuthStateCache authStates) {
        this.products = products;
        this.orders = orders;
        this.users = users;
        this.messages = messages;
        this.orderService = orderService;
        this.chat = chat;
        this.current = current;
        this.jdbc = jdbc;
        this.authStates = authStates;
    }

    // ---------- Dashboard ----------

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public StatsDto stats() {
        List<Product> all = products.findAll();
        BigDecimal value = all.stream().map(p -> p.getPrice().multiply(BigDecimal.valueOf(p.getStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<CategoryStat> byCategory = Arrays.stream(Category.values()).map(c -> {
            List<Product> in = all.stream().filter(p -> p.getCategory() == c).toList();
            return new CategoryStat(c, in.size(), in.stream().mapToLong(Product::getStock).sum(),
                    in.stream().map(p -> p.getPrice().multiply(BigDecimal.valueOf(p.getStock())))
                            .reduce(BigDecimal.ZERO, BigDecimal::add));
        }).toList();
        // Every remaining count in one round trip.
        record Counts(long customers, long pending, long open, BigDecimal revenue, long unread) {}
        Counts n = jdbc.queryForObject("""
                select (select count(*) from users where role = 'CUSTOMER'),
                       (select count(*) from orders where status = 'PENDING'),
                       (select count(*) from orders where status in ('PENDING', 'CONFIRMED', 'READY_FOR_PICKUP')),
                       (select coalesce(sum(total), 0) from orders where status = 'COMPLETED'),
                       (select count(*) from chat_messages where from_admin = false and read_by_recipient = false)""",
                (rs, i) -> new Counts(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getBigDecimal(4), rs.getLong(5)));
        // Low-stock list comes from the products already loaded, not another query.
        List<ProductDto> lowStock = all.stream().filter(p -> p.getStock() <= LOW_STOCK)
                .sorted(Comparator.comparingInt(Product::getStock)).limit(6)
                .map(p -> ProductDto.of(p, false)).toList();
        return new StatsDto(all.size(), all.stream().filter(Product::isActive).count(),
                all.stream().mapToLong(Product::getStock).sum(), value,
                all.stream().filter(p -> p.getStock() > 0 && p.getStock() <= LOW_STOCK).count(),
                all.stream().filter(p -> p.getStock() == 0).count(),
                n.customers(), n.pending(), n.open(), n.revenue(), n.unread(), byCategory, lowStock,
                orders.findRecent(PageRequest.of(0, 6)).stream().map(OrderDto::of).toList());
    }

    /** The sidebar badges, in a single query, so they can be refreshed cheaply and often. */
    @GetMapping("/counts")
    @Transactional(readOnly = true)
    public Map<String, Long> counts() {
        return jdbc.queryForObject("""
                select (select count(*) from chat_messages where from_admin = false and read_by_recipient = false) as unread,
                       (select count(*) from orders where status = 'PENDING') as pending,
                       (select count(*) from products where stock <= ?) as low_stock""",
                (rs, i) -> Map.of("unread", rs.getLong(1), "pending", rs.getLong(2), "lowStock", rs.getLong(3)),
                LOW_STOCK);
    }

    // ---------- Reservations ----------

    @GetMapping("/orders")
    @Transactional(readOnly = true)
    public List<OrderDto> orders() {
        return orders.findAllWithCustomer().stream().map(OrderDto::of).toList();
    }

    @PatchMapping("/orders/{id}/status")
    @Transactional
    public OrderDto status(@PathVariable Long id, @Valid @RequestBody StatusUpdate req) {
        return OrderDto.of(orderService.updateStatus(id, req.status(), current.get(), req.paymentMethod(), req.paymentReference()));
    }

    @PatchMapping("/orders/{id}/hold")
    @Transactional
    public OrderDto extendHold(@PathVariable Long id, @Valid @RequestBody HoldExtension req) {
        return OrderDto.of(orderService.extendHold(id, req.days()));
    }

    // ---------- Customers ----------

    @GetMapping("/customers")
    @Transactional(readOnly = true)
    public List<CustomerDto> customers() {
        // Reservation totals for every customer in one query, instead of two queries per customer.
        Map<Long, Object[]> totals = new HashMap<>();
        for (Object[] row : orders.totalsPerCustomer()) totals.put((Long) row[0], row);
        return users.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER).stream().map(u -> {
            Object[] t = totals.get(u.getId());
            return customer(u, t == null ? 0 : (Long) t[1], t == null ? BigDecimal.ZERO : (BigDecimal) t[2]);
        }).toList();
    }

    @PatchMapping("/customers/{id}/status")
    @Transactional
    public CustomerDto setEnabled(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        User u = users.findById(id).filter(x -> x.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> ApiException.notFound("Customer"));
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        u.setEnabled(enabled);
        // Suspending also ends any open session immediately.
        if (!enabled) u.setTokenVersion(u.getTokenVersion() + 1);
        authStates.evict(u.getId());
        return customer(u);
    }

    private CustomerDto customer(User u) {
        return customer(u, orders.countByCustomerId(u.getId()), orders.spentBy(u.getId()));
    }

    private CustomerDto customer(User u, long orderCount, BigDecimal spent) {
        return new CustomerDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getAddress(),
                u.getAvatarUrl(), u.isEnabled(), u.getCreatedAt(), u.getLastLoginAt(),
                orderCount, spent);
    }

    // ---------- Chat inbox ----------

    @GetMapping("/chat/conversations")
    public List<ConversationDto> conversations() {
        return chat.conversations();
    }

    @GetMapping("/chat/{customerId}/messages")
    public List<ChatMessageDto> thread(@PathVariable Long customerId) {
        requireCustomer(customerId);
        return chat.thread(customerId);
    }

    @PostMapping("/chat/{customerId}/messages")
    public ChatMessageDto reply(@PathVariable Long customerId, @Valid @RequestBody ChatSend req) {
        return chat.send(requireCustomer(customerId), current.get(), req.content(), req.productId());
    }

    @PostMapping("/chat/{customerId}/read")
    public Map<String, Object> read(@PathVariable Long customerId) {
        requireCustomer(customerId);
        chat.markRead(customerId, true);
        return Map.of("ok", true);
    }

    private User requireCustomer(Long id) {
        return users.findById(id).filter(u -> u.getRole() == Role.CUSTOMER)
                .orElseThrow(() -> ApiException.notFound("Customer"));
    }
}
