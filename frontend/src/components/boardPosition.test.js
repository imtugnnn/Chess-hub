import test from "node:test";
import assert from "node:assert/strict";
import { editPosition, initialPosition, positionFen } from "./boardPosition.js";

test("position editor adds spare pieces, replaces occupied squares and removes off-board drops", () => {
  const initial = initialPosition();
  const moved = editPosition(initial, "e2", "e7", "wP");
  assert.equal(moved.e2, undefined);
  assert.equal(moved.e7, "wP");
  assert.equal(initial.e2, "wP");
  assert.equal(initial.e7, "bP");
  const removed = editPosition(moved, "e7", null, "wP");
  assert.equal(removed.e7, undefined);
  assert.deepEqual(editPosition({}, null, "d4", "wQ"), { d4: "wQ" });
});
test("FEN export supports incomplete setup and both sides to move", () => {
  assert.equal(positionFen({}, "b"), "8/8/8/8/8/8/8/8 b - - 0 1");
  assert.equal(positionFen(initialPosition(), "w"), "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1");
  assert.equal(positionFen({ a8: "bK", h1: "wK" }, "w"), "k7/8/8/8/8/8/8/7K w - - 0 1");
});
