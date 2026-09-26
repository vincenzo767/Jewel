package ph.brylesdiamonds.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ph.brylesdiamonds.dto.Dtos.CheckoutRequest;
import ph.brylesdiamonds.model.*;
import ph.brylesdiamonds.repo.CartItemRepository;
import ph.brylesdiamonds.repo.OrderRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.web.ApiException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** Reservations: stock is held the moment a customer reserves, and released if it's cancelled. */
@Service
public class OrderService {
    private static final String REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    private final OrderRepository orders;
    private final CartItemRepository cart;
    private final ProductRepository products;
    private final ChatService chat;

    public OrderService(OrderRepository orders, CartItemRepository cart, ProductRepository products, ChatService chat) {
        this.orders = orders;
        this.cart = cart;
        this.products = products;
        this.chat = chat;
    }

    @Transactional
    public Order checkout(User customer, CheckoutRequest req) {
        List<CartItem> items = cart.findForUser(customer.getId());
        if (items.isEmpty()) throw ApiException.badRequest("Your cart is empty.");

        Order order = new Order();
        order.setCustomer(customer);
        order.setReference(newReference());
        order.setNote(trim(req == null ? null : req.note()));
        order.setPickupDate(trim(req == null ? null : req.pickupDate()));
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
    public Order updateStatus(Long orderId, OrderStatus next, User admin) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Reservation"));
        OrderStatus current = o.getStatus();
        if (current == next) return o;
        if (!current.isOpen()) throw ApiException.badRequest("Completed or cancelled reservations can't be changed.");
        if (next == OrderStatus.CANCELLED) restock(o);
        o.setStatus(next);

        String note = switch (next) {
            case CONFIRMED -> "Your reservation " + o.getReference() + " is confirmed. We'll let you know when it's ready.";
            case READY_FOR_PICKUP -> "Good news - reservation " + o.getReference()
                    + " is ready for pickup at our V. H. Garces St shop, Talisay City.";
            case COMPLETED -> "Thank you for choosing Bryle's Diamonds. Reservation " + o.getReference() + " is complete.";
            case CANCELLED -> "Reservation " + o.getReference() + " has been cancelled. Reply here if you have any questions.";
            default -> null;
        };
        if (note != null) chat.send(o.getCustomer(), admin, note, null);
        return o;
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
