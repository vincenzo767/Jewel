/* Bryle's Diamonds — product catalog */

const IMG = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const PRODUCTS = [
  // ---- Rings ----
  {
    id: "aurora-halo-ring", name: "Aurora Halo Ring", category: "rings",
    occasion: ["bridal"], material: ["diamond", "gold"], price: 185000, tag: "Signature",
    images: ["1605100804763-247f67b3557e", "1596944924616-7b38e7cfac36", "1631982690223-8aa4be0a2497"],
    metal: "18k White Gold", stone: "Round brilliant diamond", carat: "1.20 ct total", clarity: "VS1 · F colour",
    desc: "A luminous round-brilliant centre stone wrapped in a delicate halo of pavé diamonds, set on a split shank that catches light from every angle. Our most requested engagement ring.",
  },
  {
    id: "rosalind-pink-sapphire", name: "Rosalind Sapphire Ring", category: "rings",
    occasion: ["gifting"], material: ["gemstone", "diamond", "gold"], price: 142000, tag: "New",
    images: ["1603561591411-07134e71a2a9", "1631982690223-8aa4be0a2497"],
    metal: "18k Rose Gold", stone: "Pink sapphire, diamond halo", carat: "2.10 ct sapphire", clarity: "Eye-clean · Ceylon",
    desc: "An emerald-cut Ceylon pink sapphire framed by a whisper of white diamonds. Romantic, unexpected, and made to be the ring she never takes off.",
  },
  {
    id: "celestine-pave-stack", name: "Celestine Pavé Stack", category: "rings",
    occasion: ["everyday", "gifting"], material: ["diamond", "gold"], price: 98000,
    images: ["1543294001-f7cd5d7fb516", "1631982690223-8aa4be0a2497"],
    metal: "18k Yellow Gold", stone: "Pavé diamonds", carat: "0.85 ct total", clarity: "VS2 · G colour",
    desc: "Three textured bands crowned with clusters of pavé diamonds — worn together for drama, or apart for quiet shimmer.",
  },
  {
    id: "eternal-wedding-bands", name: "Eternal Wedding Bands", category: "rings",
    occasion: ["bridal"], material: ["gold"], price: 76000, tag: "Pair",
    images: ["1627293509201-cd0c780043e6", "1515934751635-c81c6bc9a2d8"],
    metal: "18k Two-tone Gold", stone: "—", carat: "—", clarity: "High-polish finish",
    desc: "A his-and-hers pair of comfort-fit bands in rose and white gold, hand-polished to a mirror finish. Engraving included.",
  },
  {
    id: "soleil-gold-band", name: "Soleil Gold Band", category: "rings",
    occasion: ["everyday", "bridal"], material: ["gold"], price: 38000,
    images: ["1622398925373-3f91b1e275f5", "1596944924616-7b38e7cfac36"],
    metal: "22k Yellow Gold", stone: "—", carat: "—", clarity: "Brushed & polished",
    desc: "A softly domed band in rich 22k gold — the warm, buttery tone of Philippine heirloom jewellery, refined for today.",
  },
  {
    id: "jardin-cocktail-ring", name: "Jardín Cocktail Ring", category: "rings",
    occasion: ["gifting"], material: ["gemstone", "diamond"], price: 124000,
    images: ["1602751584552-8ba73aad10e1", "1608042314453-ae338d80c427"],
    metal: "18k White Gold", stone: "Amethyst, citrine, diamond", carat: "4.60 ct total", clarity: "Eye-clean",
    desc: "A blooming flower of pear-cut amethyst and citrine petals around a diamond heart. Bold, joyful, and entirely one-of-a-kind.",
  },
  {
    id: "isla-stacking-rings", name: "Isla Stacking Rings", category: "rings",
    occasion: ["everyday", "gifting"], material: ["gemstone", "gold"], price: 46000, tag: "Set of 3",
    images: ["1608042314453-ae338d80c427", "1631982690223-8aa4be0a2497"],
    metal: "18k Yellow Gold", stone: "Carnelian, amazonite, onyx", carat: "Cabochons", clarity: "Natural stones",
    desc: "Three slender bands, each topped with a smooth cabochon inspired by the colours of the Visayan coast.",
  },

  // ---- Earrings ----
  {
    id: "marisol-sapphire-drops", name: "Marisol Sapphire Drops", category: "earrings",
    occasion: ["bridal", "gifting"], material: ["gemstone", "diamond"], price: 210000, tag: "Signature",
    images: ["1535632066927-ab7c9ab60908", "1531746020798-e6953c6e8e04"],
    metal: "Platinum", stone: "Blue sapphire, diamond", carat: "3.40 ct total", clarity: "VS · Royal blue",
    desc: "Pear-cut royal-blue sapphires suspended within geometric frames of brilliant diamonds. Evening jewellery at its most commanding.",
  },
  {
    id: "blush-teardrop-earrings", name: "Blush Teardrop Earrings", category: "earrings",
    occasion: ["bridal"], material: ["gemstone", "gold"], price: 88000,
    images: ["1629224316810-9d8805b95e76", "1600721391776-b5cd0e0048f9"],
    metal: "18k Rose Gold", stone: "Morganite, white topaz", carat: "2.20 ct total", clarity: "Eye-clean",
    desc: "Soft-pink morganite teardrops beneath a scatter of sparkling accents — made for the aisle, and every anniversary after.",
  },
  {
    id: "corazon-heart-drops", name: "Corazón Heart Drops", category: "earrings",
    occasion: ["gifting"], material: ["silver", "gemstone"], price: 12500, tag: "Gift",
    images: ["1630019852942-f89202989a59", "1531746020798-e6953c6e8e04"],
    metal: "Sterling Silver", stone: "Blue crystal", carat: "—", clarity: "Faceted",
    desc: "Faceted blue hearts on fine silver hooks. A playful, heartfelt gift that arrives beautifully wrapped.",
  },
  {
    id: "torsade-twisted-hoops", name: "Torsade Twisted Hoops", category: "earrings",
    occasion: ["everyday"], material: ["gold"], price: 32000,
    images: ["1617038260897-41a1f14a8ca0", "1600721391776-b5cd0e0048f9"],
    metal: "18k Yellow Gold", stone: "—", carat: "—", clarity: "Hand-twisted",
    desc: "Chunky rope-twisted hoops that catch light along every turn. Lightweight enough to wear from morning to midnight.",
  },
  {
    id: "lune-petite-hoops", name: "Lune Petite Hoops", category: "earrings",
    occasion: ["everyday", "gifting"], material: ["gold"], price: 24000,
    images: ["1617038220319-276d3cfab638", "1600721391776-b5cd0e0048f9"],
    metal: "18k Yellow Gold", stone: "—", carat: "—", clarity: "High-polish",
    desc: "Our smallest sculpted hoop, curved like a crescent moon. The first piece we recommend to begin a collection.",
  },
  {
    id: "nudo-knot-earrings", name: "Nudo Knot Earrings", category: "earrings",
    occasion: ["everyday", "gifting"], material: ["gold"], price: 29000, tag: "New",
    images: ["1603974372039-adc49044b6bd", "1531746020798-e6953c6e8e04"],
    metal: "18k Yellow Gold", stone: "—", carat: "—", clarity: "Satin finish",
    desc: "A softly knotted gold loop — a symbol of connection, cast in solid gold with a satin sheen.",
  },

  // ---- Necklaces ----
  {
    id: "perla-pearl-strand", name: "Perla South Sea Strand", category: "necklaces",
    occasion: ["bridal", "gifting"], material: ["gemstone", "gold"], price: 95000, tag: "Heritage",
    images: ["1515562141207-7a88fb7ce338", "1611652022419-a9419f74343d"],
    metal: "18k White Gold clasp", stone: "Philippine South Sea pearls", carat: "7–9 mm", clarity: "AAA lustre",
    desc: "Hand-matched South Sea pearls from Palawan with a pavé diamond clasp — the national gem, strung for a lifetime.",
  },
  {
    id: "crescent-topaz-pendant", name: "Crescent Topaz Pendant", category: "necklaces",
    occasion: ["gifting"], material: ["gemstone", "gold"], price: 58000,
    images: ["1599643478518-a784e5dc4c8f", "1611085583191-a3b181a88401"],
    metal: "18k Yellow Gold", stone: "London blue topaz", carat: "3.10 ct", clarity: "Eye-clean",
    desc: "A deep-blue topaz above a crescent of tiny black diamonds, hung on a fine trace chain. Wear it long, or doubled.",
  },
  {
    id: "amour-diamond-heart", name: "Amour Diamond Heart", category: "necklaces",
    occasion: ["gifting"], material: ["diamond", "silver"], price: 72000, tag: "Best Seller",
    images: ["1588444837495-c6cfeb53f32d", "1610694955371-d4a3e0ce4b52"],
    metal: "18k White Gold", stone: "Pavé diamonds", carat: "0.60 ct total", clarity: "VS2 · G colour",
    desc: "An open heart traced in pavé diamonds on a fine bead chain — our most-gifted piece, for good reason.",
  },
  {
    id: "lumiere-cushion-pendant", name: "Lumière Cushion Pendant", category: "necklaces",
    occasion: ["bridal"], material: ["diamond"], price: 165000,
    images: ["1589128777073-263566ae5e4d", "1610694955371-d4a3e0ce4b52"],
    metal: "Platinum", stone: "Cushion-cut diamond halo", carat: "1.50 ct total", clarity: "VS1 · E colour",
    desc: "A cushion-cut centre stone floating within a double halo — the brilliance of an engagement ring, worn at the collarbone.",
  },
  {
    id: "tala-layered-chains", name: "Tala Layered Chains", category: "necklaces",
    occasion: ["everyday"], material: ["gold"], price: 42000,
    images: ["1590548784585-643d2b9f2925", "1601821765780-754fa98637c1"],
    metal: "18k Yellow Gold", stone: "Freshwater pearl", carat: "—", clarity: "—",
    desc: "Three pre-layered chains — herringbone, trace and a single seed pearl — so the perfect stack is always one clasp away.",
  },
  {
    id: "reina-heirloom-collar", name: "Reina Heirloom Collar", category: "necklaces",
    occasion: ["bridal"], material: ["gold", "gemstone"], price: 320000, tag: "Atelier",
    images: ["1601121141461-9d6647bca1ed", "1633810542706-90e5ff7557be"],
    metal: "22k Yellow Gold", stone: "Rubies", carat: "6.80 ct total", clarity: "Burmese red",
    desc: "A hand-granulated collar with matching earrings, set with rubies. Made to order in our Cebu atelier over six weeks.",
  },
  {
    id: "plata-drop-chain", name: "Plata Drop Chain", category: "necklaces",
    occasion: ["everyday", "gifting"], material: ["silver"], price: 18000,
    images: ["1506630448388-4e683c67ddb0", "1611652022419-a9419f74343d"],
    metal: "Sterling Silver & gold vermeil", stone: "—", carat: "—", clarity: "—",
    desc: "A mix-metal drop chain with a slender bar and tiny disc. Minimal, modern, and made for layering.",
  },

  // ---- Bracelets ----
  {
    id: "rosa-filigree-bracelet", name: "Rosa Filigree Bracelet", category: "bracelets",
    occasion: ["gifting"], material: ["gold", "diamond"], price: 64000,
    images: ["1611591437281-460bfbe1220a", "1596944924616-7b38e7cfac36"],
    metal: "18k Rose Gold", stone: "Diamond accents", carat: "0.40 ct total", clarity: "SI1 · H colour",
    desc: "Our tribute to Filipino filigree tradition — lacy rose-gold scrolls brightened with scattered diamonds.",
  },
  {
    id: "etoile-tennis-bracelet", name: "Étoile Tennis Bracelet", category: "bracelets",
    occasion: ["bridal", "gifting"], material: ["diamond"], price: 285000, tag: "Signature",
    images: ["1573408301185-9146fe634ad0", "1596944924616-7b38e7cfac36"],
    metal: "18k White Gold", stone: "Round & oval diamonds", carat: "5.00 ct total", clarity: "VS2 · F colour",
    desc: "Alternating round and oval diamonds in open links — a river of light that moves with every gesture.",
  },
  {
    id: "cadena-link-bracelet", name: "Cadena Link Bracelet", category: "bracelets",
    occasion: ["everyday"], material: ["gold"], price: 56000, tag: "Best Seller",
    images: ["1602173574767-37ac01994b2a", "1583292650898-7d22cd27ca6f"],
    metal: "18k Yellow Gold", stone: "—", carat: "—", clarity: "High-polish",
    desc: "Generous oval links with a hidden box clasp. The kind of gold you inherit — and one day pass on.",
  },
  {
    id: "sinag-bangle-stack", name: "Sinag Bangle Stack", category: "bracelets",
    occasion: ["everyday", "gifting"], material: ["gold"], price: 78000,
    images: ["1611107683227-e9060eccd846", "1583292650898-7d22cd27ca6f"],
    metal: "22k Yellow Gold", stone: "—", carat: "—", clarity: "Hammered texture",
    desc: "Five hand-hammered bangles — sinag means “ray of light” — that chime softly as you move.",
  },
];

const CATEGORY_LABELS = { rings: "Rings", earrings: "Earrings", necklaces: "Necklaces", bracelets: "Bracelets" };
const OCCASION_LABELS = { bridal: "Bridal", gifting: "Gifting", everyday: "Everyday" };
const MATERIAL_LABELS = { gold: "Gold", silver: "Silver", diamond: "Diamond", gemstone: "Gemstone" };

const formatPrice = (n) => "₱" + n.toLocaleString("en-PH");
const getProduct = (id) => PRODUCTS.find((p) => p.id === id);
