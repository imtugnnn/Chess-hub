export const PIECE_NAMES = { K: "Vua", Q: "Hậu", R: "Xe", B: "Tượng", N: "Mã", P: "Tốt" };
export function initialPosition() {
  const pieces = {};
  [..."RNBQKBNR"].forEach((role, i) => {
    const file = "abcdefgh"[i];
    pieces[`${file}1`] = `w${role}`; pieces[`${file}2`] = "wP";
    pieces[`${file}8`] = `b${role}`; pieces[`${file}7`] = "bP";
  });
  return pieces;
}
export function editPosition(position, source, target, piece) {
  const next = { ...position };
  if (source) delete next[source];
  if (target) next[target] = piece;
  return next;
}
export function positionFen(position, turn, castling = "-") {
  const ranks = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = "", empty = 0;
    for (const file of "abcdefgh") {
      const piece = position[`${file}${rank}`];
      if (!piece) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += piece[0] === "w" ? piece[1] : piece[1].toLowerCase();
    }
    if (empty) row += empty;
    ranks.push(row);
  }
  return `${ranks.join("/")} ${turn} ${castling || "-"} - 0 1`;
}
