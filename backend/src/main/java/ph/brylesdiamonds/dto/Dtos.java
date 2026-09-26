package ph.brylesdiamonds.dto;

import jakarta.validation.constraints.*;
import ph.brylesdiamonds.model.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Request and response shapes for the REST API. Entities are never exposed directly. */
public final class Dtos {
    private Dtos() {}

    public static final String PASSWORD_RULE =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,72}$";
    public static final String PASSWORD_MESSAGE =
            "Password must be 8–72 characters with upper and lower case letters, a number and a symbol.";
    private static final String NAME_RULE = "^[\\p{L}][\\p{L} .'-]{1,79}$";
    private static final String PHONE_RULE = "^$|^[+0-9 ()-]{7,20}$";

    // ---------- Auth ----------

    public record LoginRequest(
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(max = 72) String password) {}

    public record RegisterRequest(
            @NotBlank @Pattern(regexp = NAME_RULE, message = "Please enter your real name (letters only).") String fullName,
            @NotBlank @Email(message = "Please enter a valid email address.") @Size(max = 160) String email,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String password,
            @Pattern(regexp = PHONE_RULE, message = "Please enter a valid phone number.") String phone,
            /* Honeypot: invisible to people, filled in by naive bots. */
            String website) {}

    public record UserDto(Long id, String fullName, String email, Role role, String phone, String address,
                          String bio, String avatarUrl, Instant createdAt) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.getPhone(),
                    u.getAddress(), u.getBio(), u.getAvatarUrl(), u.getCreatedAt());
        }
    }

    // ---------- Profile ----------

    public record ProfileUpdate(
            @NotBlank @Pattern(regexp = NAME_RULE, message = "Please enter your real name (letters only).") String fullName,
            @Pattern(regexp = PHONE_RULE, message = "Please enter a valid phone number.") String phone,
            @Size(max = 255) String address,
            @Size(max = 400) String bio) {}

    public record PasswordChange(
            @NotBlank @Size(max = 72) String currentPassword,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String newPassword) {}

    public record ProfileStats(long favorites, long cartItems, long orders, BigDecimal spent, long unreadMessages) {}

    // ---------- Products ----------

    public record ProductDto(Long id, String name, Category category, String description, String tag,
                             String metal, String stone, String carat, String clarity, List<String> sizes,
                             BigDecimal price, int stock, boolean active, boolean featured,
                             List<String> images, Instant createdAt, boolean favorite) {
        public static ProductDto of(Product p, boolean favorite) {
            List<String> sizes = p.getSizes() == null || p.getSizes().isBlank() ? List.of()
                    : List.of(p.getSizes().split("\\s*,\\s*"));
            return new ProductDto(p.getId(), p.getName(), p.getCategory(), p.getDescription(), p.getTag(),
                    p.getMetal(), p.getStone(), p.getCarat(), p.getClarity(), sizes, p.getPrice(), p.getStock(),
                    p.isActive(), p.isFeatured(), List.copyOf(p.getImages()), p.getCreatedAt(), favorite);
        }
    }

    public record ProductRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull Category category,
            @Size(max = 2000) String description,
            @Size(max = 32) String tag,
            @Size(max = 80) String metal,
            @Size(max = 120) String stone,
            @Size(max = 60) String carat,
            @Size(max = 60) String clarity,
            @Size(max = 120) @Pattern(regexp = "^[0-9A-Za-z.,/ ]*$", message = "Sizes must be a comma-separated list.") String sizes,
            @NotNull @DecimalMin(value = "0.00") @Digits(integer = 10, fraction = 2) BigDecimal price,
            @Min(0) @Max(100000) int stock,
            boolean active,
            boolean featured,
            @NotNull @Size(min = 1, max = 8, message = "Add between 1 and 8 images.") List<@NotBlank @Size(max = 400) String> images) {}

    public record StockUpdate(@Min(0) @Max(100000) int stock) {}

    // ---------- Cart ----------

    public record CartAdd(@NotNull Long productId, @Min(1) @Max(20) int quantity, @Size(max = 16) String size) {}

    public record CartQuantity(@Min(1) @Max(20) int quantity) {}

    public record CartItemDto(Long id, ProductDto product, int quantity, String size, BigDecimal lineTotal) {
        public static CartItemDto of(CartItem c) {
            return new CartItemDto(c.getId(), ProductDto.of(c.getProduct(), false), c.getQuantity(), c.getSize(),
                    c.getProduct().getPrice().multiply(BigDecimal.valueOf(c.getQuantity())));
        }
    }

    public record CartDto(List<CartItemDto> items, int count, BigDecimal subtotal) {}

    // ---------- Orders ----------

    public record CheckoutRequest(@Size(max = 500) String note, @Size(max = 40) String pickupDate) {}

    public record StatusUpdate(
            @NotNull OrderStatus status,
            /* Required when marking a reservation as collected. */
            PaymentMethod paymentMethod,
            @Size(max = 80) @Pattern(regexp = "^[\\p{L}\\p{N} ._/#-]*$", message = "The payment reference may only contain letters, numbers and - _ / . #") String paymentReference) {}

    public record HoldExtension(@Min(1) @Max(30) int days) {}

    public record OrderItemDto(Long productId, String productName, String imageUrl, BigDecimal unitPrice,
                               int quantity, String size) {
        public static OrderItemDto of(OrderItem i) {
            return new OrderItemDto(i.getProduct() == null ? null : i.getProduct().getId(), i.getProductName(),
                    i.getImageUrl(), i.getUnitPrice(), i.getQuantity(), i.getSize());
        }
    }

    public record OrderDto(Long id, String reference, OrderStatus status, BigDecimal total, String note,
                           String pickupDate, List<OrderItemDto> items, Instant createdAt, Instant updatedAt,
                           Long customerId, String customerName, String customerEmail,
                           PaymentMethod paymentMethod, String paymentReference, Instant paidAt, Instant holdUntil) {
        public static OrderDto of(Order o) {
            User c = o.getCustomer();
            return new OrderDto(o.getId(), o.getReference(), o.getStatus(), o.getTotal(), o.getNote(),
                    o.getPickupDate(), o.getItems().stream().map(OrderItemDto::of).toList(), o.getCreatedAt(),
                    o.getUpdatedAt(), c.getId(), c.getFullName(), c.getEmail(),
                    o.getPaymentMethod(), o.getPaymentReference(), o.getPaidAt(), o.getHoldUntil());
        }
    }

    // ---------- Chat ----------

    public record ChatSend(@NotBlank @Size(max = 2000) String content, Long productId) {}

    public record ChatProductDto(Long id, String name, BigDecimal price, String image) {}

    public record ChatMessageDto(Long id, Long customerId, Long senderId, String senderName, String senderAvatar,
                                 boolean fromAdmin, String content, ChatProductDto product, boolean read,
                                 Instant createdAt) {
        public static ChatMessageDto of(ChatMessage m) {
            Product p = m.getProduct();
            ChatProductDto pd = p == null ? null : new ChatProductDto(p.getId(), p.getName(), p.getPrice(),
                    p.getImages().isEmpty() ? null : p.getImages().get(0));
            return new ChatMessageDto(m.getId(), m.getCustomer().getId(), m.getSender().getId(),
                    m.getSender().getFullName(), m.getSender().getAvatarUrl(), m.isFromAdmin(), m.getContent(), pd,
                    m.isReadByRecipient(), m.getCreatedAt());
        }
    }

    public record ConversationDto(Long customerId, String customerName, String customerEmail, String customerAvatar,
                                  String lastMessage, boolean lastFromAdmin, Instant lastAt, long unread) {}

    /** Pushed over the WebSocket: either a new message or a read receipt for a conversation. */
    public record ChatEvent(String type, Long customerId, ChatMessageDto message) {}

    // ---------- Admin ----------

    public record CustomerDto(Long id, String fullName, String email, String phone, String address,
                              String avatarUrl, boolean enabled, Instant createdAt, Instant lastLoginAt,
                              long orders, BigDecimal spent) {}

    public record CategoryStat(Category category, long products, long units, BigDecimal value) {}

    public record StatsDto(long products, long activeProducts, long totalUnits, BigDecimal inventoryValue,
                           long lowStock, long soldOut, long customers, long pendingOrders, long openOrders,
                           BigDecimal revenue, long unreadMessages, List<CategoryStat> byCategory,
                           List<ProductDto> lowStockProducts, List<OrderDto> recentOrders) {}

    public record ApiError(String message, java.util.Map<String, String> fields) {}
}
