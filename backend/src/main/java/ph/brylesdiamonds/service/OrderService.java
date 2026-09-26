package ph.brylesdiamonds.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ph.brylesdiamonds.dto.Dtos.CheckoutRequest;
import ph.brylesdiamonds.model.*;
import ph.brylesdiamonds.repo.CartItemRepository;
import ph.brylesdiamonds.repo.OrderRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.repo.UserRepository;
import ph.brylesdiamonds.web.ApiException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;

/**
 * Reservations: stock is held the moment a customer reserves and returned if the reservation is
 * cancelled or isn't collected before its hold runs out.
 */
@Service
public class OrderService {
    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final String REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    /** The shop's own calendar, for pickup dates and holds. */
    public static final ZoneId SHOP_ZONE = ZoneId.of("Asia/Manila");
    private static final int MAX_PICKUP_DAYS_AHEAD = 60;
    private final SecureRandom random = new SecureRandom();

    private final OrderRepository orders;
    private final CartItemRepository cart;
    private final ProductRepository products;
    private final UserRepository users;
    private final ChatService chat;
    private final int holdDays;
    private final int graceDaysAfterPickup;

    public OrderService(OrderRepository orders, CartItemRepository cart, ProductRepository products, UserRepository users,
                        ChatService chat,
                        @Value("${app.reservations.hold-days:7}") int holdDays,
                        @Value("${app.reservations.grace-days-after-pickup:2}") int graceDaysAfterPickup) {
        this.orders = orders;
        this.cart = cart;
        this.products = products;
        this.users = users;
        this.chat = chat;
        this.holdDays = holdDays;
        this.graceDaysAfterPickup = graceDaysAfterPickup;
    }

    /** Accepts an ISO date (yyyy-MM-dd) from tomorrow up to 60 days ahead, in the shop's time zone. */
    static LocalDate parsePickupDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        LocalDate date;
        try {
            date = LocalDate.parse(raw.strip());
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Please choose a valid pickup date.");
        }
        LocalDate today = LocalDate.now(SHOP_ZONE);
        if (!date.isAfter(today)) throw ApiException.badRequest("Please choose a pickup date from tomorrow onwards.");
        if (date.isAfter(today.plusDays(MAX_PICKUP_DAYS_AHEAD))) {
            throw ApiException.badRequest("Pickup dates can be at most " + MAX_PICKUP_DAYS_AHEAD + " days ahead.");
        }
        return date;
    }

    /** Held for holdDays after reserving, or until graceDaysAfterPickup after the chosen pickup date if later. */
    private Instant holdUntil(Instant reservedAt, LocalDate pickup) {
        Instant byReservation = reservedAt.plus(Duration.ofDays(holdDays));
        if (pickup == null) return byReservation;
        Instant byPickup = pickup.plusDays(graceDaysAfterPickup + 1L).atStartOfDay(SHOP_ZONE).toInstant();
        return byPickup.isAfter(byReservation) ? byPickup : byReservation;
    }

    @Transactional
    public Order checkout(User customer, CheckoutRequest req) {
        List<CartItem> items = cart.findForUser(customer.getId());
        if (items.isEmpty()) throw ApiException.badRequest("Your cart is empty.");

        Order order = new Order();
        order.setCustomer(customer);
        order.setReference(newReference());
        order.setNote(trim(req == null ? null : req.note()));
        LocalDate pickup = parsePickupDate(req == null ? null : req.pickupDate());
        order.setPickupDate(pickup == null ? null : pickup.toString());
        order.setHoldUntil(holdUntil(order.getCreatedAt(), pickup));
        BigDecimal total = BigDecimal.ZERO;

        for (CartItem item : items) {
            Product p = products.findLockedById(item.getProduct().getId())
                    .orElseThrow(() -> ApiException.conflict("A piece in your cart is no longer available."));
            if (!p.isActive()) throw ApiException.conflict(p.getName() + " is no longer available.");
            if (p.getStock() < item.getQuantity()) {
                throw ApiException.conflict(p.getStock() == 0 ? p.getName() + " has just sold out."
                        : "Only " + p.getStock() + " left of " + p.getName() + ".");
            }
            p.setStock(p.getStock() - item.getQuantity());
            order.addItem(new OrderItem(p, item.getQuantity(), item.getSize()));
            total = total.add(p.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        }
        order.setTotal(total);
        Order saved = orders.save(order);
        cart.deleteForUser(customer.getId());
        return saved;
    }

    @Transactional
    public Order cancelByCustomer(Long orderId, Long customerId) {
        Order o = orders.findByIdAndCustomerId(orderId, customerId).orElseThrow(() -> ApiException.notFound("Reservation"));
        if (o.getStatus() != OrderStatus.PENDING && o.getStatus() != OrderStatus.CONFIRMED) {
            throw ApiException.badRequest("This reservation can no longer be cancelled online. Please message us.");
        }
        restock(o);
        o.setStatus(OrderStatus.CANCELLED);
        return o;
    }

    @Transactional
    public Order updateStatus(Long orderId, OrderStatus next, User admin, PaymentMethod paymentMethod, String paymentReference) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Reservation"));
        OrderStatus current = o.getStatus();
        if (current == next) return o;
        if (!current.isOpen()) throw ApiException.badRequest("Completed or cancelled reservations can't be changed.");
        if (next == OrderStatus.PENDING) throw ApiException.badRequest("A reservation can't be moved back to pending.");
        if (next == OrderStatus.COMPLETED) {
            // A collected reservation counts as a sale, so it must say how the customer paid.
            if (paymentMethod == null) throw ApiException.badRequest("Choose how the customer paid.");
            o.setPaymentMethod(paymentMethod);
            o.setPaymentReference(trim(paymentReference));
            o.setPaidAt(Instant.now());
        }
        if (next == OrderStatus.CANCELLED) restock(o);
        o.setStatus(next);

        String note = switch (next) {
            case CONFIRMED -> "Your reservation " + o.getReference() + " is confirmed. We'll let you know when it's ready.";
            case READY_FOR_PICKUP -> "Good news - reservation " + o.getReference()
                    + " is ready for pickup at our V. H. Garces St shop, Talisay City.";
            case COMPLETED -> "Thank you for choosing Bryle's Diamonds. Reservation " + o.getReference()
                    + " is complete - paid by " + label(paymentMethod) + ".";
            case CANCELLED -> "Reservation " + o.getReference() + " has been cancelled. Reply here if you have any questions.";
            default -> null;
        };
        if (note != null) chat.send(o.getCustomer(), admin, note, null);
        return o;
    }

    /** Gives the customer more time to collect an open reservation. */
    @Transactional
    public Order extendHold(Long orderId, int days) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Reservation"));
        if (!o.getStatus().isOpen()) throw ApiException.badRequest("Only open reservations can be extended.");
        Instant base = o.getHoldUntil() == null || o.getHoldUntil().isBefore(Instant.now()) ? Instant.now() : o.getHoldUntil();
        o.setHoldUntil(base.plus(Duration.ofDays(days)));
        return o;
    }

    /**
     * Releases open reservations whose hold has run out: returns their stock and tells the customer.
     * Reservations made before holds existed get a hold counted from when they were placed.
     */
    @Transactional
    public int releaseOverdue() {
        Instant now = Instant.now();
        for (Order o : orders.findOpenWithoutHold()) {
            LocalDate pickup = o.getPickupDate() == null ? null : safeDate(o.getPickupDate());
            o.setHoldUntil(holdUntil(o.getCreatedAt(), pickup));
        }
        orders.flush();
        List<Order> overdue = orders.findOverdue(now);
        if (overdue.isEmpty()) return 0;
        User sender = users.findByRole(Role.ADMIN).stream().findFirst().orElse(null);
        for (Order o : overdue) {
            restock(o);
            o.setStatus(OrderStatus.CANCELLED);
            if (sender != null) {
                chat.send(o.getCustomer(), sender, "Reservation " + o.getReference() + " was not collected in time, so the "
                        + "pieces have been released back to the collection. If you'd still like them, just reply here "
                        + "and we'll check availability for you.", null);
            }
        }
        log.info("Released {} reservation(s) that were not collected in time.", overdue.size());
        return overdue.size();
    }

    private static LocalDate safeDate(String s) {
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static String label(PaymentMethod m) {
        return switch (m) {
            case GCASH -> "GCash";
            case MAYA -> "Maya";
            case BANK_TRANSFER -> "bank transfer";
            default -> m.name().toLowerCase(Locale.ROOT);
        };
    }

    private void restock(Order o) {
        for (OrderItem i : o.getItems()) {
            if (i.getProduct() == null) continue;
            products.findLockedById(i.getProduct().getId()).ifPresent(p -> p.setStock(p.getStock() + i.getQuantity()));
        }
    }

    private String newReference() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        StringBuilder sb = new StringBuilder("BD-").append(date).append('-');
        for (int i = 0; i < 4; i++) sb.append(REF_CHARS.charAt(random.nextInt(REF_CHARS.length())));
        return sb.toString();
    }

    private static String trim(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
