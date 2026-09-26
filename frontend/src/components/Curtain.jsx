import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const CurtainContext = createContext(() => {});
const EASE = [0.22, 1, 0.36, 1];

/**
 * The emerald curtain from the landing page, used for big moments: entering the house after
 * sign-in, and leaving it. play(action, caption) covers the screen, runs the action, then lifts.
 */
export function CurtainProvider({ children }) {
  const [phase, setPhase] = useState("intro"); // intro | cover | reveal | idle
  const [caption, setCaption] = useState("");
  const busy = useRef(false);

  const play = useCallback((action, text = "") => {
    if (busy.current) return;
    busy.current = true;
    setCaption(text);
    setPhase("cover");
    setTimeout(async () => {
      try { await action?.(); } finally {
        setTimeout(() => setPhase("reveal"), 450);
        setTimeout(() => { setPhase("idle"); busy.current = false; }, 1600);
      }
    }, 750);
  }, []);

  const visible = phase !== "idle";
  const covering = phase === "cover";

  return (
    <CurtainContext.Provider value={play}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="curtain"
            className="curtain"
            aria-hidden="true"
            style={{ transformOrigin: covering ? "bottom" : "top" }}
            initial={{ scaleY: phase === "intro" ? 1 : 0 }}
            animate={phase === "intro" ? { scaleY: 0, transition: { duration: 1.1, ease: EASE, delay: 0.35 } }
              : covering ? { scaleY: 1, transition: { duration: 0.7, ease: EASE } }
              : { scaleY: 0, transition: { duration: 1.05, ease: EASE, delay: 0.1 } }}
            onAnimationComplete={() => setPhase((p) => (p === "intro" ? "idle" : p))}
          >
            <motion.div
              className="curtain__inner"
              initial={{ opacity: phase === "intro" ? 1 : 0, y: 16 }}
              animate={{ opacity: covering || phase === "intro" ? 1 : 0, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: covering ? 0.35 : 0 }}
            >
              <span className="curtain__mark">B·D</span>
              {caption && <span className="curtain__caption">{caption}</span>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CurtainContext.Provider>
  );
}

export const useCurtain = () => useContext(CurtainContext);
