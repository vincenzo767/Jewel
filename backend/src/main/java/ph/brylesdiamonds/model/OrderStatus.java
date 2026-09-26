package ph.brylesdiamonds.model;

/** A reservation's lifecycle: customers reserve online and pay/collect at the Talisay City shop. */
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    READY_FOR_PICKUP,
    COMPLETED,
    CANCELLED;

    public boolean isOpen() {
        return this == PENDING || this == CONFIRMED || this == READY_FOR_PICKUP;
    }
}
