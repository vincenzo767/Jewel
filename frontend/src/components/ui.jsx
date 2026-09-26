import { forwardRef, useCallback, useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { initials, stockInfo } from "../lib/format";

export const EASE = [0.22, 1, 0.36, 1];

/** Fade-and-rise on scroll into view, like the landing page's [data-reveal]. */
export function Reveal({ as = "div", delay = 0, y = 36, className, children, ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.1, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Headline whose lines rise out of a mask, like the landing page's .split-lines. */
// The heading (not the clipped lines) is observed: a line pushed below its overflow:hidden mask
// never intersects the viewport, so it would never trigger on its own.
export function SplitTitle({ lines, as = "h2", className = "", delay = 0 }) {
  const Tag = motion[as] || motion.h2;
  return (
    <Tag className={`split ${className}`} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px 0px -5% 0px" }}>
      {lines.map((line, i) => (
        <span className="split__line" key={i}>
          <motion.span
            style={{ display: "block" }}
            variants={{
              hidden: { y: "105%" },
              show: { y: 0, transition: { duration: 1.2, ease: EASE, delay: delay + i * 0.12 } },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Image in a sand-toned frame that fades in when loaded, with an optional mask reveal. */
export function Frame({ src, alt = "", className = "", mask = false, children, imgClassName = "", eager = false, ...rest }) {
  // Track *which* src loaded rather than a boolean reset by an effect: a cached image can fire
  // `load` before effects run, and resetting afterwards would hide it forever.
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [brokenSrc, setBrokenSrc] = useState(null);
  const loaded = loadedSrc === src;
  const markIfComplete = useCallback((el) => {
    if (el && el.complete && el.naturalWidth > 0) setLoadedSrc(el.getAttribute("src"));
  }, []);
  const img = src && brokenSrc !== src ? (
    <img
      ref={markIfComplete}
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`${imgClassName} ${loaded ? "is-loaded" : ""}`}
      onLoad={() => setLoadedSrc(src)}
      onError={() => setBrokenSrc(src)}
      draggable={false}
    />
  ) : null;
  if (!mask) return <div className={`frame ${className}`} {...rest}>{img}{children}</div>;
  return (
    <motion.div
      className={`frame ${className}`}
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ clipPath: "inset(0% 0 0 0)" }}
      viewport={{ once: true, margin: "0px 0px -5% 0px" }}
      transition={{ duration: 1.5, ease: EASE }}
      {...rest}
    >
      {img}{children}
    </motion.div>
  );
}

export const Field = forwardRef(function Field(
  { label, error, as = "input", className = "", hint, right, ...props }, ref
) {
  const id = useId();
  const Tag = as;
  return (
    <div className={`field ${error ? "has-error" : ""} ${className}`}>
      <Tag id={id} ref={ref} placeholder=" " aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      <label htmlFor={id}>{label}</label>
      <span className="field__bar" />
      {right && <div className="field__right">{right}</div>}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.span
            key="err"
            id={`${id}-err`}
            className="field__error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.span>
        ) : hint ? <span className="field__hint">{hint}</span> : null}
      </AnimatePresence>
    </div>
  );
});

export function SelectField({ label, children, className = "", ...props }) {
  const id = useId();
  return (
    <div className={`field field--select ${className}`}>
      <select id={id} {...props}>{children}</select>
      <label htmlFor={id}>{label}</label>
      <span className="field__bar" />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`toggle ${disabled ? "is-disabled" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="toggle__track"><motion.span className="toggle__thumb" layout transition={{ type: "spring", stiffness: 500, damping: 32 }} /></span>
      {(label || description) && (
        <span className="toggle__text">{label && <strong>{label}</strong>}{description && <small>{description}</small>}</span>
      )}
    </label>
  );
}

export function Stepper({ value, min = 1, max = 99, onChange, size = "md", disabled }) {
  return (
    <div className={`stepper stepper--${size}`}>
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min}><Minus size={14} strokeWidth={1.4} /></button>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.2 }}>
          {value}
        </motion.span>
      </AnimatePresence>
      <button type="button" aria-label="Increase" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max}><Plus size={14} strokeWidth={1.4} /></button>
    </div>
  );
}

export function Avatar({ name, src, size = 40, className = "" }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : <span>{initials(name) || "·"}</span>}
    </span>
  );
}

export function StockBadge({ stock, className = "" }) {
  const s = stockInfo(stock);
  return <span className={`stock-badge stock-badge--${s.level} ${className}`}><i />{s.short}</span>;
}

/** An animated availability bar: full at 10+ pieces. */
export function StockMeter({ stock }) {
  const s = stockInfo(stock);
  const pct = Math.min(100, (stock / 10) * 100);
  return (
    <div className={`stock-meter stock-meter--${s.level}`}>
      <div className="stock-meter__row">
        <span className="stock-meter__label"><i />{s.label}</span>
        {s.level === "low" && <span className="stock-meter__hint">Selling quickly</span>}
      </div>
      <div className="stock-meter__track">
        <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: pct / 100 }} transition={{ duration: 1.4, ease: EASE, delay: 0.3 }} />
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, eyebrow, children, width = 560, className = "" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
          <motion.div
            className={`modal ${className}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, transition: { duration: 0.2 } }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <button className="modal__close" onClick={onClose} aria-label="Close"><X size={20} strokeWidth={1.2} /></button>
            {eyebrow && <span className="eyebrow eyebrow--gold">{eyebrow}</span>}
            {title && <h3 className="modal__title">{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
      {Icon && <span className="empty__icon"><Icon size={26} strokeWidth={1} /></span>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </motion.div>
  );
}

export function Skeleton({ className = "", style }) {
  return <span className={`skeleton ${className}`} style={style} />;
}

export function PageLoader({ inline = false }) {
  return (
    <div className={`page-loader ${inline ? "page-loader--inline" : ""}`} role="status" aria-label="Loading">
      <span className="page-loader__mark">B·D</span>
      <span className="page-loader__line" />
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

/** Counts up from 0 when it first scrolls into view. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-PH"), duration = 1.4 }) {
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) return undefined;
    const target = Number(value) || 0;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      setShown(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, started, duration]);
  return <motion.span onViewportEnter={() => setStarted(true)} viewport={{ once: true }}>{format(shown)}</motion.span>;
}

export function Badge({ count, className = "" }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span key="b" className={`badge ${className}`} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
