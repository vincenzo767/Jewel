import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Search, SearchX, X } from "lucide-react";
import { api } from "../../lib/api";
import { CATEGORIES, categoryLabel } from "../../lib/format";
import ProductCard, { CardSkeleton } from "../../components/ProductCard";
import { EmptyState, Reveal, Toggle } from "../../components/ui";

const SORTS = [
  ["featured", "Featured"],
  ["new", "Newest"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["name", "Name A–Z"],
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const sort = params.get("sort") || "featured";
  const inStock = params.get("inStock") === "1";
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const [products, setProducts] = useState(null);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  useEffect(() => { setSearch(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => search !== q && update({ q: search.trim() }), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.title = `${category ? categoryLabel(category) : "Shop"} — Bryle's Diamonds`;
    let cancelled = false;
    setProducts(null);
    api.get("/products", { params: { category: category || undefined, sort, inStock: inStock || undefined, q: q || undefined } })
      .then(({ data }) => !cancelled && setProducts(data))
      .catch(() => !cancelled && setProducts([]));
    return () => { cancelled = true; };
  }, [category, sort, inStock, q]);

  const title = useMemo(() => (category ? categoryLabel(category) : "Fine Jewellery"), [category]);

  return (
    <>
      <header className="page-hero">
        <div className="container">
          <Reveal as="span" className="eyebrow eyebrow--gold">The Collection · Autumn / Winter 2026</Reveal>
          <h1 className="page-hero__title">
            <AnimatePresence mode="wait">
              <motion.span key={title} className="split__line" style={{ display: "block" }}>
                <motion.span initial={{ y: "105%" }} animate={{ y: 0 }} exit={{ y: "-105%" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ display: "block" }}>
                  {category ? <em>{title}</em> : <>Fine <em>Jewellery</em></>}
                </motion.span>
              </motion.span>
            </AnimatePresence>
          </h1>
          <div className="page-hero__meta">
            <p>Every piece below is hand-finished in our Cebu atelier and available to reserve for pickup at the shop.</p>
            <span className="eyebrow">{products ? `${products.length} piece${products.length === 1 ? "" : "s"}` : "Loading…"}</span>
          </div>
        </div>
      </header>

      <div className="filters">
        <div className="container filters__inner">
          <LayoutGroup id="cats">
            <div className="filters__cats" role="group" aria-label="Category">
              {[["", "All"], ...CATEGORIES.map((c) => [c.key, c.label])].map(([key, label]) => (
                <button key={key || "all"} className={`chip-tab ${category === key ? "is-active" : ""}`} aria-pressed={category === key} onClick={() => update({ category: key })}>
                  {label}
                  {category === key && <motion.span layoutId="cat-line" className="chip-tab__line" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                </button>
              ))}
            </div>
          </LayoutGroup>
          <div className="filters__right">
            <label className="filters__search">
              <Search size={15} strokeWidth={1.3} />
              <span className="sr-only">Search pieces</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pieces" maxLength={60} />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={14} strokeWidth={1.3} /></button>}
            </label>
            <Toggle checked={inStock} onChange={(v) => update({ inStock: v ? "1" : "" })} label="In stock" />
            <label className="filters__sort">
              <span className="sr-only">Sort by</span>
              <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value === "featured" ? "" : e.target.value })}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>

      <section className="container shop-results">
        {q && products && (
          <p className="results-note">Showing results for <em>“{q}”</em> <button className="text-btn" onClick={() => update({ q: "" })}>Clear</button></p>
        )}
        {products === null ? (
          <div className="grid">{Array.from({ length: 6 }).map((_, k) => <CardSkeleton key={k} />)}</div>
        ) : products.length === 0 ? (
          <EmptyState icon={SearchX} title="Nothing matches — yet." text="Try another search or category, or ask our jewellers about commissioning something bespoke.">
            <button className="btn btn--solid" onClick={() => setParams({}, { replace: true })}>Reset filters</button>
          </EmptyState>
        ) : (
          <motion.div className="grid" layout>
            <AnimatePresence mode="popLayout">
              {products.map((p, k) => <ProductCard key={p.id} product={p} index={k} />)}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </>
  );
}
