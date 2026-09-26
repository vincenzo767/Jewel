import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { ArrowLeft, ImagePlus, Link2, Star, Trash2, UploadCloud } from "lucide-react";
import { api, errorMessage, fieldErrors, uploadImage } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES, categoryLabel, formatPrice } from "../../lib/format";
import { Field, PageLoader, SelectField, Spinner, Stepper, StockBadge, Toggle } from "../../components/ui";

const EMPTY = { name: "", category: "RINGS", description: "", tag: "", metal: "", stone: "", carat: "", clarity: "", sizes: "", price: "", stock: 1, active: true, featured: false };
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];
let seq = 0;

function ImageManager({ images, setImages, error }) {
  const toast = useToast();
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);

  const addFiles = (files) => {
    const list = [...files].slice(0, 8 - images.length);
    if (files.length > list.length) toast("A piece can have up to 8 images.", "error");
    list.forEach(async (file) => {
      if (!ACCEPT.includes(file.type)) { toast(`${file.name}: only JPG, PNG, WEBP or GIF.`, "error"); return; }
      if (file.size > 5 * 1024 * 1024) { toast(`${file.name} is over 5 MB.`, "error"); return; }
      const key = `u${++seq}`;
      const preview = URL.createObjectURL(file);
      setImages((xs) => [...xs, { key, url: null, preview, progress: 0 }]);
      try {
        const { url: uploaded } = await uploadImage("/admin/uploads", file, (p) => setImages((xs) => xs.map((x) => (x.key === key ? { ...x, progress: p } : x))));
        setImages((xs) => xs.map((x) => (x.key === key ? { key, url: uploaded, preview } : x)));
      } catch (e) {
        toast(errorMessage(e), "error");
        setImages((xs) => xs.filter((x) => x.key !== key));
        URL.revokeObjectURL(preview);
      }
    });
  };

  const addUrl = () => {
    const v = url.trim();
    if (!/^https:\/\/\S+$/i.test(v)) { toast("Please paste a secure https:// image link.", "error"); return; }
    if (images.length >= 8) { toast("A piece can have up to 8 images.", "error"); return; }
    setImages((xs) => [...xs, { key: `l${++seq}`, url: v }]);
    setUrl("");
  };

  return (
    <div className={`imgman ${error ? "has-error" : ""}`}>
      <div
        className={`dropzone ${drag ? "is-drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
      >
        <motion.span animate={drag ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }} className="dropzone__icon"><UploadCloud size={30} strokeWidth={1} /></motion.span>
        <strong>{drag ? "Release to upload" : "Drop photos here or click to browse"}</strong>
        <small>JPG, PNG, WEBP or GIF · up to 5 MB each · max 8 images. Drag thumbnails to reorder — the first is the cover.</small>
        <input ref={fileRef} type="file" accept={ACCEPT.join(",")} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {images.length > 0 && (
        <Reorder.Group axis="x" values={images} onReorder={setImages} className="thumbs">
          <AnimatePresence initial={false}>
            {images.map((img, i) => (
              <Reorder.Item key={img.key} value={img} className="thumb" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} whileDrag={{ scale: 1.06, boxShadow: "0 20px 40px -12px rgba(0,0,0,.35)", zIndex: 5 }}>
                <img src={img.preview || img.url} alt="" draggable={false} />
                {i === 0 && <span className="thumb__cover"><Star size={10} /> Cover</span>}
                {img.url === null && (
                  <span className="thumb__progress"><span style={{ transform: `scaleX(${(img.progress || 0) / 100})` }} /><em>{img.progress || 0}%</em></span>
                )}
                <button type="button" className="thumb__remove" onClick={() => setImages((xs) => xs.filter((x) => x.key !== img.key))} aria-label="Remove image"><Trash2 size={13} strokeWidth={1.4} /></button>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
      <div className="imgman__url">
        <Link2 size={15} strokeWidth={1.3} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an https:// image link" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())} maxLength={400} />
        <button type="button" className="text-btn" onClick={addUrl}>Add</button>
      </div>
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

export default function ProductEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(isNew ? EMPTY : null);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${isNew ? "New piece" : "Edit piece"} — Bryle's Diamonds Admin`;
    if (isNew) return;
    api.get(`/products/${id}`).then(({ data }) => {
      setForm({
        name: data.name, category: data.category, description: data.description || "", tag: data.tag || "", metal: data.metal || "",
        stone: data.stone || "", carat: data.carat || "", clarity: data.clarity || "", sizes: data.sizes.join(", "),
        price: String(data.price), stock: data.stock, active: data.active, featured: data.featured,
      });
      setImages(data.images.map((url) => ({ key: `e${++seq}`, url })));
    }).catch(() => { toast("That piece could not be found.", "error"); navigate("/admin/products", { replace: true }); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!form) return <PageLoader inline />;

  const set = (k) => (e) => { const v = e?.target ? e.target.value : e; setForm((f) => ({ ...f, [k]: v })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const uploading = images.some((i) => i.url === null);

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Give the piece a name.";
    const price = Number(form.price);
    if (form.price === "" || !Number.isFinite(price) || price < 0) errs.price = "Enter a valid price.";
    if (!images.length) errs.images = "Add at least one image.";
    if (form.sizes && !/^[0-9A-Za-z.,/ ]*$/.test(form.sizes)) errs.sizes = "Use a comma-separated list, e.g. 5, 6, 7.";
    setErrors(errs);
    if (Object.keys(errs).length) { toast("Please check the highlighted fields.", "error"); return; }
    setBusy(true);
    const body = { ...form, price, stock: Number(form.stock) || 0, images: images.map((i) => i.url) };
    try {
      if (isNew) await api.post("/admin/products", body);
      else await api.put(`/admin/products/${id}`, body);
      toast(isNew ? `${form.name} added to the collection` : "Changes saved");
      navigate("/admin/products");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const preview = images[0]?.preview || images[0]?.url;
  const stockNum = Number(form.stock) || 0;

  return (
    <form className="editor" onSubmit={save} noValidate>
      <div className="editor__main">
        <Link to="/admin/products" className="back-link"><ArrowLeft size={15} strokeWidth={1.3} /> All jewellery</Link>

        <section className="panel">
          <header className="panel__head"><div><span className="eyebrow">01</span><h3>Photography</h3></div><ImagePlus size={18} strokeWidth={1.2} className="panel__warn" /></header>
          <ImageManager images={images} setImages={setImages} error={errors.images} />
        </section>

        <section className="panel">
          <header className="panel__head"><div><span className="eyebrow">02</span><h3>The piece</h3></div></header>
          <div className="form-grid">
            <Field className="full" label="Name *" value={form.name} onChange={set("name")} error={errors.name} maxLength={120} />
            <SelectField label="Category" value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </SelectField>
            <Field label="Label (e.g. New, Signature)" value={form.tag} onChange={set("tag")} error={errors.tag} maxLength={32} />
            <Field className="full" as="textarea" label="Description" value={form.description} onChange={set("description")} error={errors.description} maxLength={2000} rows={4} hint={`${form.description.length} / 2000`} />
          </div>
        </section>

        <section className="panel">
          <header className="panel__head"><div><span className="eyebrow">03</span><h3>Details</h3></div></header>
          <div className="form-grid">
            <Field label="Metal" value={form.metal} onChange={set("metal")} maxLength={80} />
            <Field label="Stone" value={form.stone} onChange={set("stone")} maxLength={120} />
            <Field label="Carat" value={form.carat} onChange={set("carat")} maxLength={60} />
            <Field label="Clarity / quality" value={form.clarity} onChange={set("clarity")} maxLength={60} />
            <Field className="full" label="Sizes customers can choose (comma-separated)" value={form.sizes} onChange={set("sizes")} error={errors.sizes} maxLength={120} hint="Leave empty for one-size pieces. Rings usually 5, 6, 7, 8, 9." />
          </div>
        </section>
      </div>

      <aside className="editor__side">
        <section className="panel">
          <header className="panel__head"><div><span className="eyebrow">04</span><h3>Price & stock</h3></div></header>
          <Field label="Price (₱) *" type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={set("price")} error={errors.price} />
          <div className="editor__stock">
            <span className="field-label">Units available</span>
            <div className="editor__stock-row">
              <Stepper value={stockNum} min={0} max={100000} onChange={set("stock")} />
              <input type="number" min="0" max="100000" value={form.stock} onChange={set("stock")} aria-label="Units available" className="editor__stock-input" />
              <StockBadge stock={stockNum} />
            </div>
          </div>
          <div className="editor__toggles">
            <Toggle checked={form.active} onChange={set("active")} label="Published" description="Visible to customers in the shop." />
            <Toggle checked={form.featured} onChange={set("featured")} label="Featured" description="Shown on the customer home page." />
          </div>
        </section>

        <section className="panel preview">
          <span className="eyebrow">Customer preview</span>
          <motion.div className="preview__card" layout>
            <div className="preview__img">
              <AnimatePresence mode="wait">
                {preview ? <motion.img key={preview} src={preview} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /> : <span className="preview__ph">✦</span>}
              </AnimatePresence>
              {form.tag && <span className="card__tag">{form.tag}</span>}
              {!form.active && <span className="preview__hidden">Hidden</span>}
            </div>
            <div className="card__info">
              <div><span className="card__name">{form.name || "Untitled piece"}</span><div className="card__meta">{form.metal || categoryLabel(form.category)}</div></div>
              <div className="card__right"><span className="card__price">{formatPrice(form.price)}</span><StockBadge stock={stockNum} /></div>
            </div>
          </motion.div>
        </section>

        <div className="editor__save">
          <button className="btn btn--solid btn--block" disabled={busy || uploading}>
            {busy ? <><Spinner /> Saving</> : uploading ? <><Spinner /> Uploading images</> : isNew ? "Publish piece" : "Save changes"}
          </button>
          <Link to="/admin/products" className="btn btn--block">Cancel</Link>
        </div>
      </aside>
    </form>
  );
}

