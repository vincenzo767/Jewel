import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, Gem, LayoutGrid, List, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES, categoryLabel, formatPrice } from "../../lib/format";
import { EASE, EmptyState, Frame, Modal, PageLoader, StockBadge, Toggle } from "../../components/ui";

export default function Products() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState(() => { try { return localStorage.getItem("bd_admin_view") || "grid"; } catch { return "grid"; } });
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    document.title = "Jewellery — Bryle's Diamonds Admin";
    api.get("/admin/products").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }, []);
  useEffect(() => { try { localStorage.setItem("bd_admin_view", view); } catch { /* per-viewer preference only */ } }, [view]);

  const filtered = useMemo(() => (items || []).filter((p) =>
    (!cat || p.category === cat)
    && (status === "all" || (status === "live" ? p.active : status === "hidden" ? !p.active : status === "featured" ? p.featured : p.stock <= 3))
    && (!q.trim() || `${p.name} ${p.metal || ""} ${p.stone || ""} ${p.tag || ""}`.toLowerCase().includes(q.trim().toLowerCase()))
  ), [items, cat, status, q]);

  const patch = async (p, body) => {
    try {
      const { data } = await api.patch(`/admin/products/${p.id}/visibility`, body);
      setItems((xs) => xs.map((x) => (x.id === data.id ? data : x)));
      if ("active" in body) toast(body.active ? `${p.name} is now live` : `${p.name} is hidden from customers`);
      else toast(body.featured ? `${p.name} featured on the home page` : `${p.name} removed from featured`);
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  const remove = async () => {
    const p = deleting;
    setDeleting(null);
    try {
      await api.delete(`/admin/products/${p.id}`);
      setItems((xs) => xs.filter((x) => x.id !== p.id));
      toast(`${p.name} deleted`);
    } catch (e) { toast(errorMessage(e), "error"); }
  };

  if (items === null) return <PageLoader inline />;

  return (
    <div>
      <div className="toolbar">
        <label className="toolbar__search">
          <Search size={16} strokeWidth={1.3} />
          <span className="sr-only">Search jewellery</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, metal, stone…" maxLength={60} />
        </label>
        <select className="select toolbar__select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select className="select toolbar__select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="hidden">Hidden</option>
          <option value="featured">Featured</option>
          <option value="low">Low / sold out</option>
        </select>
        <div className="segmented" role="group" aria-label="View">
          <button className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Grid view"><LayoutGrid size={16} strokeWidth={1.3} /></button>
          <button className={view === "table" ? "is-active" : ""} onClick={() => setView("table")} aria-label="Table view"><List size={16} strokeWidth={1.3} /></button>
        </div>
        <Link to="/admin/products/new" className="btn btn--solid btn--sm toolbar__add"><Plus size={15} strokeWidth={1.5} /> Add piece</Link>
      </div>
      <p className="toolbar__count">{filtered.length} of {items.length} pieces</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Gem} title={items.length ? "No pieces match." : "Your catalogue is empty."} text={items.length ? "Try a different search or filter." : "Upload your first piece — customers will see it the moment it's live."}>
          <Link to="/admin/products/new" className="btn btn--solid">Add a piece</Link>
        </EmptyState>
      ) : view === "grid" ? (
        <motion.div className="aprod-grid" layout>
          <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <motion.article key={p.id} layout className={`aprod ${!p.active ? "aprod--hidden" : ""}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 12) * 0.03 }}>
                <Link to={`/admin/products/${p.id}`} className="aprod__media">
                  <Frame src={p.images[0]} alt={p.name} className="aprod__frame" />
                  <span className="aprod__flags">
                    {!p.active && <span className="chip chip--mute"><EyeOff size={11} /> Hidden</span>}
                    {p.featured && <span className="chip chip--gold"><Star size={11} /> Featured</span>}
                  </span>
                  <span className="aprod__edit"><Pencil size={14} strokeWidth={1.4} /> Edit</span>
                </Link>
                <div className="aprod__body">
                  <span className="eyebrow">{categoryLabel(p.category)}</span>
                  <Link to={`/admin/products/${p.id}`} className="aprod__name">{p.name}</Link>
                  <div className="aprod__row"><strong>{formatPrice(p.price)}</strong><StockBadge stock={p.stock} /></div>
                  <div className="aprod__foot">
                    <Toggle checked={p.active} onChange={(v) => patch(p, { active: v })} label={p.active ? "Live" : "Hidden"} />
                    <div>
                      <button className={`icon-btn ${p.featured ? "is-gold" : ""}`} onClick={() => patch(p, { featured: !p.featured })} aria-label={p.featured ? "Unfeature" : "Feature on home page"} title="Feature on home page"><Star size={16} strokeWidth={1.3} /></button>
                      <button className="icon-btn" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`} title="Delete"><Trash2 size={16} strokeWidth={1.3} /></button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="panel"><div className="table-wrap">
          <table className="table">
            <thead><tr><th>Piece</th><th>Category</th><th>Price</th><th>Stock</th><th>Live</th><th /></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/admin/products/${p.id}`} className="table-product"><Frame src={p.images[0]} alt="" className="table-product__img" /><span><strong>{p.name}</strong><small>{p.metal}</small></span></Link></td>
                  <td>{categoryLabel(p.category)}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td><StockBadge stock={p.stock} /> <span className="muted">({p.stock})</span></td>
                  <td><Toggle checked={p.active} onChange={(v) => patch(p, { active: v })} /></td>
                  <td className="table-actions">
                    <Link to={`/admin/products/${p.id}`} className="icon-btn" aria-label="Edit"><Pencil size={15} strokeWidth={1.3} /></Link>
                    <button className="icon-btn" onClick={() => setDeleting(p)} aria-label="Delete"><Trash2 size={15} strokeWidth={1.3} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      <Modal open={!!deleting} onClose={() => setDeleting(null)} eyebrow="Delete piece" title={`Delete ${deleting?.name}?`}>
        <p className="muted">It will disappear from the shop, customers' bags and favourites. Past reservations keep their record. This can't be undone — to take it off sale temporarily, hide it instead.</p>
        <div className="modal__actions">
          <button className="btn" onClick={() => { patch(deleting, { active: false }); setDeleting(null); }}>Hide instead</button>
          <button className="btn btn--danger" onClick={remove}>Delete permanently</button>
        </div>
      </Modal>
    </div>
  );
}
