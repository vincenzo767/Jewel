package ph.brylesdiamonds.web;

import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import ph.brylesdiamonds.dto.Dtos.CartAdd;
import ph.brylesdiamonds.dto.Dtos.CartDto;
import ph.brylesdiamonds.dto.Dtos.CartItemDto;
import ph.brylesdiamonds.dto.Dtos.CartQuantity;
import ph.brylesdiamonds.model.CartItem;
import ph.brylesdiamonds.model.Product;
import ph.brylesdiamonds.repo.CartItemRepository;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.security.CurrentUser;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/cart")
public class CartController {
    private final CartItemRepository cart;
    private final ProductRepository products;
    private final CurrentUser current;

    public CartController(CartItemRepository cart, ProductRepository products, CurrentUser current) {
        this.cart = cart;
        this.products = products;
        this.current = current;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public CartDto get() {
        return view(current.id());
    }

    @PostMapping
    @Transactional
    public CartDto add(@Valid @RequestBody CartAdd req) {
        Long uid = current.id();
        Product p = products.findById(req.productId()).filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("Piece"));
        String size = normaliseSize(p, req.size());
        CartItem item = cart.findByUserIdAndProductIdAndSize(uid, p.getId(), size).orElse(null);
        int wanted = (item == null ? 0 : item.getQuantity()) + req.quantity();
        checkStock(p, wanted);
        if (item == null) cart.save(new CartItem(current.get(), p, req.quantity(), size));
        else item.setQuantity(wanted);
        return view(uid);
    }

    @PatchMapping("/{itemId}")
    @Transactional
    public CartDto quantity(@PathVariable Long itemId, @Valid @RequestBody CartQuantity req) {
        Long uid = current.id();
        CartItem item = cart.findByIdAndUserId(itemId, uid).orElseThrow(() -> ApiException.notFound("Cart item"));
        checkStock(item.getProduct(), req.quantity());
        item.setQuantity(req.quantity());
        return view(uid);
    }

    @DeleteMapping("/{itemId}")
    @Transactional
    public CartDto remove(@PathVariable Long itemId) {
        Long uid = current.id();
        cart.findByIdAndUserId(itemId, uid).ifPresent(cart::delete);
        return view(uid);
    }

    private CartDto view(Long uid) {
        List<CartItemDto> items = cart.findForUser(uid).stream().map(CartItemDto::of).toList();
        int count = items.stream().mapToInt(CartItemDto::quantity).sum();
        BigDecimal subtotal = items.stream().map(CartItemDto::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartDto(items, count, subtotal);
    }

    private static void checkStock(Product p, int wanted) {
        if (p.getStock() <= 0) throw ApiException.conflict(p.getName() + " is sold out.");
        if (wanted > p.getStock()) {
            throw ApiException.conflict("Only " + p.getStock() + " of " + p.getName() + " available.");
        }
    }

    private static String normaliseSize(Product p, String size) {
        String sizes = p.getSizes();
        boolean sized = sizes != null && !sizes.isBlank();
        if (!sized) return null;
        String s = size == null ? "" : size.strip();
        if (s.isEmpty()) throw ApiException.badRequest("Please choose a size.");
        for (String allowed : sizes.split("\\s*,\\s*")) if (allowed.equalsIgnoreCase(s)) return allowed;
        throw ApiException.badRequest("That size isn't available for this piece.");
    }
}
