package ph.brylesdiamonds.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodically releases reservations that weren't collected before their hold ran out. */
@Component
public class ReservationScheduler {
    private static final Logger log = LoggerFactory.getLogger(ReservationScheduler.class);

    private final OrderService orders;

    public ReservationScheduler(OrderService orders) {
        this.orders = orders;
    }

    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "${app.reservations.check-interval:PT30M}")
    public void releaseOverdue() {
        try {
            orders.releaseOverdue();
        } catch (Exception e) {
            log.warn("Could not release overdue reservations this time: {}", e.getMessage());
        }
    }
}
