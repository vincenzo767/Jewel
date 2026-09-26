import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ShopProvider } from "./context/ShopContext";
import { PageLoader } from "./components/ui";
import AuthPage from "./pages/auth/AuthPage";
import CustomerLayout from "./layouts/CustomerLayout";
import AdminLayout from "./layouts/AdminLayout";

const Home = lazy(() => import("./pages/customer/Home"));
const Shop = lazy(() => import("./pages/customer/Shop"));
const ProductDetail = lazy(() => import("./pages/customer/ProductDetail"));
const Favorites = lazy(() => import("./pages/customer/Favorites"));
const Cart = lazy(() => import("./pages/customer/Cart"));
const Orders = lazy(() => import("./pages/customer/Orders"));
const Visit = lazy(() => import("./pages/customer/Visit"));
const CustomerChat = lazy(() => import("./pages/customer/Chat"));
const Profile = lazy(() => import("./pages/shared/Profile"));

const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const ProductEditor = lazy(() => import("./pages/admin/ProductEditor"));
const Inventory = lazy(() => import("./pages/admin/Inventory"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const Customers = lazy(() => import("./pages/admin/Customers"));
const Messages = lazy(() => import("./pages/admin/Messages"));

import { homeFor } from "./lib/routes";

function RequireRole({ role, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return children;
}

function RootRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return <PageLoader />;
  return <Navigate to={user ? homeFor(user) : "/auth"} replace />;
}

const page = (el) => <Suspense fallback={<PageLoader inline />}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<GuestOnly><AuthPage /></GuestOnly>} />

      <Route element={<RequireRole role="CUSTOMER"><ShopProvider><CustomerLayout /></ShopProvider></RequireRole>}>
        <Route path="/home" element={page(<Home />)} />
        <Route path="/shop" element={page(<Shop />)} />
        <Route path="/product/:id" element={page(<ProductDetail />)} />
        <Route path="/favorites" element={page(<Favorites />)} />
        <Route path="/cart" element={page(<Cart />)} />
        <Route path="/orders" element={page(<Orders />)} />
        <Route path="/visit" element={page(<Visit />)} />
        <Route path="/chat" element={page(<CustomerChat />)} />
        <Route path="/profile" element={page(<Profile />)} />
      </Route>

      <Route path="/admin" element={<RequireRole role="ADMIN"><AdminLayout /></RequireRole>}>
        <Route index element={page(<Dashboard />)} />
        <Route path="products" element={page(<AdminProducts />)} />
        <Route path="products/new" element={page(<ProductEditor />)} />
        <Route path="products/:id" element={page(<ProductEditor />)} />
        <Route path="inventory" element={page(<Inventory />)} />
        <Route path="orders" element={page(<AdminOrders />)} />
        <Route path="customers" element={page(<Customers />)} />
        <Route path="messages" element={page(<Messages />)} />
        <Route path="profile" element={page(<Profile admin />)} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
