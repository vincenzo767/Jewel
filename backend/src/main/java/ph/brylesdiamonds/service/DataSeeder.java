package ph.brylesdiamonds.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ph.brylesdiamonds.model.Category;
import ph.brylesdiamonds.model.Product;
import ph.brylesdiamonds.model.Role;
import ph.brylesdiamonds.model.User;
import ph.brylesdiamonds.repo.ProductRepository;
import ph.brylesdiamonds.repo.UserRepository;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Locale;

/** Creates the owner account on first start, and (optionally) a starter catalogue and demo customer. */
@Component
public class DataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String RING_SIZES = "5, 6, 7, 8, 9";

    private final UserRepository users;
    private final ProductRepository products;
    private final PasswordEncoder encoder;
    private final ChatService chat;
    private final String adminEmail;
    private final String adminPassword;
    private final String adminName;
    private final boolean seedDemo;
    private final String demoEmail;
    private final String demoPassword;

    public DataSeeder(UserRepository users, ProductRepository products, PasswordEncoder encoder, ChatService chat,
                      @Value("${app.admin.email:}") String adminEmail,
                      @Value("${app.admin.password:}") String adminPassword,
                      @Value("${app.demo-customer.email:}") String demoEmail,
                      @Value("${app.demo-customer.password:}") String demoPassword,
                      @Value("${app.admin.name:Shop Owner}") String adminName,
                      @Value("${app.seed-demo-data:true}") boolean seedDemo) {
        this.users = users;
        this.products = products;
        this.encoder = encoder;
        this.chat = chat;
        this.adminEmail = adminEmail.strip().toLowerCase(Locale.ROOT);
        this.adminPassword = adminPassword;
        this.adminName = adminName;
        this.seedDemo = seedDemo;
        this.demoEmail = demoEmail.strip().toLowerCase(Locale.ROOT);
        this.demoPassword = demoPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.countByRole(Role.ADMIN) == 0 && adminEmail.isEmpty()) {
            log.warn("No owner account exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env and restart to create it.");
        } else if (users.countByRole(Role.ADMIN) == 0 && adminPassword.length() < 8) {
            log.warn("ADMIN_PASSWORD must be at least 8 characters - the owner account was not created.");
        } else if (users.countByRole(Role.ADMIN) == 0) {
            User admin = new User();
            admin.setFullName(adminName);
            admin.setEmail(adminEmail);
            admin.setPasswordHash(encoder.encode(adminPassword));
            admin.setRole(Role.ADMIN);
            admin.setPhone("+63 992 409 2298");
            admin.setAddress("V. H. Garces St, Talisay City, Cebu 6045");
            admin.setBio("Founder and head jeweller of Bryle's Diamonds.");
            users.save(admin);
            log.info("Created owner account {} - change its password from the admin profile page.", adminEmail);
        }
        if (seedDemo && products.count() == 0) {
            seedCatalogue();
            seedCustomer();
        }
    }

    private void seedCatalogue() {
        // Rings
        add("Aurora Halo Ring", Category.RINGS, "Signature", "18k White Gold", "Round brilliant diamond", "1.20 ct total", "VS1 · F colour", 185000, 4, true, RING_SIZES,
                "A luminous round-brilliant centre stone wrapped in a delicate halo of pavé diamonds, set on a split shank that catches light from every angle. Our most requested engagement ring.",
                "1605100804763-247f67b3557e", "1596944924616-7b38e7cfac36", "1631982690223-8aa4be0a2497");
        add("Rosalind Sapphire Ring", Category.RINGS, "New", "18k Rose Gold", "Pink sapphire, diamond halo", "2.10 ct sapphire", "Eye-clean · Ceylon", 142000, 3, false, RING_SIZES,
                "An emerald-cut Ceylon pink sapphire framed by a whisper of white diamonds. Romantic, unexpected, and made to be the ring she never takes off.",
                "1603561591411-07134e71a2a9", "1631982690223-8aa4be0a2497");
        add("Celestine Pavé Stack", Category.RINGS, null, "18k Yellow Gold", "Pavé diamonds", "0.85 ct total", "VS2 · G colour", 98000, 7, false, RING_SIZES,
                "Three textured bands crowned with clusters of pavé diamonds — worn together for drama, or apart for quiet shimmer.",
                "1543294001-f7cd5d7fb516", "1631982690223-8aa4be0a2497");
        add("Eternal Wedding Bands", Category.RINGS, "Pair", "18k Two-tone Gold", null, null, "High-polish finish", 76000, 6, false, RING_SIZES,
                "A his-and-hers pair of comfort-fit bands in rose and white gold, hand-polished to a mirror finish. Engraving included.",
                "1627293509201-cd0c780043e6", "1515934751635-c81c6bc9a2d8");
        add("Soleil Gold Band", Category.RINGS, null, "22k Yellow Gold", null, null, "Brushed & polished", 38000, 12, false, RING_SIZES,
                "A softly domed band in rich 22k gold — the warm, buttery tone of Philippine heirloom jewellery, refined for today.",
                "1622398925373-3f91b1e275f5", "1596944924616-7b38e7cfac36");
        add("Jardín Cocktail Ring", Category.RINGS, null, "18k White Gold", "Amethyst, citrine, diamond", "4.60 ct total", "Eye-clean", 124000, 1, false, RING_SIZES,
                "A blooming flower of pear-cut amethyst and citrine petals around a diamond heart. Bold, joyful, and entirely one-of-a-kind.",
                "1602751584552-8ba73aad10e1", "1608042314453-ae338d80c427");
        add("Isla Stacking Rings", Category.RINGS, "Set of 3", "18k Yellow Gold", "Carnelian, amazonite, onyx", "Cabochons", "Natural stones", 46000, 9, false, RING_SIZES,
                "Three slender bands, each topped with a smooth cabochon inspired by the colours of the Visayan coast.",
                "1608042314453-ae338d80c427", "1631982690223-8aa4be0a2497");
        // Earrings
        add("Marisol Sapphire Drops", Category.EARRINGS, "Signature", "Platinum", "Blue sapphire, diamond", "3.40 ct total", "VS · Royal blue", 210000, 2, true, null,
                "Pear-cut royal-blue sapphires suspended within geometric frames of brilliant diamonds. Evening jewellery at its most commanding.",
                "1535632066927-ab7c9ab60908", "1531746020798-e6953c6e8e04");
        add("Blush Teardrop Earrings", Category.EARRINGS, null, "18k Rose Gold", "Morganite, white topaz", "2.20 ct total", "Eye-clean", 88000, 5, false, null,
                "Soft-pink morganite teardrops beneath a scatter of sparkling accents — made for the aisle, and every anniversary after.",
                "1629224316810-9d8805b95e76", "1600721391776-b5cd0e0048f9");
        add("Corazón Heart Drops", Category.EARRINGS, "Gift", "Sterling Silver", "Blue crystal", null, "Faceted", 12500, 18, false, null,
                "Faceted blue hearts on fine silver hooks. A playful, heartfelt gift that arrives beautifully wrapped.",
                "1630019852942-f89202989a59", "1531746020798-e6953c6e8e04");
        add("Torsade Twisted Hoops", Category.EARRINGS, null, "18k Yellow Gold", null, null, "Hand-twisted", 32000, 10, true, null,
                "Chunky rope-twisted hoops that catch light along every turn. Lightweight enough to wear from morning to midnight.",
                "1617038260897-41a1f14a8ca0", "1600721391776-b5cd0e0048f9");
        add("Lune Petite Hoops", Category.EARRINGS, null, "18k Yellow Gold", null, null, "High-polish", 24000, 15, false, null,
                "Our smallest sculpted hoop, curved like a crescent moon. The first piece we recommend to begin a collection.",
                "1617038220319-276d3cfab638", "1600721391776-b5cd0e0048f9");
        add("Nudo Knot Earrings", Category.EARRINGS, "New", "18k Yellow Gold", null, null, "Satin finish", 29000, 0, false, null,
                "A softly knotted gold loop — a symbol of connection, cast in solid gold with a satin sheen.",
                "1603974372039-adc49044b6bd", "1531746020798-e6953c6e8e04");
        // Necklaces
        add("Perla South Sea Strand", Category.NECKLACES, "Heritage", "18k White Gold clasp", "Philippine South Sea pearls", "7–9 mm", "AAA lustre", 95000, 4, true, null,
                "Hand-matched South Sea pearls from Palawan with a pavé diamond clasp — the national gem, strung for a lifetime.",
                "1515562141207-7a88fb7ce338", "1611652022419-a9419f74343d");
        add("Crescent Topaz Pendant", Category.NECKLACES, null, "18k Yellow Gold", "London blue topaz", "3.10 ct", "Eye-clean", 58000, 6, false, null,
                "A deep-blue topaz above a crescent of tiny black diamonds, hung on a fine trace chain. Wear it long, or doubled.",
                "1599643478518-a784e5dc4c8f", "1611085583191-a3b181a88401");
        add("Amour Diamond Heart", Category.NECKLACES, "Best Seller", "18k White Gold", "Pavé diamonds", "0.60 ct total", "VS2 · G colour", 72000, 8, true, null,
                "An open heart traced in pavé diamonds on a fine bead chain — our most-gifted piece, for good reason.",
                "1588444837495-c6cfeb53f32d", "1610694955371-d4a3e0ce4b52");
        add("Lumière Cushion Pendant", Category.NECKLACES, null, "Platinum", "Cushion-cut diamond halo", "1.50 ct total", "VS1 · E colour", 165000, 2, false, null,
                "A cushion-cut centre stone floating within a double halo — the brilliance of an engagement ring, worn at the collarbone.",
                "1589128777073-263566ae5e4d", "1610694955371-d4a3e0ce4b52");
        add("Tala Layered Chains", Category.NECKLACES, null, "18k Yellow Gold", "Freshwater pearl", null, null, 42000, 11, true, null,
                "Three pre-layered chains — herringbone, trace and a single seed pearl — so the perfect stack is always one clasp away.",
                "1590548784585-643d2b9f2925", "1601821765780-754fa98637c1");
        add("Reina Heirloom Collar", Category.NECKLACES, "Atelier", "22k Yellow Gold", "Rubies", "6.80 ct total", "Burmese red", 320000, 1, false, null,
                "A hand-granulated collar with matching earrings, set with rubies. Made to order in our Cebu atelier over six weeks.",
                "1601121141461-9d6647bca1ed", "1633810542706-90e5ff7557be");
        add("Plata Drop Chain", Category.NECKLACES, null, "Sterling Silver & gold vermeil", null, null, null, 18000, 20, false, null,
                "A mix-metal drop chain with a slender bar and tiny disc. Minimal, modern, and made for layering.",
                "1506630448388-4e683c67ddb0", "1611652022419-a9419f74343d");
        // Bracelets
        add("Rosa Filigree Bracelet", Category.BRACELETS, null, "18k Rose Gold", "Diamond accents", "0.40 ct total", "SI1 · H colour", 64000, 5, false, null,
                "Our tribute to Filipino filigree tradition — lacy rose-gold scrolls brightened with scattered diamonds.",
                "1611591437281-460bfbe1220a", "1596944924616-7b38e7cfac36");
        add("Étoile Tennis Bracelet", Category.BRACELETS, "Signature", "18k White Gold", "Round & oval diamonds", "5.00 ct total", "VS2 · F colour", 285000, 2, true, null,
                "Alternating round and oval diamonds in open links — a river of light that moves with every gesture.",
                "1573408301185-9146fe634ad0", "1596944924616-7b38e7cfac36");
        add("Cadena Link Bracelet", Category.BRACELETS, "Best Seller", "18k Yellow Gold", null, null, "High-polish", 56000, 9, true, null,
                "Generous oval links with a hidden box clasp. The kind of gold you inherit — and one day pass on.",
                "1602173574767-37ac01994b2a", "1583292650898-7d22cd27ca6f");
        add("Sinag Bangle Stack", Category.BRACELETS, null, "22k Yellow Gold", null, null, "Hammered texture", 78000, 6, false, null,
                "Five hand-hammered bangles — sinag means “ray of light” — that chime softly as you move.",
                "1611107683227-e9060eccd846", "1583292650898-7d22cd27ca6f");
        log.info("Seeded {} catalogue pieces.", products.count());
    }

    private void seedCustomer() {
        if (demoEmail.isEmpty() || demoPassword.isEmpty()) return;
        String email = demoEmail;
        if (users.existsByEmailIgnoreCase(email)) return;
        User c = new User();
        c.setFullName("Andrea Lim");
        c.setEmail(email);
        c.setPasswordHash(encoder.encode(demoPassword));
        c.setRole(Role.CUSTOMER);
        c.setPhone("+63 917 555 0142");
        c.setAddress("Lahug, Cebu City");
        users.save(c);
        chat.welcome(c);
        log.info("Created demo customer {}.", email);
    }

    private void add(String name, Category category, String tag, String metal, String stone, String carat,
                     String clarity, long price, int stock, boolean featured, String sizes, String desc,
                     String... photoIds) {
        Product p = new Product();
        p.setName(name);
        p.setCategory(category);
        p.setTag(tag);
        p.setMetal(metal);
        p.setStone(stone);
        p.setCarat(carat);
        p.setClarity(clarity);
        p.setPrice(BigDecimal.valueOf(price));
        p.setStock(stock);
        p.setFeatured(featured);
        p.setSizes(sizes);
        p.setDescription(desc);
        p.setImages(new java.util.ArrayList<>(Arrays.stream(photoIds)
                .map(id -> "https://images.unsplash.com/photo-" + id + "?auto=format&fit=crop&w=1000&q=80").toList()));
        products.save(p);
    }
}
