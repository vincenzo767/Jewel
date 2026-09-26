package ph.brylesdiamonds.web;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.*;
import ph.brylesdiamonds.model.*;
import ph.brylesdiamonds.repo.ChatMessageRepository;
import ph.brylesdiamonds.repo.OrderRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.repo.UserRepository;
import ph.brylesdiamonds.security.CurrentUser;
import ph.brylesdiamonds.service.ChatService;
import ph.brylesdiamonds.service.OrderService;

import java.math.BigDecimal;
import java.util.Arrays;
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

    public AdminController(ProductRepository products, OrderRepository orders, UserRepository users,
                           ChatMessageRepository messages, OrderService orderService, ChatService chat,
                           CurrentUser current) {
        this.products = products;
        this.orders = orders;
        this.users = users;
        this.messages = messages;
        this.orderService = orderService;
        this.chat = chat;
        this.current = current;
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
        long open = orders.countByStatus(OrderStatus.PENDING) + orders.countByStatus(OrderStatus.CONFIRMED)
                + orders.countByStatus(OrderStatus.READY_FOR_PICKUP);
        return new StatsDto(all.size(), all.stream().filter(Product::isActive).count(),
                all.stream().mapToLong(Product::getStock).sum(), value,
                all.stream().filter(p -> p.getStock() > 0 && p.getStock() <= LOW_STOCK).count(),
                all.stream().filter(p -> p.getStock() == 0).count(),
                users.countByRole(Role.CUSTOMER), orders.countByStatus(OrderStatus.PENDING), open,
                orders.completedRevenue(), messages.countUnreadForAdmins(), byCategory,
                products.findTop6ByStockLessThanEqualOrderByStockAsc(LOW_STOCK).stream().map(p -> ProductDto.of(p, false)).toList(),
                orders.findAllWithCustomer().stream().limit(6).map(OrderDto::of).toList());
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
        return OrderDto.of(orderService.updateStatus(id, req.status(), current.get()));
    }

    // ---------- Customers ----------

    @GetMapping("/customers")
    @Transactional(readOnly = true)
    public List<CustomerDto> customers() {
        return users.findByRoleOrderByCreatedAtDesc(Role.CUSTOMER).stream().map(this::customer).toList();
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
        return customer(u);
    }

    private CustomerDto customer(User u) {
        return new CustomerDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getAddress(),
                u.getAvatarUrl(), u.isEnabled(), u.getCreatedAt(), u.getLastLoginAt(),
                orders.countByCustomerId(u.getId()), orders.spentBy(u.getId()));
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
