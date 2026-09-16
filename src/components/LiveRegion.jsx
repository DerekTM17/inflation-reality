import { useEffect, useState } from "react";

/**
 * Persistent, visually hidden aria-live region. Announces `text` one second after it
 * stops changing, so typing an amount doesn't flood a screen reader.
 */
export default function LiveRegion({ text, delay = 1000 }) {
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSpoken(text), delay);
    return () => clearTimeout(t);
  }, [text, delay]);
  return <p className="sr" aria-live="polite">{spoken}</p>;
}
