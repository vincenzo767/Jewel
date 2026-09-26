/* Bryle's Diamonds — shared site behaviour */

(() => {
  const page = document.body.dataset.page || "";
  const overHero = document.body.hasAttribute("data-hero");

  /* ---------- Icons ---------- */
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.6 0 5.6 3.5 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12.5H6L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  };
  window.ICON = ICON;

  /* ---------- Header ---------- */
  const navItems = [
    ["shop", "/app/shop", "Shop"],
    ["lookbook", "lookbook.html", "Lookbook"],
    ["about", "about.html", "Our Story"],
  ];
  const cur = (key) => (page === key ? ' aria-current="page"' : "");

  const header = `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="curtain" aria-hidden="true"><span class="curtain__mark">B·D</span></div>
    <header class="nav${overHero ? " nav--over-hero" : ""}" id="nav">
      <div style="display:flex;align-items:center;gap:18px">
        <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
        <ul class="nav__links nav__links--left">
          ${navItems.map(([k, h, l]) => `<li><a class="nav__link" href="${h}"${cur(k)}>${l}</a></li>`).join("")}
        </ul>
      </div>
      <a href="index.html" class="logo" aria-label="Bryle's Diamonds — home">
        <span class="logo__main">Bryle's <em>Diamonds</em></span>
        <span class="logo__sub">Jewelry Shop · Cebu</span>
      </a>
      <ul class="nav__links nav__links--right">
        <li><a class="nav__link" href="/app/visit"${cur("contact")}>Visit Us</a></li>
        <li><a class="nav__discover" href="/app/auth">Discover</a></li>
        <li><a class="icon-btn" href="/app/favorites" aria-label="Your favourites">${ICON.heart}</a></li>
        <li><a class="icon-btn" href="/app/cart" aria-label="Your bag">${ICON.bag}</a></li>
      </ul>
    </header>
    <nav class="menu" id="menu" aria-label="Mobile">
      <ol>
        <li><a href="index.html">Home</a></li>
        <li><a href="/app/shop">Shop</a></li>
        <li><a href="lookbook.html">Lookbook</a></li>
        <li><a href="about.html">Our Story</a></li>
        <li><a href="/app/visit">Visit Us</a></li>
        <li><a href="/app/auth">Discover</a></li>
      </ol>
      <div class="menu__foot">V. H. Garces St, Talisay City 6045<br>+63 992 409 2298</div>
    </nav>
    <div class="progress" id="progress" aria-hidden="true"></div>`;

  const footer = `
    <footer class="footer">
      <div class="container">
        <div class="footer__top">
          <div class="footer__brand">
            <a href="index.html" class="logo"><span class="logo__main">Bryle's <em>Diamonds</em></span><span class="logo__sub">Jewelry Shop · Cebu</span></a>
            <p>Fine jewellery, hand-finished in Cebu since 2021.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="/app/shop?category=RINGS">Rings</a></li>
              <li><a href="/app/shop?category=EARRINGS">Earrings</a></li>
              <li><a href="/app/shop?category=NECKLACES">Necklaces</a></li>
              <li><a href="/app/shop?category=BRACELETS">Bracelets</a></li>
            </ul>
          </div>
          <div>
            <h4>The House</h4>
            <ul>
              <li><a href="lookbook.html">Lookbook</a></li>
              <li><a href="about.html">Our Story</a></li>
              <li><a href="/app/shop?category=RINGS">Bridal</a></li>
              <li><a href="/app/visit">Book an Appointment</a></li>
            </ul>
          </div>
          <div>
            <h4>Follow Us</h4>
            <p style="color:var(--ink-soft);font-size:.92rem;margin-bottom:10px">New pieces, restocks and shop news on Facebook and Instagram.</p>
            <p style="font-size:.92rem;margin:0"><a href="mailto:hikimurieunwoo@gmail.com">hikimurieunwoo@gmail.com</a></p>
            <div class="footer__social">
              <a href="https://www.instagram.com/bryles_diamonds_jewelry/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8c-.1-1.6-.4-3-1.6-4.2S17.6 2.2 16 2.1C14.4 2 9.6 2 8 2.1 6.4 2.2 5 2.5 3.8 3.7S2.2 6.4 2.1 8C2 9.6 2 14.4 2.1 16c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-6.4 0-8zm-2.1 9.7a3.2 3.2 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.7.4s-4.4.1-5.7-.4a3.2 3.2 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.7s-.1-4.4.4-5.7A3.2 3.2 0 0 1 6.3 4.5C7.6 4 10.6 4.1 12 4.1s4.4-.1 5.7.4a3.2 3.2 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.7s.1 4.4-.4 5.7z"/></svg></a>
              <a href="https://www.facebook.com/share/1DhWzrqrJm/" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.5v3.6h2.8V22H14v-9.9h2.8l.4-3.6H14z"/></svg></a>
            </div>
          </div>
        </div>
        <div class="footer__word" aria-hidden="true">Bryle's <em>D</em>iamonds</div>
        <p class="footer__legal">© 2026 Bryle's Diamonds-Gold Jewelry Shop · V. H. Garces St, Talisay City, Cebu 6045 · +63 992 409 2298 · <a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a></p>
      </div>
    </footer>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>`;

  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);

  /* ---------- Page transitions ---------- */
  const curtain = document.querySelector(".curtain");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || /^https?:/.test(href)) return;
    e.preventDefault();
    document.body.classList.remove("menu-open");
    curtain.classList.add("is-leaving");
    setTimeout(() => (window.location.href = href), 550);
  });
  // Restore when coming back via the browser cache
  window.addEventListener("pageshow", (e) => { if (e.persisted) curtain.classList.remove("is-leaving"); });

  /* ---------- Nav: scrolled / hide on scroll down ---------- */
  const nav = document.getElementById("nav");
  const progress = document.getElementById("progress");
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > 400 && y > lastY && !document.body.classList.contains("menu-open"));
    lastY = y;
    if (page === "lookbook") {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById("burger");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { setMenu(false); }
  });

  /* ---------- Images: fade in once loaded ---------- */
  window.watchImages = (root = document) => {
    root.querySelectorAll(".frame img").forEach((img) => {
      if (img.dataset.watched) return;
      img.dataset.watched = "1";
      const done = () => img.classList.add("is-loaded");
      if (img.complete && img.naturalWidth) done();
      else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", () => img.classList.add("is-broken"), { once: true });
      }
    });
  };

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" })
    : null;
  window.observeReveals = (root = document) => {
    root.querySelectorAll("[data-reveal], .split-lines").forEach((el) => {
      if (io) io.observe(el); else el.classList.add("is-in");
    });
  };

  /* ---------- Gentle parallax ---------- */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const parallax = [...document.querySelectorAll("[data-parallax]")];
  if (parallax.length && !reduce) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      parallax.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-shown"), 2800);
  }
  window.toast = toast;

  /* ---------- Product card (landing rail) ----------
     The landing page is a showcase; every card leads into the app's shop, where
     pieces are saved, added to the bag and reserved against real stock. */
  const inShop = (p) => `/app/shop?q=${encodeURIComponent(p.name)}`;
  window.productCard = (p) => `
    <article class="card">
      <div class="card__top">
        <a href="${inShop(p)}" class="card__media frame" tabindex="-1" aria-hidden="true">
          ${p.tag ? `<span class="card__tag">${p.tag}</span>` : ""}
          <img src="${IMG(p.images[0], 700)}" alt="${p.name} — ${p.metal}" loading="lazy">
          <img class="img-alt" src="${IMG(p.images[1] || p.images[0], 700)}" alt="" loading="lazy">
        </a>
        <a class="card__wish" href="${inShop(p)}" aria-label="Save ${p.name} in the shop">${ICON.heart}</a>
        <a class="card__quick" href="${inShop(p)}">View in the shop</a>
      </div>
      <div class="card__info">
        <div><a href="${inShop(p)}" class="card__name">${p.name}</a><div class="card__meta">${p.metal}</div></div>
        <div class="card__price">${formatPrice(p.price)}</div>
      </div>
    </article>`;

  /* Card for a live piece from the owner's catalogue (/api/public/featured). Every value is
     escaped, since the text comes from the database and is inserted as HTML. */
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const safeSrc = (u) => (/^(https:\/\/|\/api\/files\/)/.test(u || "") ? esc(u) : "");
  window.liveCard = (p) => {
    const href = `/app/product/${encodeURIComponent(p.id)}`;
    const [img, alt] = p.images || [];
    const tag = p.inStock ? p.tag : "Sold out";
    return `
    <article class="card">
      <div class="card__top">
        <a href="${href}" class="card__media frame" tabindex="-1" aria-hidden="true">
          ${tag ? `<span class="card__tag">${esc(tag)}</span>` : ""}
          <img src="${safeSrc(img)}" alt="${esc(p.name)}${p.metal ? " — " + esc(p.metal) : ""}" loading="lazy">
          <img class="img-alt" src="${safeSrc(alt || img)}" alt="" loading="lazy">
        </a>
        <a class="card__wish" href="${href}" aria-label="Save ${esc(p.name)} in the shop">${ICON.heart}</a>
        <a class="card__quick" href="${href}">View in the shop</a>
      </div>
      <div class="card__info">
        <div><a href="${href}" class="card__name">${esc(p.name)}</a><div class="card__meta">${esc(p.metal)}</div></div>
        <div class="card__price">${esc(formatPrice(Number(p.price)))}</div>
      </div>
    </article>`;
  };

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    watchImages();
    observeReveals();
  });
  if (document.readyState !== "loading") { watchImages(); observeReveals(); }
})();
