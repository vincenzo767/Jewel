import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { api } from "../../lib/api";
import { useShop } from "../../context/ShopContext";
import ProductCard, { CardSkeleton } from "../../components/ProductCard";
import { EmptyState, Reveal } from "../../components/ui";
import { formatPrice } from "../../lib/format";

export default function Favorites() {
  const { favorites } = useShop();
  const [items, setItems] = useState(null);

  useEffect(() => {
    document.title = "Favourites — Bryle's Diamonds";
    api.get("/favorites").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }, []);

  // Pieces un-hearted on this page leave the grid with an animation.
  const visible = useMemo(() => (items || []).filter((p) => favorites.has(p.id)), [items, favorites]);
  const total = visible.reduce((s, p) => s + Number(p.price), 0);

  return (
    <>
      <header className="page-hero page-hero--compact">
        <div className="container">
          <Reveal as="span" className="eyebrow eyebrow--gold">Your wishlist</Reveal>
          <h1 className="page-hero__title"><span className="split__line"><motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} style={{ display: "block" }}>Saved <em>for you</em></motion.span></span></h1>
          <div className="page-hero__meta">
            <p>Pieces you've fallen for. Stock changes quickly — reserve the ones you can't live without.</p>
            {visible.length > 0 && <span className="eyebrow">{visible.length} saved · {formatPrice(total)}</span>}
          </div>
        </div>
      </header>
      <section className="container shop-results">
        {items === null ? (
          <div className="grid">{Array.from({ length: 3 }).map((_, k) => <CardSkeleton key={k} />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Heart} title="Nothing saved yet." text="Tap the heart on any piece to keep it here for later.">
            <Link to="/shop" className="btn btn--solid">Discover the collection</Link>
          </EmptyState>
        ) : (
          <motion.div className="grid" layout>
            <AnimatePresence mode="popLayout">
              {visible.map((p, k) => <ProductCard key={p.id} product={p} index={k} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </>
  );
}
