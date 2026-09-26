package ph.brylesdiamonds.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "favorites", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "product_id"}))
public class Favorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Product product;

    private Instant createdAt = Instant.now();

    protected Favorite() {}

    public Favorite(User user, Product product) {
        this.user = user;
        this.product = product;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Product getProduct() { return product; }
    public Instant getCreatedAt() { return createdAt; }
}
