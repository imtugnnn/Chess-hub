export const TIE_BREAKS = {
  BUCHHOLZ: {
    label: "Buchholz",
    shortLabel: "BH",
    field: "buchholz",
    description: "Tổng điểm hiện tại của các đối thủ đã gặp.",
  },
  SONNEBORN_BERGER: {
    label: "Sonneborn–Berger",
    shortLabel: "SB",
    field: "sonnebornBerger",
    description: "Tổng điểm các đối thủ bạn thắng, cộng nửa điểm các đối thủ bạn hòa.",
  },
  WIN_COUNT: {
    label: "Số trận thắng",
    shortLabel: "Thắng",
    field: "wins",
    description: "Số trận thắng đã chơi; không tính bye.",
  },
  WHITE_GAME_COUNT: {
    label: "Số trận đi quân Trắng",
    shortLabel: "Trắng",
    field: "whiteGameCount",
    description: "Số trận đã chơi với quân Trắng; không tính bye.",
  },
};

export const DEFAULT_TIE_BREAKS = ["BUCHHOLZ", "SONNEBORN_BERGER", "WIN_COUNT"];
