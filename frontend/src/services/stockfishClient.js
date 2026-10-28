export function parseEngineInfo(line, turn) {
  if (!line.startsWith("info ") || /\b(lowerbound|upperbound)\b/.test(line)) return null;
  const score = line.match(/\bscore (cp|mate) (-?\d+)/);
  const pv = line.match(/\bpv (.+)$/);
  const depth = line.match(/\bdepth (\d+)/);
  if (!score || !pv || !depth) return null;
  return {
    rank: Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1),
    depth: Number(depth[1]),
    score: { type: score[1], value: Number(score[2]) * (turn === "w" ? 1 : -1) },
    moves: pv[1].trim().split(/\s+/).filter((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)),
  };
}
export function scoreText(score) {
  if (!score) return "—";
  if (score.type === "mate") return `${score.value < 0 ? "Đen" : "Trắng"} chiếu hết trong ${Math.abs(score.value)}`;
  const value = score.value / 100;
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}
export function evaluationDisplay(score, orientation = "white") {
  // This is a bounded visual scale for advantage, not a win probability.
  const whitePercent = !score ? 50 : score.type === "mate" ? score.value < 0 ? 2 : 98 : 50 + 48 * Math.tanh(score.value / 400);
  const favorsBlack = Boolean(score && score.value < 0);
  return {
    whitePercent,
    label: !score ? "—" : score.type === "mate" ? `${score.value < 0 ? "−" : ""}M${Math.abs(score.value)}` : scoreText(score),
    darkLabel: favorsBlack,
    labelAtTop: orientation === "white" ? favorsBlack : !favorsBlack,
  };
}

// A single search at a time. A stopped search drains its bestmove before
// the next position is sent, so results cannot leak between positions.
export function createStockfishClient({ workerFactory = () => new Worker(`${import.meta.env.BASE_URL}stockfish/stockfish-19-lite-single.js`) } = {}) {
  const worker = workerFactory();
  let disposed = false, failure = null, revision = 0, active = null, queue = Promise.resolve();
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});
  const initTimer = setTimeout(() => fail(new Error("Không thể tải Stockfish. Hãy thử lại.")), 20000);
  function fail(error) {
    if (disposed) return;
    failure = error; clearTimeout(initTimer); rejectReady(error);
    if (active) { clearTimeout(active.timer); active.reject(error); active = null; }
    worker.terminate();
  }
  worker.onerror = () => fail(new Error("Không thể chạy Stockfish. Kiểm tra file engine hoặc thử trình duyệt khác."));
  worker.onmessage = ({ data }) => {
    if (disposed || failure || typeof data !== "string") return;
    for (const line of data.split(/\r?\n/)) {
      if (line === "uciok") { worker.postMessage("setoption name Hash value 16"); worker.postMessage("isready"); }
      if (line === "readyok") { clearTimeout(initTimer); resolveReady(); }
      if (!active) continue;
      if (line.startsWith("bestmove ")) {
        const search = active; active = null; clearTimeout(search.timer); search.resolve();
      } else if (active.revision === revision) {
        const info = parseEngineInfo(line, active.turn);
        if (info) active.onInfo(info);
      }
    }
  };
  worker.postMessage("uci");
  function cancel() { revision++; if (active && !failure && !disposed) worker.postMessage("stop"); }
  return {
    analyze({ fen, rootFen = fen, moves = [], lines = 1, milliseconds = 1500 }, onInfo) {
      cancel();
      const requestRevision = revision;
      const request = queue.catch(() => {}).then(async () => {
        await ready;
        if (failure) throw failure;
        if (disposed || revision !== requestRevision) return;
        await new Promise((resolve, reject) => {
          active = { revision: requestRevision, turn: fen.split(" ")[1], onInfo, resolve, reject, timer: setTimeout(() => fail(new Error("Phân tích quá thời gian. Hãy thử lại.")), milliseconds + 7000) };
          worker.postMessage(`setoption name MultiPV value ${lines}`);
          worker.postMessage(`position fen ${rootFen}${moves.length ? ` moves ${moves.join(" ")}` : ""}`);
          worker.postMessage(`go movetime ${milliseconds}`);
        });
      });
      queue = request;
      return request;
    },
    cancel,
    dispose() {
      if (disposed) return;
      disposed = true; revision++; clearTimeout(initTimer);
      rejectReady(new Error("Engine đã đóng."));
      if (active) { clearTimeout(active.timer); active.resolve(); active = null; }
      worker.terminate();
    },
  };
}
