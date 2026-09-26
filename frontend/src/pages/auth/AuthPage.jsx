import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCurtain } from "../../components/Curtain";
import { EASE, Field, Modal, Spinner } from "../../components/ui";
import { errorMessage, fieldErrors } from "../../lib/api";
import { firstName, SHOP } from "../../lib/format";
import { homeFor } from "../../lib/routes";

const SLIDES = [
  { src: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1600&q=80", caption: "Étoile Tennis Bracelet" },
  { src: "https://images.unsplash.com/photo-1633810542706-90e5ff7557be?auto=format&fit=crop&w=1600&q=80", caption: "The Signature Edit" },
  { src: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1600&q=80", caption: "The Bridal Atelier" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[\p{L}][\p{L} .'-]{1,79}$/u;
const PHONE_RE = /^[+0-9 ()-]{7,20}$/;

const RULES = [
  { key: "len", label: "8+ characters", test: (p) => p.length >= 8 && p.length <= 72 },
  { key: "upper", label: "Upper case", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "Lower case", test: (p) => /[a-z]/.test(p) },
  { key: "digit", label: "A number", test: (p) => /\d/.test(p) },
  { key: "symbol", label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function strength(p) {
  if (!p) return { score: 0, label: "" };
  let score = RULES.filter((r) => r.test(p)).length;
  if (p.length >= 12) score += 1;
  if (/(.)\1{2,}/.test(p) || /^(password|12345|qwerty)/i.test(p)) score = Math.max(1, score - 2);
  const labels = ["", "Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score, label: labels[Math.min(score, 6)] };
}

function PasswordInput({ value, onChange, label, error, autoComplete, onCaps, name }) {
  const [show, setShow] = useState(false);
  return (
    <Field
      label={label}
      type={show ? "text" : "password"}
      name={name}
      value={value}
      onChange={onChange}
      error={error}
      autoComplete={autoComplete}
      maxLength={72}
      spellCheck={false}
      onKeyUp={(e) => onCaps?.(e.getModifierState?.("CapsLock"))}
      right={
        <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} style={{ width: 34, height: 34 }}>
          {show ? <EyeOff size={17} strokeWidth={1.2} /> : <Eye size={17} strokeWidth={1.2} />}
        </button>
      }
    />
  );
}

function ErrorBanner({ message, controls }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="auth-alert"
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <motion.div animate={controls} className="auth-alert__inner">
            <AlertCircle size={17} strokeWidth={1.4} />
            <span>{message}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SignInForm({ onDone, switchTo }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [caps, setCaps] = useState(false);
  const [forgot, setForgot] = useState(false);
  const shake = useAnimationControls();

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RE.test(form.email.trim())) errs.email = "Please enter a valid email address.";
    if (!form.password) errs.password = "Please enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setMessage("");
    try {
      const user = await login(form.email.trim(), form.password);
      onDone(user);
    } catch (err) {
      setMessage(errorMessage(err));
      setForm((f) => ({ ...f, password: "" }));
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.5 } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="auth-form">
      <ErrorBanner message={message} controls={shake} />
      <Field label="Email address" type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="username" maxLength={160} autoFocus />
      <PasswordInput label="Password" value={form.password} onChange={set("password")} error={errors.password} autoComplete="current-password" onCaps={setCaps} name="password" />
      <AnimatePresence>{caps && <motion.p className="auth-caps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Caps Lock is on</motion.p>}</AnimatePresence>
      <div className="auth-row">
        <span className="auth-secure"><Lock size={13} strokeWidth={1.4} /> Encrypted session</span>
        <button type="button" className="text-btn" onClick={() => setForgot(true)}>Forgot password?</button>
      </div>
      <button className="btn btn--solid btn--block auth-submit" disabled={busy}>
        {busy ? <><Spinner /> Signing in</> : <>Enter the House <ArrowRight size={16} strokeWidth={1.2} /></>}
      </button>
      <p className="auth-switch">New to Bryle's? <button type="button" onClick={switchTo}>Create an account</button></p>

      <Modal open={forgot} onClose={() => setForgot(false)} eyebrow="Account help" title="Reset your password">
        <p className="muted">For your security, password resets are handled personally by our team. Call us or visit the shop with a valid ID and we'll restore access the same day.</p>
        <p style={{ fontFamily: "var(--serif)", fontSize: "1.3rem", margin: "18px 0 4px" }}>{SHOP.phone}</p>
        <p className="muted" style={{ fontSize: ".9rem" }}>{SHOP.address}</p>
        <div className="modal__actions"><button className="btn btn--solid" onClick={() => setForgot(false)}>Understood</button></div>
      </Modal>
    </form>
  );
}

function RegisterForm({ onDone, switchTo }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "", website: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [caps, setCaps] = useState(false);
  const shake = useAnimationControls();
  const s = useMemo(() => strength(form.password), [form.password]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const validate = () => {
    const errs = {};
    const name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    if (!NAME_RE.test(name)) errs.fullName = "Please enter your full name (letters only).";
    if (!EMAIL_RE.test(email)) errs.email = "Please enter a valid email address.";
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) errs.phone = "Please enter a valid phone number.";
    if (!RULES.every((r) => r.test(form.password))) errs.password = "Please meet every password requirement below.";
    else if (email && form.password.toLowerCase().includes(email.split("@")[0])) errs.password = "Your password shouldn't contain your email name.";
    if (form.confirm !== form.password) errs.confirm = "Passwords don't match.";
    if (!agree) errs.agree = "Please accept the privacy terms to continue.";
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) { shake.start({ x: [0, -8, 7, -4, 0], transition: { duration: 0.4 } }); return; }
    setBusy(true);
    setMessage("");
    try {
      const user = await register({
        fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(),
        password: form.password, website: form.website,
      });
      onDone(user, true);
    } catch (err) {
      setErrors(fieldErrors(err));
      setMessage(errorMessage(err));
      shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.5 } });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="auth-form">
      <ErrorBanner message={message} controls={shake} />
      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it in. */}
      <div className="hp" aria-hidden="true">
        <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
      </div>
      <div className="form-grid">
        <Field className="full" label="Full name" value={form.fullName} onChange={set("fullName")} error={errors.fullName} autoComplete="name" maxLength={80} autoFocus />
        <Field label="Email address" type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" maxLength={160} />
        <Field label="Mobile (optional)" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" maxLength={20} />
        <div className="full">
          <PasswordInput label="Create password" value={form.password} onChange={set("password")} error={errors.password} autoComplete="new-password" onCaps={setCaps} name="new-password" />
          <div className="strength" aria-live="polite">
            <div className="strength__bars">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} className={i <= s.score ? `on s${Math.min(s.score, 6)}` : ""} />
              ))}
            </div>
            <span className="strength__label">{s.label}</span>
          </div>
          <ul className="rules">
            {RULES.map((r) => {
              const ok = r.test(form.password);
              return (
                <li key={r.key} className={ok ? "ok" : ""}>
                  <motion.span animate={{ scale: ok ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.35 }} className="rules__dot">{ok && <Check size={10} strokeWidth={2.4} />}</motion.span>
                  {r.label}
                </li>
              );
            })}
          </ul>
          <AnimatePresence>{caps && <motion.p className="auth-caps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Caps Lock is on</motion.p>}</AnimatePresence>
        </div>
        <div className="full">
          <PasswordInput label="Confirm password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} autoComplete="new-password" name="confirm-password" />
        </div>
      </div>
      <label className={`check auth-agree ${errors.agree ? "has-error" : ""}`}>
        <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors((x) => ({ ...x, agree: undefined })); }} />
        <span>I agree that Bryle's Diamonds may store my details to manage my account and reservations, as described in the <a href="/privacy.html" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>Privacy Policy</a> and <a href="/terms.html" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>Terms</a>.</span>
      </label>
      {errors.agree && <span className="field__error">{errors.agree}</span>}
      <button className="btn btn--solid btn--block auth-submit" disabled={busy}>
        {busy ? <><Spinner /> Creating account</> : <>Create my account <ArrowRight size={16} strokeWidth={1.2} /></>}
      </button>
      <p className="auth-switch">Already a client? <button type="button" onClick={switchTo}>Sign in</button></p>
    </form>
  );
}

export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "register" ? "register" : "login";
  const navigate = useNavigate();
  const location = useLocation();
  const play = useCurtain();
  const [slide, setSlide] = useState(0);
  const timer = useRef();

  useEffect(() => {
    timer.current = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer.current);
  }, []);

  useEffect(() => { document.title = mode === "register" ? "Create an account — Bryle's Diamonds" : "Sign in — Bryle's Diamonds"; }, [mode]);

  const setMode = (m) => setParams(m === "register" ? { mode: "register" } : {}, { replace: true });

  const onDone = (user, isNew) => {
    const from = location.state?.from;
    const dest = from && (user.role === "ADMIN" ? from.startsWith("/admin") : !from.startsWith("/admin")) ? from : homeFor(user);
    const caption = user.role === "ADMIN" ? `Welcome back, ${firstName(user.fullName)}` : isNew ? `Welcome, ${firstName(user.fullName)}` : `Welcome back, ${firstName(user.fullName)}`;
    play(() => navigate(dest, { replace: true }), caption);
  };

  return (
    <div className="auth">
      <aside className="auth__visual">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide}
            className="auth__slide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          >
            <motion.img src={SLIDES[slide].src} alt="" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 8, ease: "easeOut" }} />
          </motion.div>
        </AnimatePresence>
        <div className="auth__visual-shade" />
        <div className="auth__visual-content">
          <a href="/" className="auth__back"><ArrowLeft size={15} strokeWidth={1.2} /> Back to the house</a>
          <div>
            <motion.span className="eyebrow eyebrow--light" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 1, ease: EASE }}>
              The Private Salon
            </motion.span>
            <h1 className="auth__title">
              {["Light,", <em key="e">held forever.</em>].map((l, i) => (
                <span className="split__line" key={i}>
                  <motion.span initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1.3, ease: EASE, delay: 0.7 + i * 0.14 }}>{l}</motion.span>
                </span>
              ))}
            </h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 1 }} className="auth__quote">
              Save the pieces you love, reserve them for pickup, and speak with our jewellers — all in one place.
            </motion.p>
          </div>
          <div className="auth__dots">
            {SLIDES.map((s, i) => (
              <button key={i} className={i === slide ? "is-active" : ""} onClick={() => setSlide(i)} aria-label={`Show ${s.caption}`}>
                <span />
              </button>
            ))}
            <AnimatePresence mode="wait">
              <motion.span key={slide} className="auth__caption" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {SLIDES[slide].caption}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </aside>

      <main className="auth__panel">
        <motion.div className="auth__card" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.5 }}>
          <a href="/" className="logo auth__logo" aria-label="Bryle's Diamonds home">
            <span className="logo__main">Bryle's <em>Diamonds</em></span>
            <span className="logo__sub">Jewelry Shop · Cebu</span>
          </a>

          <div className="auth__tabs" role="tablist">
            {[["login", "Sign in"], ["register", "Create account"]].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={mode === k} className={`auth__tab ${mode === k ? "is-active" : ""}`} onClick={() => setMode(k)}>
                {label}
                {mode === k && <motion.span layoutId="auth-tab" className="auth__tab-line" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "register" ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "register" ? -40 : 40 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <h2 className="auth__heading">{mode === "register" ? <>Join the <em>house.</em></> : <>Welcome <em>back.</em></>}</h2>
              <p className="auth__sub">{mode === "register" ? "Create your account to save favourites, reserve pieces and chat with our jewellers." : "Sign in to continue to your collection."}</p>
              {mode === "register" ? <RegisterForm onDone={onDone} switchTo={() => setMode("login")} /> : <SignInForm onDone={onDone} switchTo={() => setMode("register")} />}
            </motion.div>
          </AnimatePresence>

          <p className="auth__trust"><ShieldCheck size={15} strokeWidth={1.2} /> Protected with encrypted sessions, CSRF defence and brute-force lockout.</p>
        </motion.div>
      </main>
    </div>
  );
}
