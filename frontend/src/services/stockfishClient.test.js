import test from "node:test";
import assert from "node:assert/strict";
import { createStockfishClient, evaluationDisplay, parseEngineInfo, scoreText } from "./stockfishClient.js";
class FakeWorker {
  sent = []; closed = false;
  postMessage(command) { this.sent.push(command); }
  terminate() { this.closed = true; }
  emit(line) { this.onmessage({ data: line }); }
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
test("evaluation rail preserves score, direction, flip and a bounded scale", () => {
  const white = evaluationDisplay({ type: "cp", value: 125 });
  const black = evaluationDisplay({ type: "cp", value: -125 });
  assert.equal(white.label, "+1.25"); assert.ok(white.whitePercent > 50);
  assert.equal(black.label, "-1.25"); assert.ok(black.whitePercent < 50);
  assert.equal(white.darkLabel, false); assert.equal(black.darkLabel, true);
  assert.equal(evaluationDisplay({ type: "cp", value: -125 }, "black").labelAtTop, false);
  assert.equal(evaluationDisplay({ type: "mate", value: -3 }).label, "−M3");
  assert.equal(evaluationDisplay({ type: "mate", value: -3 }).whitePercent, 2);
  assert.equal(evaluationDisplay(null).whitePercent, 50);
  assert.equal(evaluationDisplay(null).label, "—");
});
test("UCI scores use White's perspective, with mate and PV rank preserved", () => {
  const info = parseEngineInfo("info depth 12 multipv 2 score cp -36 nodes 10 pv e7e5 g1f3", "b");
  assert.equal(info.score.value, 36); assert.equal(info.rank, 2); assert.equal(info.depth, 12);
  assert.deepEqual(info.moves, ["e7e5", "g1f3"]); assert.equal(scoreText(info.score), "+0.36");
  assert.equal(parseEngineInfo("info depth 9 score cp 100 lowerbound pv e2e4", "w"), null);
  assert.equal(scoreText(parseEngineInfo("info depth 14 score mate 3 pv e7e5", "b").score), "Đen chiếu hết trong 3");
});
test("new analysis stops and drains the old search before sending a new position", async () => {
  const worker = new FakeWorker();
  const client = createStockfishClient({ workerFactory: () => worker });
  try {
    const old = [], latest = [];
    const first = client.analyze({ fen: "old w - - 0 1" }, (info) => old.push(info));
    assert.deepEqual(worker.sent, ["uci"]);
    worker.emit("uciok"); worker.emit("readyok"); await flush();
    worker.emit("info depth 5 score cp 10 pv e2e4"); assert.equal(old.length, 1);
    const second = client.analyze({ fen: "new b - - 0 1", rootFen: "root w - - 0 1", moves: ["e2e4"], lines: 3 }, (info) => latest.push(info));
    assert.equal(worker.sent.at(-1), "stop");
    worker.emit("info depth 6 score cp 22 pv d2d4"); assert.equal(old.length, 1);
    assert.equal(worker.sent.filter((command) => command.startsWith("go ")).length, 1);
    worker.emit("bestmove e2e4"); await first; await flush();
    assert.equal(worker.sent.at(-2), "position fen root w - - 0 1 moves e2e4");
    worker.emit("info depth 9 multipv 1 score cp 31 pv e7e5"); worker.emit("bestmove e7e5");
    await second; assert.equal(latest.length, 1); assert.equal(latest[0].score.value, -31);
  } finally { client.dispose(); }
  assert.equal(worker.closed, true);
});
test("worker errors reject pending analysis and release resources", async () => {
  const worker = new FakeWorker();
  const client = createStockfishClient({ workerFactory: () => worker });
  const request = client.analyze({ fen: "position w - - 0 1" }, () => {});
  const rejection = assert.rejects(request, /Không thể chạy Stockfish/);
  worker.onerror(); await rejection; client.dispose(); assert.equal(worker.closed, true);
});
