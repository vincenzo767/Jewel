package ph.brylesdiamonds.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "cart_items")
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Product product;

    private int quantity;

    @Column(length = 16)
    private String size;

    private Instant createdAt = Instant.now();

    protected CartItem() {}

    public CartItem(User user, Product product, int quantity, String size) {
        this.user = user;
        this.product = product;
        this.quantity = quantity;
        this.size = size;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Product getProduct() { return product; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getSize() { return size; }
    public Instant getCreatedAt() { return createdAt; }
}
