import { useCallback, useEffect, useRef, useState } from 'react';

// Carries a successful class creation across the SPA navigation to the overview.
const createdClasses = new Map();
export function rememberCreatedClass(teacherId, classId) {
  if (classId) createdClasses.set(teacherId, { id: classId, at: Date.now() });
}
export function consumeCreatedClass(teacherId) {
  const entry = createdClasses.get(teacherId);
  createdClasses.delete(teacherId);
  return entry && Date.now() - entry.at < 30_000 ? entry.id : null;
}

export function useRowHighlight(scope) {
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const timer = useRef(null);
  useEffect(() => {
    setHighlightedIds(new Set());
    return () => window.clearTimeout(timer.current);
  }, [scope]);
  const highlight = useCallback((ids) => {
    if (!ids.length) return;
    window.clearTimeout(timer.current);
    setHighlightedIds(new Set(ids));
    timer.current = window.setTimeout(() => setHighlightedIds(new Set()), 1600);
  }, []);
  return { highlightedIds, highlight };
}
