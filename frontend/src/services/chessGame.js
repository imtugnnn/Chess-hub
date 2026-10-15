import { Chess } from "chess.js";

export const CASTLING_CHOICES = [
  { key: "K", king: "e1", rook: "h1", color: "w", label: "Trắng · cánh vua" },
  { key: "Q", king: "e1", rook: "a1", color: "w", label: "Trắng · cánh hậu" },
  { key: "k", king: "e8", rook: "h8", color: "b", label: "Đen · cánh vua" },
  { key: "q", king: "e8", rook: "a8", color: "b", label: "Đen · cánh hậu" },
];
export function availableCastling(position, rights) {
  return CASTLING_CHOICES.filter(({ key, king, rook, color }) => rights.includes(key) && position[king] === `${color}K` && position[rook] === `${color}R`).map(({ key }) => key).join("");
}
export function createSetupGame(fen) {
  const placement = fen.split(" ")[0];
  for (const color of ["w", "b"]) {
    const name = color === "w" ? "trắng" : "đen";
    const pieces = [...placement].filter((char) => /[a-z]/i.test(char) && (color === "w" ? char === char.toUpperCase() : char === char.toLowerCase()));
    if (pieces.filter((char) => char.toUpperCase() === "K").length !== 1) throw new Error(`Cần đúng một vua ${name} trên bàn.`);
    if (pieces.length > 16 || pieces.filter((char) => char.toUpperCase() === "P").length > 8) throw new Error(`Bên ${name} có quá nhiều quân hoặc tốt.`);
    const counts = Object.fromEntries(["Q", "R", "B", "N", "P"].map((role) => [role, pieces.filter((char) => char.toUpperCase() === role).length]));
    const promotions = Math.max(0, counts.Q - 1) + Math.max(0, counts.R - 2) + Math.max(0, counts.B - 2) + Math.max(0, counts.N - 2);
    if (promotions > 8 - counts.P) throw new Error(`Số quân phong cấp của bên ${name} không phù hợp với số tốt còn lại.`);
  }
  if (/[pP]/.test(placement.split("/")[0] + placement.split("/").at(-1))) throw new Error("Tốt không thể đứng ở hàng 1 hoặc hàng 8. Hãy đổi quân hoặc chuyển tốt.");
  const game = new Chess(fen);
  const waitingColor = game.turn() === "w" ? "b" : "w";
  const waitingKing = game.findPiece({ color: waitingColor, type: "k" })[0];
  if (game.isAttacked(waitingKing, game.turn())) throw new Error("Vua của bên chưa đến lượt đang bị chiếu. Hãy đổi bên đến lượt hoặc sửa thế cờ.");
  return game;
}
export function gamePosition(game) {
  return Object.fromEntries(game.board().flat().filter(Boolean).map(({ square, color, type }) => [square, `${color}${type.toUpperCase()}`]));
}
export function moveUci(move) { return `${move.from}${move.to}${move.promotion ?? ""}`; }
export function groupMoveRows(moves, rootFen) {
  let number = Number(rootFen.split(" ")[5]) || 1;
  const rows = [];
  moves.forEach((move, index) => {
    if (!rows.length || rows.at(-1).number !== number) rows.push({ number, white: null, black: null });
    rows.at(-1)[move.color === "w" ? "white" : "black"] = { san: move.san, index };
    if (move.color === "b") number++;
  });
  return rows;
}
export function gameStatus(game) {
  if (game.isCheckmate()) return `Chiếu hết. ${game.turn() === "w" ? "Đen" : "Trắng"} thắng.`;
  if (game.isStalemate()) return "Hòa do hết nước đi hợp lệ.";
  if (game.isThreefoldRepetition()) return "Hòa do lặp lại thế cờ ba lần.";
  if (game.isInsufficientMaterial()) return "Hòa do không đủ quân để chiếu hết.";
  if (game.isDraw()) return "Ván cờ hòa.";
  return `${game.turn() === "w" ? "Trắng" : "Đen"} đến lượt${game.isCheck() ? " · Đang bị chiếu" : ""}.`;
}
export function variationSan(fen, moves) {
  const game = new Chess(fen);
  const result = [];
  for (const uci of moves.slice(0, 10)) {
    try {
      const number = game.fen().split(" ")[5];
      const prefix = game.turn() === "w" ? `${number}. ` : result.length === 0 ? `${number}… ` : "";
      result.push(prefix + game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san);
    } catch { break; }
  }
  return result.join(" ");
}
