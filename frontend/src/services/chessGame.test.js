import test from "node:test";
import assert from "node:assert/strict";
import { availableCastling, createSetupGame, gamePosition, gameStatus, groupMoveRows, moveUci, variationSan } from "./chessGame.js";
import { initialPosition, positionFen } from "../components/boardPosition.js";

test("setup blocks invalid kings, edge pawns and the waiting king in check", () => {
  assert.throws(() => createSetupGame(positionFen({}, "w")), /một vua trắng/);
  assert.throws(() => createSetupGame(positionFen({ a1: "wK", b1: "wK", h8: "bK" }, "w")), /một vua trắng/);
  assert.throws(() => createSetupGame(positionFen({ a1: "wK", h8: "bK", d8: "wP" }, "w")), /hàng 1 hoặc hàng 8/);
  assert.throws(() => createSetupGame(positionFen({ a1: "wK", h8: "bK", h1: "wR" }, "w")), /chưa đến lượt/);
  assert.throws(() => createSetupGame(positionFen({ e1: "wK", e2: "bK" }, "w")), /chưa đến lượt/);
  assert.doesNotThrow(() => createSetupGame(positionFen({ a1: "wK", h8: "bK", h1: "wR" }, "b")));
});
test("play keeps castling, en passant, history and undo", () => {
  const game = createSetupGame(positionFen(initialPosition(), "w", "KQkq"));
  game.move("e4"); game.move("a6"); game.move("e5"); game.move("d5");
  assert.equal(game.move("exd6").isEnPassant(), true);
  assert.equal(gamePosition(game).d5, undefined);
  game.undo(); assert.equal(gamePosition(game).d5, "bP");
  assert.equal(moveUci(game.history({ verbose: true })[0]), "e2e4");
  const castle = createSetupGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
  castle.move("O-O"); assert.equal(gamePosition(castle).g1, "wK"); assert.equal(gamePosition(castle).f1, "wR");
  assert.equal(availableCastling({ e1: "wK", a1: "wR" }, "KQkq"), "Q");
});
test("promotion, terminal states and SAN variations", () => {
  const game = createSetupGame("7k/P7/8/8/8/8/8/7K w - - 0 1");
  game.move({ from: "a7", to: "a8", promotion: "n" });
  assert.equal(gamePosition(game).a8, "wN"); assert.match(gameStatus(game), /không đủ quân/);
  assert.match(gameStatus(createSetupGame("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1")), /Chiếu hết/);
  assert.equal(variationSan(positionFen(initialPosition(), "w"), ["e2e4", "e7e5", "g1f3"]), "1. e4 e5 2. Nf3");
});
test("history pairs White and Black by full move, including an unfinished row", () => {
  const moves = [{ color: "w", san: "e4" }, { color: "b", san: "e5" }, { color: "w", san: "d4" }, { color: "b", san: "exd4" }, { color: "w", san: "Nf3" }];
  assert.deepEqual(groupMoveRows(moves, positionFen(initialPosition(), "w")), [
    { number: 1, white: { san: "e4", index: 0 }, black: { san: "e5", index: 1 } },
    { number: 2, white: { san: "d4", index: 2 }, black: { san: "exd4", index: 3 } },
    { number: 3, white: { san: "Nf3", index: 4 }, black: null },
  ]);
  assert.deepEqual(groupMoveRows([{ color: "b", san: "e5" }, { color: "w", san: "Nf3" }], "8/8/8/8/8/8/8/8 b - - 0 9"), [
    { number: 9, white: null, black: { san: "e5", index: 0 } },
    { number: 10, white: { san: "Nf3", index: 1 }, black: null },
  ]);
  assert.deepEqual(groupMoveRows([], ""), []);
});
