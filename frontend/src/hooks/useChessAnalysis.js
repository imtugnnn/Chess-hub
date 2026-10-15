import { useEffect, useRef, useState } from "react";
import { createStockfishClient } from "../services/stockfishClient";

export function useChessAnalysis({ enabled, fen, rootFen, moves, lines }) {
  const client = useRef(null);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState({ status: "idle", variations: [], error: "" });
  const moveKey = moves.join(" ");
  useEffect(() => {
    if (!enabled) return;
    try { client.current = createStockfishClient(); }
    catch { setState({ fen, lines, status: "error", variations: [], error: "Trình duyệt không thể khởi tạo engine. Hãy thử lại." }); }
    return () => { client.current?.dispose(); client.current = null; };
  }, [enabled, retry]);
  useEffect(() => {
    if (!enabled || !client.current) return;
    let current = true;
    const engine = client.current;
    setState({ fen, lines, status: "loading", variations: [], error: "" });
    const timer = setTimeout(() => {
      engine.analyze({ fen, rootFen, moves: moveKey ? moveKey.split(" ") : [], lines }, (info) => {
        if (!current) return;
        setState((previous) => ({ ...previous, status: "searching", variations: [...previous.variations.filter((variation) => variation.rank !== info.rank), info].sort((a, b) => a.rank - b.rank) }));
      }).then(() => { if (current) setState((previous) => ({ ...previous, status: "done" })); }).catch((error) => { if (current) setState({ fen, lines, status: "error", variations: [], error: error.message }); });
    }, 180);
    return () => { current = false; clearTimeout(timer); engine.cancel(); };
  }, [enabled, fen, rootFen, moveKey, lines, retry]);
  return {
    ...(enabled && state.fen === fen && state.lines === lines ? state : { status: enabled ? "loading" : "idle", variations: [], error: "" }),
    retry: () => setRetry((value) => value + 1),
  };
}
