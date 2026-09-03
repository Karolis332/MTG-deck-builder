import { useEffect, useRef, useState } from 'react';

/** True for ~600ms whenever `value` changes from its previous value — drives the .hud-tick flash. */
export function useTickOnChange(value: unknown): boolean {
  const [ticking, setTicking] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setTicking(true);
    const t = setTimeout(() => setTicking(false), 600);
    return () => clearTimeout(t);
  }, [value]);

  return ticking;
}
