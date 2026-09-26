package ph.brylesdiamonds.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * One message in a customer's conversation with the shop. Every customer has exactly one
 * conversation, keyed by {@link #customer}; any admin may answer on the shop's behalf.
 */
@Entity
@Table(name = "chat_messages", indexes = @Index(columnList = "customer_id, createdAt"))
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User sender;

    @Column(nullable = false, length = 2000)
    private String content;

    /** Optional piece the message is about, shown as a card in the thread. */
    @ManyToOne(fetch = FetchType.LAZY)
    private Product product;

    private boolean fromAdmin;

    private boolean readByRecipient;

    private Instant createdAt = Instant.now();

    protected ChatMessage() {}

    public ChatMessage(User customer, User sender, String content, Product product) {
        this.customer = customer;
        this.sender = sender;
        this.content = content;
        this.product = product;
        this.fromAdmin = sender.isAdmin();
    }

    public Long getId() { return id; }
    public User getCustomer() { return customer; }
    public User getSender() { return sender; }
    public String getContent() { return content; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public boolean isFromAdmin() { return fromAdmin; }
    public boolean isReadByRecipient() { return readByRecipient; }
    public void setReadByRecipient(boolean readByRecipient) { this.readByRecipient = readByRecipient; }
    public Instant getCreatedAt() { return createdAt; }
}
