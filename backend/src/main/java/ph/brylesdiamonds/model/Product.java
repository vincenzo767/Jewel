package ph.brylesdiamonds.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Category category;

    @Column(length = 2000)
    private String description;

    @Column(length = 32)
    private String tag;

    @Column(length = 80)
    private String metal;

    @Column(length = 120)
    private String stone;

    @Column(length = 60)
    private String carat;

    @Column(length = 60)
    private String clarity;

    /** Comma-separated sizes the customer may pick (rings), empty when one-size. */
    @Column(length = 120)
    private String sizes;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    private int stock;

    /** Unpublished pieces are hidden from customers. */
    private boolean active = true;

    private boolean featured;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "product_images", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "position")
    @Column(name = "url", length = 400)
    private List<String> images = new ArrayList<>();

    private Instant createdAt = Instant.now();

    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() { updatedAt = Instant.now(); }

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }
    public String getMetal() { return metal; }
    public void setMetal(String metal) { this.metal = metal; }
    public String getStone() { return stone; }
    public void setStone(String stone) { this.stone = stone; }
    public String getCarat() { return carat; }
    public void setCarat(String carat) { this.carat = carat; }
    public String getClarity() { return clarity; }
    public void setClarity(String clarity) { this.clarity = clarity; }
    public String getSizes() { return sizes; }
    public void setSizes(String sizes) { this.sizes = sizes; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
