import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { categoryLabel, formatPrice, LOW_STOCK } from "../../lib/format";
import { CountUp, EASE, Frame, PageLoader, Stepper, StockBadge } from "../../components/ui";

function StockCell({ product, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(product.stock);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setValue(product.stock), [product.stock]);
  const dirty = value !== product.stock;

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/products/${product.id}/stock`, { stock: value });
      onSaved(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (e) {
      toast(errorMessage(e), "error");
      setValue(product.stock);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stock-cell">
      <Stepper size="sm" value={value} min={0} max={100000} onChange={setValue} />
      {dirty ? (
        <motion.button initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="btn btn--sm btn--emerald" onClick={save} disabled={saving}>{saving ? "Saving" : "Save"}</motion.button>
      ) : saved ? (
        <motion.span className="stock-cell__ok" initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={14} strokeWidth={2} /></motion.span>
      ) : null}
    </div>
  );
}

export default function Inventory() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Inventory — Bryle's Diamonds Admin";
    api.get("/admin/products").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }, []);

  const totals = useMemo(() => {
    const xs = items || [];
    return {
      units: xs.reduce((s, p) => s + p.stock, 0),
      value: xs.reduce((s, p) => s + p.stock * Number(p.price), 0),
      low: xs.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length,
      out: xs.filter((p) => p.stock === 0).length,
    };
  }, [items]);

  const rows = useMemo(() => (items || [])
    .filter((p) => filter === "all" || (filter === "low" ? p.stock > 0 && p.stock <= LOW_STOCK : filter === "out" ? p.stock === 0 : p.stock > LOW_STOCK))
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.stock - b.stock), [items, filter, q]);

  if (items === null) return <PageLoader inline />;

  const onSaved = (data) => setItems((xs) => xs.map((x) => (x.id === data.id ? data : x)));

  return (
    <div>
      <div className="inv-stats">
        {[["Units on hand", totals.units], ["Retail value", totals.value, (n) => formatPrice(n)], ["Low stock", totals.low], ["Sold out", totals.out]].map(([label, v, fmt], i) => (
          <motion.div key={label} className="inv-stat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: i * 0.07 }}>
            <span className="eyebrow">{label}</span>
            <strong><CountUp value={v} format={fmt} /></strong>
          </motion.div>
        ))}
      </div>

      <div className="toolbar">
        <div className="pills">
          {[["all", "All"], ["low", "Low stock"], ["out", "Sold out"], ["ok", "Healthy"]].map(([k, l]) => (
            <button key={k} className={`pill ${filter === k ? "is-active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <label className="toolbar__search">
          <Search size={16} strokeWidth={1.3} />
          <span className="sr-only">Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a piece" maxLength={60} />
        </label>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Piece</th><th>Category</th><th>Price</th><th>Status</th><th>Units available</th><th>Value</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.stock === 0 ? "row--out" : p.stock <= LOW_STOCK ? "row--low" : ""}>
                  <td><Link to={`/admin/products/${p.id}`} className="table-product"><Frame src={p.images[0]} alt="" className="table-product__img" /><span><strong>{p.name}</strong><small>{p.active ? "Live" : "Hidden"}</small></span></Link></td>
                  <td>{categoryLabel(p.category)}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td><StockBadge stock={p.stock} /></td>
                  <td><StockCell product={p} onSaved={onSaved} /></td>
                  <td>{formatPrice(p.stock * Number(p.price))}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 40 }}>No pieces in this view.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
