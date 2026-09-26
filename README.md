# Bryle's Diamonds — Jewelry Shop System

A public landing site plus a full-stack shop:

| Folder | What it is |
|---|---|
| `frontend/landing/` | The static landing site, served at `/`: the home page (`index.html`), Our Story (`about.html`), the Lookbook (`lookbook.html`) and their `assets/`. The **Discover** buttons open the app at `/app/auth`, and every shop, product, bag and "Visit Us" link leads into the app. |
| `frontend/src/` | React 18 + Vite app, served under `/app/` — sign-in, the customer shop and the owner's console. |
| `backend/` | Spring Boot 3 (Java 21+) REST API, WebSocket chat, security, image storage and the database connection. |

## Run it (development)

Requirements: Java 21+ (23 works), Maven 3.9+, Node 18+.

```bash
# 1. API on http://localhost:8080 (creates ./data and ./uploads on first run)
cd backend
mvn spring-boot:run

# 2. In a second terminal: web on http://localhost:5173
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173/**. That's the landing page. Click **Discover** to sign in.
In development, Vite serves the landing page at `/`, the app at `/app/`, and proxies `/api` and `/ws` to Spring Boot, so everything shares one origin.

### Configuration first

All secrets and machine-specific settings live in `backend/.env`, which is gitignored. Copy the template and fill it in before the first start:

```bash
cp backend/.env.example backend/.env
```

### Accounts created on first start

- **Owner / admin:** created from `ADMIN_EMAIL` and `ADMIN_PASSWORD` the first time the backend starts with no admin. Change the password afterwards from *Admin → Profile → Security*.
- **Demo customer (optional):** created from `DEMO_CUSTOMER_EMAIL` and `DEMO_CUSTOMER_PASSWORD`. Leave them empty to skip it.
- **Everyone else:** customers register themselves. Self-registration can only ever create customer accounts.

The first start also seeds the 24-piece catalogue from the landing page, so the shop isn't empty. Set `SEED_DEMO_DATA=false` to start with an empty catalogue.

## What's inside

**Customers** (shopping-app style, with a bottom tab bar on mobile)
- Home: a greeting hero with rotating featured pieces, categories, a featured rail and new arrivals.
- Shop: category tabs, search, sort, and an "in stock" filter with animated re-layout.
- Product page: gallery with hover zoom, animated stock meter, size picker, quantity, favourite, and "Ask a jeweller about this piece". The last one opens chat with the piece attached.
- Favourites, bag, and reservation checkout. Customers reserve online and pay/collect at the shop. Stock is held when they reserve and released if they cancel.
- Reservations with a status timeline. Visit Us: a map of the Talisay City shop, directions, and a "How far am I?" distance line.
- Real-time chat with the owner (read receipts, quick replies), and a profile page with an avatar upload, details and a password change.

**Owner / admin** (a separate console; customers can't open it)
- Dashboard: KPIs, stock by category, low-stock quick restock, recent reservations.
- Jewellery: grid or table view, publish/hide, feature on the home page, delete.
- Piece editor: drag-and-drop photo upload with reordering (the first photo is the cover), details, sizes, price, stock, and a live preview of the customer card.
- Inventory: inline stock editing. Reservations: confirm → ready for pickup → collected, or cancel. Each change notifies the customer in chat.
- Customers: suspend or reactivate accounts, and message any customer. Messages: a real-time inbox with a customer details panel.

## Security

- Passwords are hashed with **BCrypt (cost 12)**. The password policy (8–72 characters, upper and lower case, a number and a symbol) is enforced on both client and server.
- The session is a **JWT in an HttpOnly, SameSite=Strict cookie**, so page scripts can't read it. Tokens carry a version number: signing out, changing the password or suspending the account revokes every issued token immediately.
- **CSRF protection** uses double-submit: an `XSRF-TOKEN` cookie that must be echoed back as the `X-XSRF-TOKEN` header.
- **Brute-force defence:** the account locks for 15 minutes after 5 failed sign-ins, and each IP is rate-limited on sign-in and registration. Unknown emails get the same generic error, with equal timing, so attackers can't tell which emails exist. A hidden honeypot field catches registration bots.
- **Role-based access:** URL rules plus `@PreAuthorize` on admin controllers. The registration role is never read from the request.
- **Uploads** are identified by their actual bytes (JPG/PNG/WEBP/GIF only, no SVG), limited to 5 MB, and stored under random names. With Supabase Storage configured, they go to a public-read bucket that only the server can write to, using a secret key the browser never sees. Local file serving is protected against path traversal. Product image links must be `https://`.
- **Headers:** a strict CSP on the app (`script-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy and Permissions-Policy.
- **Validation and output:** all input is validated server-side. Chat text is rendered as plain text, so nothing a sender types can run as markup. Error responses never include stack traces.
- **WebSocket:** the handshake is authenticated by cookie and origins are checked. Clients can only subscribe to their own queue and cannot publish directly.

## Configuration (environment variables)

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | random each start | **Set in production** (32+ characters), or every restart signs everyone out. |
| `COOKIE_SECURE` | `false` | Set to `true` when served over HTTPS. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,…,http://localhost:8080` | Comma-separated list of the origins the site is served from. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | – | The owner account, created only when no admin exists yet. |
| `SEED_DEMO_DATA` | `true` | Seed the starter catalogue into an empty database. |
| `DEMO_CUSTOMER_EMAIL` / `DEMO_CUSTOMER_PASSWORD` | – | Optional demo customer account. |
| `PORT` / `UPLOAD_DIR` / `DB_POOL_SIZE` / `JWT_TTL_MINUTES` | `8080` / `./uploads` / `5` / `120` | Server port, local photo folder, database connections, session length in minutes. |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | – | The database, e.g. Supabase PostgreSQL. Empty means the embedded H2 database. |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | – | Store photos in Supabase Storage. The server-only secret key comes from Project Settings → API Keys. |
| `SUPABASE_BUCKET` | `jewelry` | Created automatically as a public-read bucket. |

All of these can go in `backend/.env` (see `backend/.env.example`). Without a database URL, H2 is used, stored in `backend/data/`. Without the Supabase keys, uploaded photos are saved in `backend/uploads/`. Once the keys are set, the next start moves any photos from there into Supabase Storage, updates every link to them, and forwards old `/api/files/...` links.
Behind a reverse proxy, also set `server.forward-headers-strategy=native` so rate limiting sees real client IPs.

## Production build (one jar serves everything)

```bash
cd frontend && npm run build:jar      # builds the app into backend/src/main/resources/static/app
cd ../backend && mvn -DskipTests package
java -jar target/brylesdiamonds-api-1.0.0.jar
```

The jar serves the landing page at `/`, the app at `/app/`, and the API at `/api` on port 8080.
