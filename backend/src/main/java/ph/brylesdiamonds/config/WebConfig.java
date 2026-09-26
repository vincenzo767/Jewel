package ph.brylesdiamonds.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * When the built React app is packaged into the jar (static/app), deep links such as
 * /app/shop or /app/admin/products must serve the app shell so client-side routing can take over.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/app").setViewName("forward:/app/index.html");
        registry.addViewController("/app/").setViewName("forward:/app/index.html");
        registry.addViewController("/app/{a:[^\\.]*}").setViewName("forward:/app/index.html");
        registry.addViewController("/app/{a:[^\\.]*}/{b:[^\\.]*}").setViewName("forward:/app/index.html");
        registry.addViewController("/app/{a:[^\\.]*}/{b:[^\\.]*}/{c:[^\\.]*}").setViewName("forward:/app/index.html");
    }
}
