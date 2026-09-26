package ph.brylesdiamonds.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;

/**
 * Removes avoidable round trips to a remote PostgreSQL database (e.g. Supabase), where each one costs
 * a few hundred milliseconds. Read-only transactions otherwise make the driver send two extra
 * "SET SESSION CHARACTERISTICS" commands around every read; with readOnlyMode=ignore the flag stays
 * client-side. Other databases (H2) are left untouched.
 */
@Component
public class DataSourceTuning implements BeanPostProcessor {

    static {
        // Hikari re-validates a pooled connection that has been idle for more than 0.5 s before handing
        // it out, costing a round trip on nearly every request. Background keepalive (keepalive-time)
        // already checks idle connections, so skip the per-borrow check for connections used recently.
        if (System.getProperty("com.zaxxer.hikari.aliveBypassWindowMs") == null) {
            System.setProperty("com.zaxxer.hikari.aliveBypassWindowMs", "30000");
        }
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        if (bean instanceof HikariDataSource ds && ds.getJdbcUrl() != null && ds.getJdbcUrl().startsWith("jdbc:postgresql:")) {
            ds.addDataSourceProperty("readOnlyMode", "ignore");
        }
        return bean;
    }
}
