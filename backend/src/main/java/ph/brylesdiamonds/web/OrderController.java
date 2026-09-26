package ph.brylesdiamonds.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.CheckoutRequest;
import ph.brylesdiamonds.dto.Dtos.OrderDto;
import ph.brylesdiamonds.repo.OrderRepository;
import ph.brylesdiamonds.security.CurrentUser;
import ph.brylesdiamonds.service.OrderService;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderRepository orders;
    private final OrderService service;
    private final CurrentUser current;

    public OrderController(OrderRepository orders, OrderService service, CurrentUser current) {
        this.orders = orders;
        this.service = service;
        this.current = current;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<OrderDto> mine() {
        return orders.findByCustomerIdOrderByCreatedAtDesc(current.id()).stream().map(OrderDto::of).toList();
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public OrderDto checkout(@Valid @RequestBody(required = false) CheckoutRequest req) {
        return OrderDto.of(service.checkout(current.get(), req));
    }

    @PostMapping("/{id}/cancel")
    @Transactional
    public OrderDto cancel(@PathVariable Long id) {
        return OrderDto.of(service.cancelByCustomer(id, current.id()));
    }
}
