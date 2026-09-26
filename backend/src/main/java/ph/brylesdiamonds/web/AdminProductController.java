package ph.brylesdiamonds.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import ph.brylesdiamonds.dto.Dtos.ProductDto;
import ph.brylesdiamonds.dto.Dtos.ProductRequest;
import ph.brylesdiamonds.dto.Dtos.StockUpdate;
import ph.brylesdiamonds.model.Product;
import ph.brylesdiamonds.repo.*;
import ph.brylesdiamonds.service.FileStorageService;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Catalogue moderation - the only way jewelry, photos, prices and stock enter the system. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminProductController {
    private final ProductRepository products;
    private final FavoriteRepository favorites;
    private final CartItemRepository cart;
    private final OrderRepository orders;
    private final ChatMessageRepository chat;
    private final FileStorageService files;

    public AdminProductController(ProductRepository products, FavoriteRepository favorites, CartItemRepository cart,
                                  OrderRepository orders, ChatMessageRepository chat, FileStorageService files) {
        this.products = products;
        this.favorites = favorites;
        this.cart = cart;
        this.orders = orders;
        this.chat = chat;
        this.files = files;
    }

    @GetMapping("/products")
    @Transactional(readOnly = true)
    public List<ProductDto> all() {
        return products.findAll().stream()
                .sorted(Comparator.comparing(Product::getCreatedAt).reversed().thenComparing(Product::getId, Comparator.reverseOrder()))
                .map(p -> ProductDto.of(p, false)).toList();
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public ProductDto create(@Valid @RequestBody ProductRequest req) {
        Product p = new Product();
        apply(p, req);
        return ProductDto.of(products.save(p), false);
    }

    @PutMapping("/products/{id}")
    @Transactional
    public ProductDto update(@PathVariable Long id, @Valid @RequestBody ProductRequest req) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Piece"));
        List<String> removed = new ArrayList<>(p.getImages());
        apply(p, req);
        removed.removeAll(p.getImages());
        removed.stream().filter(url -> !orders.imageUsedInHistory(url)).forEach(files::delete);
        return ProductDto.of(p, false);
    }

    @PatchMapping("/products/{id}/stock")
    @Transactional
    public ProductDto stock(@PathVariable Long id, @Valid @RequestBody StockUpdate req) {
        Product p = products.findLockedById(id).orElseThrow(() -> ApiException.notFound("Piece"));
        p.setStock(req.stock());
        return ProductDto.of(p, false);
    }

    @PatchMapping("/products/{id}/visibility")
    @Transactional
    public ProductDto visibility(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Piece"));
        if (body.containsKey("active")) p.setActive(Boolean.TRUE.equals(body.get("active")));
        if (body.containsKey("featured")) p.setFeatured(Boolean.TRUE.equals(body.get("featured")));
        return ProductDto.of(p, false);
    }

    @DeleteMapping("/products/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Piece"));
        favorites.deleteByProduct(p);
        cart.deleteByProduct(p);
        orders.detachProduct(p);
        chat.detachProduct(p);
        List<String> images = List.copyOf(p.getImages());
        products.delete(p);
        images.stream().filter(url -> !orders.imageUsedInHistory(url)).forEach(files::delete);
    }

    @PostMapping(value = "/uploads", consumes = "multipart/form-data")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        return Map.of("url", files.store(file));
    }

    private static void apply(Product p, ProductRequest r) {
        for (String url : r.images()) {
            if (!url.startsWith(FileStorageService.URL_PREFIX) && !url.startsWith("https://")) {
                throw ApiException.badRequest("Images must be uploaded files or secure (https) links.");
            }
        }
        p.setName(r.name().strip());
        p.setCategory(r.category());
        p.setDescription(blankToNull(r.description()));
        p.setTag(blankToNull(r.tag()));
        p.setMetal(blankToNull(r.metal()));
        p.setStone(blankToNull(r.stone()));
        p.setCarat(blankToNull(r.carat()));
        p.setClarity(blankToNull(r.clarity()));
        p.setSizes(r.sizes() == null ? null : String.join(", ", r.sizes().strip().isEmpty() ? List.of()
                : List.of(r.sizes().strip().split("\\s*,\\s*"))));
        p.setPrice(r.price());
        p.setStock(r.stock());
        p.setActive(r.active());
        p.setFeatured(r.featured());
        p.getImages().clear();
        p.getImages().addAll(r.images());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }
}
