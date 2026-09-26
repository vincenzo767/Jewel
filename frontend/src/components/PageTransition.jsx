import { Component } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { EASE } from "./ui";

/** Keeps one broken page from blanking the whole app; resets when the user navigates elsewhere. */
class PageErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="empty" style={{ paddingTop: "calc(var(--nav-h) + 60px)" }}>
        <h3>Something went <em>astray.</em></h3>
        <p>This page couldn't be displayed. Please try again.</p>
        <button className="btn btn--solid" onClick={() => window.location.reload()}>Reload the page</button>
      </div>
    );
  }
}

/**
 * Page enter animation. Each route remounts under its own key and animates in; there is deliberately
 * no exit phase, because an interrupted exit (fast navigation) left AnimatePresence with no page mounted.
 */
export default function PageTransition({ context }) {
  const { pathname } = useLocation();
  return (
    <PageErrorBoundary resetKey={pathname}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <Outlet context={context} />
      </motion.div>
    </PageErrorBoundary>
  );
}
