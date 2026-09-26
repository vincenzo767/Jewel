import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { api } from "../../lib/api";
import { useShop } from "../../context/ShopContext";
import { categoryLabel, formatPrice, SHOP, stockInfo } from "../../lib/format";
import ProductCard, { HeartButton } from "../../components/ProductCard";
import { EASE, EmptyState, PageLoader, Reveal, Stepper, StockMeter } from "../../components/ui";

function Gallery({ images, name }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(null);
  useEffect(() => setActive(0), [images]);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const big = (url) => url?.replace(/w=\d+/, "w=1600");
  return (
    <div className="gallery">
      <div className="gallery__thumbs">
        {images.map((src, i) => (
          <button key={src + i} className={`gallery__thumb ${i === active ? "is-active" : ""}`} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}>
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="gallery__main frame" onMouseMove={onMove} onMouseLeave={() => setZoom(null)}>
        <AnimatePresence initial={false}>
          <motion.img
            key={images[active]}
            src={big(images[active])}
            alt={`${name}, image ${active + 1}`}
            className="is-loaded"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: zoom ? 2 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.7 }, scale: { duration: zoom ? 0.35 : 0.6, ease: EASE } }}
            style={{ transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center" }}
          />
        </AnimatePresence>
        <span className="gallery__hint">{zoom ? "Move to explore" : "Hover to zoom"}</span>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useShop();
  const [product, setProduct] = useState(undefined);
  const [related, setRelated] = useState([]);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setProduct(undefined);
    setSize(null);
    setQty(1);
    api.get(`/products/${id}`).then(({ data }) => { setProduct(data); document.title = `${data.name} — Bryle's Diamonds`; }).catch(() => setProduct(null));
    api.get(`/products/${id}/related`).then(({ data }) => setRelated(data)).catch(() => setRelated([]));
  }, [id]);

  if (product === undefined) return <PageLoader inline />;
  if (product === null) {
    return (
      <div className="container" style={{ paddingTop: "calc(var(--nav-h) + 40px)" }}>
        <EmptyState title="This piece has moved on." text="It may have been sold or retired from the collection.">
          <Link to="/shop" className="btn btn--solid">Browse the collection</Link>
        </EmptyState>
      </div>
    );
  }

  const s = stockInfo(product.stock);
  const sized = product.sizes.length > 0;

  const add = async () => {
    if (sized && !size) { setSizeError(true); return; }
    setAdding(true);
    const ok = await addToCart(product, qty, size);
    setAdding(false);
    if (ok) setQty(1);
  };

  const specs = [["Metal", product.metal], ["Stone", product.stone], ["Carat", product.carat], ["Quality", product.clarity]].filter(([, v]) => v);

  return (
    <div className="pdp">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/shop">Shop</Link><span>/</span>
          <Link to={`/shop?category=${product.category}`}>{categoryLabel(product.category)}</Link><span>/</span>
          <em>{product.name}</em>
        </nav>
        <div className="pdp__grid">
          <Gallery images={product.images} name={product.name} />
          <motion.div className="pdp__info" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.1 }}>
            <span className="eyebrow eyebrow--gold">{categoryLabel(product.category)}{product.tag ? ` · ${product.tag}` : ""}</span>
            <h1>{product.name}</h1>
            <p className="pdp__price">{formatPrice(product.price)}</p>
            <StockMeter stock={product.stock} />
            {product.description && <p className="pdp__desc">{product.description}</p>}

            {specs.length > 0 && (
              <dl className="specs">
                {specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
            )}

            {sized && (
              <fieldset className="sizes">
                <legend className="field-label">Ring size {sizeError && <span className="sizes__err">— please choose one</span>}</legend>
                <div className="sizes__list">
                  {product.sizes.map((sz) => (
                    <button key={sz} type="button" className={`size ${size === sz ? "is-active" : ""}`} onClick={() => { setSize(sz); setSizeError(false); }} aria-pressed={size === sz}>
                      {sz}
                      {size === sz && <motion.span layoutId="size-bg" className="size__bg" transition={{ type: "spring", stiffness: 450, damping: 34 }} />}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="pdp__buy">
              {s.level !== "out" && <Stepper value={qty} max={Math.min(product.stock, 20)} onChange={setQty} />}
              <button className="btn btn--solid pdp__add" onClick={add} disabled={s.level === "out" || adding}>
                <ShoppingBag size={16} strokeWidth={1.3} />
                {s.level === "out" ? "Sold out" : adding ? "Adding…" : "Add to bag"}
              </button>
              <HeartButton product={product} className="pdp__wish" size={20} />
            </div>
            <button className="pdp__ask" onClick={() => navigate("/chat", { state: { product } })}>
              <MessageCircle size={16} strokeWidth={1.3} />
              {s.level === "out" ? "Ask us to notify you when it's back" : "Ask a jeweller about this piece"}
            </button>
            <div className="pdp__assure">
              <span>Certified & insured</span><span>Complimentary engraving</span><span>Reserve & collect in Talisay City</span>
            </div>

            <div className="accordion">
              <details open>
                <summary>How reservations work</summary>
                <div className="acc-body">Add pieces to your bag and reserve them online — we'll hold them for you and confirm by chat. Pay and collect at {SHOP.address}, {SHOP.hours[0][0]} {SHOP.hours[0][1]}.</div>
              </details>
              <details>
                <summary>Care & lifetime service</summary>
                <div className="acc-body">Store each piece separately in its pouch, away from perfume and chlorine. Bring it in any time for complimentary cleaning, inspection and re-polishing.</div>
              </details>
              <details>
                <summary>Sizing & alterations</summary>
                <div className="acc-body">Rings can be resized once for free within 60 days. Not sure of your size? Message us and we'll help you measure at home.</div>
              </details>
            </div>
          </motion.div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div><Reveal as="span" className="eyebrow">You may also love</Reveal><Reveal as="h2">More <em>{categoryLabel(product.category)}</em></Reveal></div>
              <Link to={`/shop?category=${product.category}`} className="link-line">View all <span className="arrow" /></Link>
            </div>
            <div className="grid grid--4">{related.map((p, k) => <ProductCard key={p.id} product={p} index={k} />)}</div>
          </div>
        </section>
      )}
    </div>
  );
}

