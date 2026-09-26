package ph.brylesdiamonds.model;

import jakarta.persistence.*;

import java.math.BigDecimal;

/** A snapshot of a product at reservation time, so later price or name edits don't rewrite history. */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    private Product product;

    @Column(nullable = false, length = 120)
    private String productName;

    @Column(length = 400)
    private String imageUrl;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    private int quantity;

    @Column(length = 16)
    private String size;

    protected OrderItem() {}

    public OrderItem(Product product, int quantity, String size) {
        this.product = product;
        this.productName = product.getName();
        this.imageUrl = product.getImages().isEmpty() ? null : product.getImages().get(0);
        this.unitPrice = product.getPrice();
        this.quantity = quantity;
        this.size = size;
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    void setOrder(Order order) { this.order = order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public String getProductName() { return productName; }
    public String getImageUrl() { return imageUrl; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public String getSize() { return size; }
}
