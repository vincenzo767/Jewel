import { forwardRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useShop } from "../context/ShopContext";
import { formatPrice, stockInfo } from "../lib/format";
import { EASE, Frame, StockBadge } from "./ui";

export function HeartButton({ product, className = "card__wish", size = 18 }) {
  const { isFavorite, toggleFavorite } = useShop();
  const fav = isFavorite(product.id);
  const [burst, setBurst] = useState(0);
  const click = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const on = await toggleFavorite(product);
    if (on) setBurst((b) => b + 1);
  };
  return (
    <button className={`${className} ${fav ? "is-active" : ""}`} onClick={click} aria-pressed={fav} aria-label={fav ? `Remove ${product.name} from favourites` : `Save ${product.name} to favourites`}>
      <motion.span animate={fav ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 0.45 }} style={{ display: "grid" }}>
        <Heart size={size} strokeWidth={1.2} />
      </motion.span>
      <AnimatePresence>
        {burst > 0 && (
          <motion.span key={burst} className="burst" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, delay: 0.2 }} onAnimationComplete={() => setBurst(0)}>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <motion.i key={i} initial={{ x: 0, y: 0, scale: 0.4 }} animate={{ x: Math.cos(a) * 22, y: Math.sin(a) * 22, scale: 1 }} transition={{ duration: 0.6, ease: EASE }} />
              );
            })}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

const ProductCard = forwardRef(function ProductCard({ product, index = 0 }, ref) {
  const { addToCart } = useShop();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const s = stockInfo(product.stock);
  const sized = product.sizes?.length > 0;
  const alt = product.images?.[1];

  const quick = async (e) => {
    e.preventDefault();
    if (sized) { navigate(`/product/${product.id}`); return; }
    setAdding(true);
    await addToCart(product);
    setAdding(false);
  };

  return (
    <motion.article
      ref={ref}
      className={`card ${s.level === "out" ? "card--out" : ""}`}
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ duration: 0.8, ease: EASE, delay: Math.min(index, 8) * 0.06 }}
    >
      <div className="card__top">
        <Link to={`/product/${product.id}`} className="card__media" aria-label={product.name}>
          <Frame src={product.images?.[0]} alt={`${product.name}${product.metal ? ` — ${product.metal}` : ""}`} className="card__frame" />
          {alt && <img className="card__alt" src={alt} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
          {product.tag && <span className="card__tag">{product.tag}</span>}
          {s.level === "out" && <span className="card__soldout">Sold out</span>}
        </Link>
        <HeartButton product={product} />
        {s.level !== "out" && (
          <button className="card__quick" onClick={quick} disabled={adding}>
            {adding ? "Adding…" : sized ? "Choose a size" : "Add to bag"}
          </button>
        )}
      </div>
      <div className="card__info">
        <div>
          <Link to={`/product/${product.id}`} className="card__name">{product.name}</Link>
          <div className="card__meta">{product.metal}</div>
        </div>
        <div className="card__right">
          <span className="card__price">{formatPrice(product.price)}</span>
          <StockBadge stock={product.stock} />
        </div>
      </div>
    </motion.article>
  );
});

export default ProductCard;

export function CardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton" style={{ aspectRatio: "4 / 5" }} />
      <div style={{ paddingTop: 16, display: "grid", gap: 8 }}>
        <span className="skeleton" style={{ height: 18, width: "70%" }} />
        <span className="skeleton" style={{ height: 12, width: "40%" }} />
      </div>
    </div>
  );
}
