import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapContainer, Marker, Polyline, TileLayer, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Clock, Crosshair, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { SHOP } from "../../lib/format";
import { EASE, Reveal, Spinner } from "../../components/ui";

const shopIcon = L.divIcon({
  className: "map-pin",
  html: '<span class="map-pin__pulse"></span><span class="map-pin__dot">B·D</span>',
  iconSize: [54, 54],
  iconAnchor: [27, 27],
});
const SHOP_POS = [SHOP.lat, SHOP.lng];
const meIcon = L.divIcon({ className: "map-me", html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9] });

function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function FitTo({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.flyToBounds(L.latLngBounds(points), { padding: [70, 70], duration: 1.4 });
    else map.flyTo(points[0], 16, { duration: 1.2 });
  }, [points, map]);
  return null;
}

export default function Visit() {
  const shop = SHOP_POS;
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => { document.title = "Visit us — Bryle's Diamonds"; }, []);

  const locate = () => {
    if (!navigator.geolocation) { setGeoError("Location isn't available in this browser."); return; }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMe([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      () => { setGeoError("We couldn't get your location. Check your browser permission."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const km = me ? distanceKm(me, shop) : null;
  const points = useMemo(() => (me ? [me, SHOP_POS] : [SHOP_POS]), [me]);

  return (
    <div className="visit">
      <div className="visit__map">
        <MapContainer center={shop} zoom={16} scrollWheelZoom={false} zoomControl={false} className="leaflet-bd">
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          />
          <ZoomControl position="bottomright" />
          <Marker position={shop} icon={shopIcon} title={SHOP.name} />
          {me && <Marker position={me} icon={meIcon} title="You are here" />}
          {me && <Polyline positions={[me, shop]} pathOptions={{ color: "#0f3a2e", weight: 2, dashArray: "6 8" }} />}
          <FitTo points={points} />
        </MapContainer>
      </div>

      <motion.aside className="visit__card" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.3 }}>
        <span className="eyebrow eyebrow--gold"><MapPin size={12} strokeWidth={1.4} style={{ verticalAlign: "-1px" }} /> Cebu, Philippines</span>
        <h1 className="visit__title">Visit the <em>Shop</em></h1>
        <p className="muted">Try on a piece, have your ring sized, or sit with one of our jewellers. Walk-ins are welcome — private appointments get the champagne.</p>
        <dl className="visit__info">
          <div><dt>Address</dt><dd>{SHOP.address}</dd></div>
          <div><dt><Clock size={12} strokeWidth={1.4} /> Opening hours</dt><dd>{SHOP.hours.map(([d, h]) => <span key={d} className="visit__hours"><span>{d}</span><span>{h}</span></span>)}</dd></div>
          <div><dt><Phone size={12} strokeWidth={1.4} /> Telephone</dt><dd><a href={`tel:${SHOP.phone.replace(/\s/g, "")}`}>{SHOP.phone}</a></dd></div>
        </dl>
        {km !== null && (
          <motion.p className="visit__distance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            You're about <strong>{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</strong> away{km < 30 ? ` — roughly ${Math.max(5, Math.round((km / 22) * 60))} minutes by car.` : "."}
          </motion.p>
        )}
        {geoError && <p className="field__error">{geoError}</p>}
        <div className="visit__actions">
          <a className="btn btn--solid" href={SHOP.directions} target="_blank" rel="noopener noreferrer"><Navigation size={15} strokeWidth={1.3} /> Get directions</a>
          <button className="btn" onClick={locate} disabled={locating}>{locating ? <Spinner /> : <Crosshair size={15} strokeWidth={1.3} />} How far am I?</button>
        </div>
        <Link to="/chat" state={{ draft: "Hello! I'd like to book a private viewing at the shop." }} className="link-line visit__book"><MessageCircle size={14} strokeWidth={1.3} /> Book a private viewing <span className="arrow" /></Link>
      </motion.aside>

      <section className="section--tight visit__strip">
        <div className="container visit__perks">
          {[["01", "Complimentary parking", "Reserved spaces for appointments, right outside the door."],
            ["02", "Ring sizing while you wait", "Most resizes finished in under an hour."],
            ["03", "Lifetime cleaning", "Bring any Bryle's piece in for a free clean and inspection."]].map(([n, t, d], k) => (
            <Reveal key={n} delay={k * 0.1} className="perk">
              <span className="num">{n}</span>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
