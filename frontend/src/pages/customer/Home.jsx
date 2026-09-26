import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, Clock, MapPin, MessageCircle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, firstName, formatPrice, greeting, SHOP } from "../../lib/format";
import ProductCard, { CardSkeleton } from "../../components/ProductCard";
import { EASE, Frame, Reveal, SplitTitle } from "../../components/ui";

const FALLBACK_HERO = [{ id: null, name: "The Autumn Edit", images: ["https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=2000&q=80"] }];
const PROMISES = ["Ethically sourced", "Handcrafted in Cebu", "Certified diamonds", "Lifetime care", "Complimentary engraving", "Reserve online, collect in store"];

function Hero({ pieces }) {
  const { user } = useAuth();
  const slides = pieces.length ? pieces.slice(0, 5) : FALLBACK_HERO;
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[i % slides.length];
  const big = (url) => url?.replace(/w=\d+/, "w=2000");

  return (
    <section className="home-hero" ref={ref}>
      <motion.div className="home-hero__media" style={{ y }}>
        <AnimatePresence initial={false}>
          <motion.img
            key={current.images[0]}
            src={big(current.images[0])}
            alt=""
            initial={{ opacity: 0, scale: 1.14 }}
            animate={{ opacity: 1, scale: 1, transition: { opacity: { duration: 1.6 }, scale: { duration: 9, ease: "easeOut" } } }}
            exit={{ opacity: 0, transition: { duration: 1.6 } }}
          />
        </AnimatePresence>
      </motion.div>
      <div className="home-hero__shade" />
      <motion.div className="home-hero__content" style={{ opacity: fade }}>
        <motion.span className="home-hero__greet" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}>
          {greeting()}, {firstName(user.fullName)}
        </motion.span>
        <h1 className="home-hero__title">
          {["Light,", <em key="h">held forever.</em>].map((l, k) => (
            <span className="split__line" key={k}>
              <motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1.4, ease: EASE, delay: 0.45 + k * 0.14 }}>{l}</motion.span>
            </span>
          ))}
        </h1>
        <motion.p className="home-hero__sub" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.95 }}>
          New pieces from the Autumn Edit are in. Reserve online and collect at our Talisay City shop.
        </motion.p>
        <motion.div className="home-hero__ctas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 1.1 }}>
          <Link to="/shop" className="btn btn--gold">Shop the collection</Link>
          <Link to="/visit" className="btn btn--light">Visit the shop</Link>
        </motion.div>
      </motion.div>
      <div className="home-hero__foot">
        <AnimatePresence mode="wait">
          {current.id ? (
            <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.6 }}>
              <Link to={`/product/${current.id}`} className="home-hero__piece">
                <span className="eyebrow eyebrow--light">Now showing</span>
                <strong>{current.name}</strong>
                <small>{formatPrice(current.price)} <ArrowRight size={13} strokeWidth={1.3} /></small>
              </Link>
            </motion.div>
          ) : <span />}
        </AnimatePresence>
        {slides.length > 1 && (
          <div className="home-hero__dots">
            {slides.map((s, k) => (
              <button key={s.id ?? k} onClick={() => setI(k)} className={k === i ? "is-active" : ""} aria-label={`Show ${s.name}`}><span /></button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Rail({ items }) {
  const rail = useRef(null);
  const step = (dir) => {
    const card = rail.current?.querySelector(".card");
    rail.current?.scrollBy({ left: dir * ((card?.offsetWidth || 300) + 28), behavior: "smooth" });
  };
  return (
    <>
      <div className="container">
        <div className="section-head">
          <div>
            <Reveal as="span" className="eyebrow">Most Loved</Reveal>
            <SplitTitle lines={[<>The <em>Signature</em> Pieces</>]} />
          </div>
          <div className="rail-controls">
            <button className="icon-btn icon-btn--ring" onClick={() => step(-1)} aria-label="Previous pieces"><ArrowLeft size={16} strokeWidth={1.2} /></button>
            <button className="icon-btn icon-btn--ring" onClick={() => step(1)} aria-label="Next pieces"><ArrowRight size={16} strokeWidth={1.2} /></button>
          </div>
        </div>
      </div>
      <div className="rail" ref={rail}>
        {items.length ? items.map((p, k) => <ProductCard key={p.id} product={p} index={k} />) : Array.from({ length: 4 }).map((_, k) => <CardSkeleton key={k} />)}
      </div>
    </>
  );
}

export default function Home() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    document.title = "Home — Bryle's Diamonds";
    api.get("/products", { params: { sort: "new" } }).then(({ data }) => setProducts(data)).catch(() => setProducts([]));
  }, []);

  const featured = useMemo(() => (products || []).filter((p) => p.featured), [products]);
  const newest = useMemo(() => (products || []).slice(0, 4), [products]);
  const counts = useMemo(() => {
    const c = {};
    (products || []).forEach((p) => { c[p.category] = (c[p.category] || 0) + 1; });
    return c;
  }, [products]);

  return (
    <>
      <Hero pieces={featured} />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal as="span" className="eyebrow eyebrow--gold">Browse by category</Reveal>
              <SplitTitle lines={["Four ways", <em key="e">to shine.</em>]} />
            </div>
            <Reveal><Link to="/shop" className="link-line">View all jewellery <span className="arrow" /></Link></Reveal>
          </div>
          <div className="cats">
            {CATEGORIES.map((c, k) => (
              <Link key={c.key} to={`/shop?category=${c.key}`} className={`cat cat--${k}`}>
                <Frame src={c.image} alt={c.label} mask className="cat__frame" />
                <div className="cat__label">
                  <span className="num">0{k + 1}</span>
                  <h3>{c.label}</h3>
                  <span className="cat__count">{counts[c.key] ?? "—"} pieces <ArrowRight size={14} strokeWidth={1.2} /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-ivory rail-section">
        <Rail items={featured} />
      </section>

      <div className="marquee" aria-label="Our promises">
        <div className="marquee__track">
          {[...PROMISES, ...PROMISES].map((p, k) => <span key={k} className="marquee__item" aria-hidden={k >= PROMISES.length}>{p}</span>)}
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <Reveal as="span" className="eyebrow">Just arrived</Reveal>
              <SplitTitle lines={[<>New <em>Arrivals</em></>]} />
            </div>
            <Reveal><Link to="/shop?sort=new" className="link-line">Shop new in <span className="arrow" /></Link></Reveal>
          </div>
          <div className="grid grid--4">
            {products ? newest.map((p, k) => <ProductCard key={p.id} product={p} index={k} />) : Array.from({ length: 4 }).map((_, k) => <CardSkeleton key={k} />)}
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="container duo-banners">
          <Reveal className="banner banner--visit">
            <Frame src="https://images.unsplash.com/photo-1631982690223-8aa4be0a2497?auto=format&fit=crop&w=1400&q=80" alt="Gold rings on an ivory velvet tray" className="banner__img" />
            <div className="banner__body">
              <span className="eyebrow eyebrow--light"><MapPin size={12} strokeWidth={1.4} style={{ verticalAlign: "-1px" }} /> Talisay City, Cebu</span>
              <h3>Visit the <em>shop</em></h3>
              <p>{SHOP.address}</p>
              <p className="banner__hours"><Clock size={13} strokeWidth={1.3} /> {SHOP.hours[0][0]} · {SHOP.hours[0][1]}</p>
              <Link to="/visit" className="btn btn--light btn--sm">See the map</Link>
            </div>
          </Reveal>
          <Reveal className="banner banner--chat" delay={0.12}>
            <div className="banner__body">
              <span className="eyebrow eyebrow--gold">Private consultation</span>
              <h3>Talk to our <em>jewellers</em></h3>
              <p>Ask about sizing, stones, custom engraving or book a private viewing — we usually reply within the hour.</p>
              <Link to="/chat" className="btn btn--solid btn--sm"><MessageCircle size={15} strokeWidth={1.3} /> Start a conversation</Link>
            </div>
            <span className="banner__ornament" aria-hidden="true">✦</span>
          </Reveal>
        </div>
      </section>
    </>
  );
}
