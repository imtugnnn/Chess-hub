import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard, ChessboardProvider, defaultPieces, SparePiece } from "react-chessboard";
import { AppChrome } from "../components/layout/AppChrome";
import { UiIcon } from "../components/UiIcon";
import { AnalysisSettings } from "../components/AnalysisSettings";
import { editPosition, initialPosition, PIECE_NAMES, positionFen } from "../components/boardPosition";
import { availableCastling, createSetupGame, gamePosition, gameStatus, groupMoveRows, moveUci, variationSan } from "../services/chessGame";
import { evaluationDisplay, scoreText } from "../services/stockfishClient";
import { useChessAnalysis } from "../hooks/useChessAnalysis";
import "./board-editor.css";

const OFF = { arrows: false, evaluation: false, variations: false };

export function BoardEditorPage({ teacherId, teacherName, onLogout, onNavigate }) {
  const [mode, setMode] = useState("setup");
  const [setupPosition, setPosition] = useState(initialPosition);
  const [orientation, setOrientation] = useState("white");
  const [setupTurn, setTurn] = useState("w");
  const [selection, setSelection] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("Sẵn sàng xếp thế cờ.");
  const [error, setError] = useState("");
  const [gameFen, setGameFen] = useState("");
  const [rootFen, setRootFen] = useState("");
  const [moves, setMoves] = useState([]);
  const [tools, setTools] = useState(OFF);
  const [promotion, setPromotion] = useState(null);
  const [replay, setReplay] = useState(null);
  const replayTimer = useRef(null);
  const lastMutation = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const historyViewport = useRef(null);
  const followHistory = useRef(true);
  const previousMoveCount = useRef(0);
  const game = useRef(null);
  const playing = mode === "play";
  const reviewing = playing && replay !== null;
  const replayMove = reviewing ? moves[replay.index] : null;
  const viewedGame = useMemo(() => reviewing && replay.phase !== "waiting" ? new Chess(replay.index < 0 ? rootFen : replay.phase === "before" ? replayMove.before : replayMove.after) : null, [reviewing, replayMove, replay?.index, replay?.phase, rootFen]);
  const position = useMemo(() => viewedGame ? gamePosition(viewedGame) : setupPosition, [viewedGame, setupPosition]);
  const boardPieces = useMemo(() => Object.fromEntries(Object.entries(position).map(([square, pieceType]) => [square, { pieceType }])), [position]);
  const turn = viewedGame ? viewedGame.turn() : setupTurn;
  const activeGame = viewedGame ?? game.current;
  const fen = playing ? viewedGame?.fen() ?? gameFen : positionFen(position, turn, availableCastling(position, "KQkq"));
  const finished = playing && activeGame.isGameOver();
  const analysisEnabled = playing && !finished && (!reviewing || replay.phase === "after") && Object.values(tools).some(Boolean);
  const analysisMoves = reviewing ? moves.slice(0, replay.index + 1) : moves;
  const analysis = useChessAnalysis({ enabled: analysisEnabled, fen, rootFen, moves: analysisMoves.map(moveUci), lines: tools.variations ? 3 : 1 });
  const best = analysis.variations.find((variation) => variation.rank === 1);
  const legalTargets = playing && selection?.source && !promotion ? [...new Set(game.current.moves({ square: selection.source, verbose: true }).map((move) => move.to))] : [];
  const moveRows = groupMoveRows(moves, rootFen);
  const latestMove = playing ? (reviewing && replay.phase !== "waiting" ? replayMove : moves.at(-1)) : null;
  const currentMoveIndex = reviewing ? replay.index : moves.length - 1;
  useEffect(() => () => clearTimeout(replayTimer.current), []);
  function reviewMove(index) {
    if (promotion || replay?.busy) return;
    clearTimeout(replayTimer.current);
    setSelection(null);
    // Let any live move settle before resetting to this move's exact starting position.
    const delay = Math.max(0, 260 - (Date.now() - lastMutation.current));
    setReplay({ index, phase: "waiting", busy: true });
    replayTimer.current = setTimeout(() => {
      setReplay({ index, phase: "before", busy: true });
      replayTimer.current = setTimeout(() => {
        setReplay({ index, phase: "after", busy: true });
        setMessage(`Đang xem lại nước ${moves[index].san}.`);
        replayTimer.current = setTimeout(() => setReplay({ index, phase: "after", busy: false }), reducedMotion ? 0 : 260);
      }, 60);
    }, delay);
  }
  function returnToLive() {
    clearTimeout(replayTimer.current); setReplay(null); setSelection(null);
    lastMutation.current = Date.now(); setMessage(gameStatus(game.current));
  }
  function navigateHistory(index) {
    if (promotion || replay?.busy || !moves.length) return;
    if (index >= moves.length - 1) { returnToLive(); return; }
    clearTimeout(replayTimer.current); setSelection(null);
    const target = Math.max(-1, index);
    setReplay({ index: target, phase: "after", busy: !reducedMotion });
    setMessage(target < 0 ? "Đang xem thế cờ ban đầu." : `Đang xem lại nước ${moves[target].san}.`);
    if (!reducedMotion) replayTimer.current = setTimeout(() => setReplay({ index: target, phase: "after", busy: false }), 260);
  }
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);
  useLayoutEffect(() => {
    const viewport = historyViewport.current;
    if (viewport && (followHistory.current || moves.length < previousMoveCount.current)) viewport.scrollTop = viewport.scrollHeight;
    previousMoveCount.current = moves.length;
  }, [moves.length, playing]);
  function update(next, notice) {
    setHistory((items) => [...items.slice(-49), position]);
    setPosition(next);
    setSelection(null); setError(""); setMessage(notice);
  }
  function syncGame() {
    lastMutation.current = Date.now();
    setPosition(gamePosition(game.current)); setTurn(game.current.turn());
    setGameFen(game.current.fen()); setMoves(game.current.history({ verbose: true }));
    setSelection(null); setPromotion(null); setError(""); setMessage(gameStatus(game.current));
  }
  function confirmSetup() {
    try {
      game.current = createSetupGame(fen);
      setRootFen(game.current.fen()); syncGame(); setTools(OFF); setMode("play"); followHistory.current = true;
    } catch (failure) { setError(failure.message); }
  }
  function backToSetup() {
    clearTimeout(replayTimer.current); setPosition(position); setTurn(turn); setReplay(null);
    setMode("setup"); setTools(OFF); setPromotion(null); setSelection(null); setHistory([]);
    setError(""); setMessage("Tiếp tục xếp quân từ thế cờ hiện tại.");
  }
  function playMove(from, to, chosenPromotion) {
    if (!from || !to || reviewing || finished || promotion && !chosenPromotion) return false;
    const choices = game.current.moves({ square: from, verbose: true }).filter((move) => move.to === to);
    if (!choices.length) { setMessage("Nước đi không hợp lệ. Hãy chọn một ô được đánh dấu."); return false; }
    if (choices.some((move) => move.promotion) && !chosenPromotion) { setPromotion({ from, to, color: turn }); setSelection(null); return false; }
    try { game.current.move({ from, to, promotion: chosenPromotion }); syncGame(); return true; }
    catch { setMessage("Không thể thực hiện nước đi này."); return false; }
  }
  function place(square) {
    if (playing) {
      if (promotion || reviewing || finished) return;
      if (position[square]?.[0] === turn) { setSelection(selection?.source === square ? null : { source: square, piece: position[square] }); return; }
      if (selection?.source) playMove(selection.source, square);
    } else if (selection?.erase) {
      if (position[square]) { update(editPosition(position, square, null), `Đã gỡ quân ở ${square}.`); setSelection({ erase: true }); }
    } else if (selection) {
      const selected = selection;
      update(editPosition(position, selected.source, square, selected.piece), `Đã đặt ${PIECE_NAMES[selected.piece[1]].toLowerCase()} ở ${square}.`);
      if (!selected.source) setSelection(selected);
    } else if (position[square]) setSelection({ source: square, piece: position[square] });
  }
  function undo() {
    if (!history.length) return;
    const previous = history.at(-1);
    setPosition(previous); setHistory((items) => items.slice(0, -1));
    setSelection(null); setError(""); setMessage("Đã hoàn tác lần xếp quân gần nhất.");
  }
  const bestMove = best?.moves[0];
  const evaluation = evaluationDisplay(best?.score, orientation);
  const engineTitle = analysis.status === "error" ? "Lỗi phân tích" : analysis.status === "loading" ? "Đang tải phân tích" : analysis.status === "searching" ? "Đang phân tích" : analysis.status === "done" ? `Độ sâu ${best?.depth ?? "—"}` : "Phân tích đang tắt";
  const options = {
    id: "position-editor", position: boardPieces,
    boardOrientation: orientation, allowDragging: !reviewing && !promotion && !finished, allowDragOffBoard: !playing, allowDrawingArrows: false,
    arrows: tools.arrows && analysisEnabled && bestMove ? [{ startSquare: bestMove.slice(0, 2), endSquare: bestMove.slice(2, 4), color: "#b36b14" }] : [],
    clearArrowsOnPositionChange: false, clearArrowsOnClick: false,
    canDragPiece: ({ piece }) => !playing || piece.pieceType[0] === turn,
    dragActivationDistance: 6, animationDurationInMs: reducedMotion ? 0 : 240, showAnimations: !reducedMotion && replay?.phase !== "before",
    darkSquareStyle: { backgroundColor: "#879ab5" }, lightSquareStyle: { backgroundColor: "#e8edf3" },
    darkSquareNotationStyle: { color: "#152b4a" }, lightSquareNotationStyle: { color: "#253d60" },
    onPieceDrag: ({ piece, square }) => { setDragging(true); setSelection(playing && square ? { source: square, piece: piece.pieceType } : !playing && !square ? { piece: piece.pieceType } : null); }, onPieceDragCancel: () => setDragging(false),
    onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
      setDragging(false);
      if (playing) {
        if (sourceSquare === targetSquare) { setSelection({ source: sourceSquare, piece: piece.pieceType }); return false; }
        return playMove(sourceSquare, targetSquare);
      }
      if (piece.isSparePiece && !targetSquare || sourceSquare === targetSquare) return false;
      update(editPosition(position, piece.isSparePiece ? null : sourceSquare, targetSquare, piece.pieceType), targetSquare ? `Đã đặt quân ở ${targetSquare}.` : `Đã gỡ quân ở ${sourceSquare}.`);
      return true;
    },
    onSquareClick: ({ square }) => place(square),
    squareRenderer: ({ square, children }) => <div className={`be-square ${square === latestMove?.from ? "be-square--last-from" : ""} ${square === latestMove?.to ? "be-square--last-to" : ""} ${square === selection?.source ? "be-square--selected" : ""}`} data-legal-target={legalTargets.includes(square) ? position[square] ? "capture" : "move" : undefined} role="button" tabIndex={0} aria-pressed={square === selection?.source} aria-label={`${square}: ${position[square] ? `${PIECE_NAMES[position[square][1]]} ${position[square][0] === "w" ? "trắng" : "đen"}` : "ô trống"}${legalTargets.includes(square) ? " · Nước đi hợp lệ" : ""}`} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); place(square); }
      if (!playing && (event.key === "Delete" || event.key === "Backspace")) { event.preventDefault(); if (position[square]) update(editPosition(position, square, null), `Đã gỡ quân ở ${square}.`); }
      if (event.key === "Escape") setSelection(null);
    }}>{children}{legalTargets.includes(square) && <span className={`be-legal-target ${position[square] ? "be-legal-target--capture" : ""}`} aria-hidden="true" />}{square === latestMove?.to && <span key={fen} className="be-square-arrival" aria-hidden="true" />}</div>,
  };
  return <div className="app-shell"><AppChrome title="Xếp thế cờ" activeSection="board" teacherId={teacherId} teacherName={teacherName} onLogout={onLogout} onNavigate={onNavigate} /><main className="dashboard board-editor-page">
    <p className="be-intro">{playing ? "Đi quân trên bàn để minh họa và cùng học viên phân tích thế cờ." : "Chọn quân và đặt lên bàn để chuẩn bị bài giảng."}</p>
    <ChessboardProvider options={options}>
      <div className="be-workspace" onKeyDown={(event) => { if (event.key === "Escape") setSelection(null); }}>
        <section className="be-board-section" aria-label={playing ? "Bàn cờ đi quân" : "Bàn cờ xếp quân"}>
          <div className="be-board-toolbar">
            {playing ? <span className="be-turn-current"><span className={`be-turn-dot be-turn-dot--${turn}`} aria-hidden="true" />{turn === "w" ? "Trắng" : "Đen"} đến lượt</span> : <div className="be-turn-field"><span className="be-control-label">Bên đến lượt</span><div className="be-turn-select" role="group" aria-label="Bên đến lượt">{[["w", "Trắng"], ["b", "Đen"]].map(([value, label]) => <button type="button" key={value} aria-label={label} title={`${label} đến lượt`} aria-pressed={turn === value} onClick={() => { setTurn(value); setError(""); }}><span className={`be-turn-dot be-turn-dot--${value}`} aria-hidden="true" />{label}</button>)}</div></div>}
            <div className="be-board-actions">
              <IconButton label="Lật bàn" note="Đổi góc nhìn Trắng/Đen. Thế cờ được giữ nguyên." icon="flip" onClick={() => setOrientation((value) => value === "white" ? "black" : "white")} />
              {!playing && <IconButton label="Hoàn tác" note="Khôi phục lần xếp quân gần nhất." icon="undo" disabled={!history.length} onClick={undo} />}
              {playing && <IconButton label="Quay lại xếp quân" icon="edit" onClick={backToSetup} />}
            </div>
          </div>
          <div className={`be-board-stage ${playing && tools.evaluation ? "be-board-stage--evaluation" : ""}`}>
            {playing && tools.evaluation && <div className={`be-eval-bar ${orientation === "black" ? "be-eval-bar--flipped" : ""}`} role="img" aria-label={`Đánh giá thế cờ: ${best ? scoreText(best.score) : "chưa có kết quả"}`} title={best ? scoreText(best.score) : "Đang chờ phân tích"}>
              <div className="be-eval-black" style={{ height: `${100 - evaluation.whitePercent}%` }} />
              <div className="be-eval-white" style={{ height: `${evaluation.whitePercent}%` }} />
              <span className={`be-eval-number ${evaluation.darkLabel ? "be-eval-number--dark" : ""} ${evaluation.labelAtTop ? "be-eval-number--top" : ""}`}>{evaluation.label}</span>
            </div>}
            <div className="be-board" data-fen={fen} data-reduced-motion={reducedMotion}><Chessboard /></div>
          </div>
          {!playing && <button type="button" className="primary-button be-confirm" aria-label="Xác nhận thế cờ" onClick={confirmSetup}><UiIcon name="check" size={20} />Xác nhận thế cờ</button>}
          <span className="be-sr-only be-status" role="status">{message}</span>
          {playing && (finished || activeGame.isCheck()) && <p className="be-event" role="status">{finished ? gameStatus(activeGame) : "Chiếu"}</p>}
          {!playing && error && <p className="be-error" role="alert">{error}</p>}
          {promotion && <section className="be-promotion" aria-label="Chọn quân phong cấp"><h2>Phong cấp</h2><div>{["Q", "R", "B", "N"].map((role) => { const Piece = defaultPieces[`${promotion.color}${role}`]; return <button type="button" key={role} aria-label={PIECE_NAMES[role]} title={PIECE_NAMES[role]} onClick={() => playMove(promotion.from, promotion.to, role.toLowerCase())}><span><Piece /></span></button>; })}</div><IconButton label="Hủy phong cấp" icon="close" onClick={() => setPromotion(null)} /></section>}
        </section>
        <aside className={`be-controls ${playing ? "be-controls--play" : ""}`} aria-label={playing ? "Công cụ đi quân và phân tích" : "Công cụ xếp thế cờ"}>
          {!playing ? <section className="be-palette" aria-label="Quân cờ">
            <header className="be-palette-heading"><h2>Soạn thế cờ</h2><p>Chọn hoặc kéo quân vào ô trên bàn.</p></header>
            {["w", "b"].map((color) => <div className="be-piece-group" key={color} aria-label={color === "w" ? "Quân trắng" : "Quân đen"}><h3>{color === "w" ? "Quân trắng" : "Quân đen"}</h3><div className="be-piece-tray">{Object.entries(PIECE_NAMES).map(([role, name]) => {
              const type = `${color}${role}`;
              const label = `Chọn ${name.toLowerCase()} ${color === "w" ? "trắng" : "đen"}`;
              return <div className={`be-spare ${selection?.piece === type && !selection?.source ? "be-spare--selected" : ""}`} key={type} data-spare={type} title={label}><button type="button" aria-label={label} title={label} aria-pressed={selection?.piece === type && !selection?.source} onClick={() => setSelection({ piece: type })}><span className="be-spare-art"><SparePiece pieceType={type} /></span></button></div>;
            })}</div></div>)}
            <div className="be-palette-actions"><IconButton label="Xóa bàn" visibleLabel tone="danger" icon="trash" disabled={!Object.keys(position).length} onClick={() => update({}, "Đã xóa bàn cờ.")} /><IconButton label="Vị trí ban đầu" visibleLabel note="Đặt lại 32 quân ở vị trí xuất phát, Trắng đi trước." icon="reset" onClick={() => { update(initialPosition(), "Đã khôi phục vị trí ban đầu."); setTurn("w"); }} /></div>
            <button type="button" className={`be-remove-zone ${dragging ? "be-remove-zone--dragging" : ""}`} aria-label="Gỡ quân" title="Kéo quân ra ngoài để gỡ, hoặc chọn công cụ này rồi bấm quân" aria-pressed={Boolean(selection?.erase)} onClick={() => setSelection(selection?.erase ? null : { erase: true })}><UiIcon name="trash" size={20} /><span><strong>Gỡ quân</strong><small>Kéo quân ra ngoài, hoặc chọn rồi bấm quân.</small></span></button>
          </section> : <>
            <div className="be-analysis-tools" role="group" aria-label="Công cụ phân tích" data-status={analysis.status} data-analysis-enabled={analysisEnabled}>
              <div className="be-analysis-heading"><h2>Phân tích</h2><span className="be-engine-label" role="status">{engineTitle}</span></div><AnalysisSettings tools={tools} onToggle={(key) => setTools((previous) => ({ ...previous, [key]: !previous[key] }))} />
              {analysisEnabled && <span className={`be-engine-indicator be-engine-indicator--${analysis.status}`} role="img" aria-label={engineTitle} title={engineTitle} />}
            </div>
            {analysis.error && <div className="be-error" role="alert">{analysis.error}<button type="button" className="text-button" onClick={analysis.retry}>Thử lại</button></div>}
            {tools.variations && analysis.variations.length > 0 && <ol className="be-variations" aria-label="Các phương án tiếp diễn">{analysis.variations.map((variation) => <li key={variation.rank}><div><span>{variation.rank}</span><strong>{scoreText(variation.score)}</strong></div><p>{variationSan(fen, variation.moves)}</p></li>)}</ol>}
            <section className="be-history" aria-label="Nước đã đi"><div className="be-history-heading"><h2>Nước đi</h2>{reviewing && <button type="button" className="be-live-button" disabled={replay.busy} onClick={returnToLive}><UiIcon name="chevron" size={16} />Hiện tại</button>}</div>{moves.length ? <div ref={historyViewport} className="be-history-scroll" role="region" aria-label="Lịch sử nước đi" tabIndex={0} onScroll={(event) => { const viewport = event.currentTarget; followHistory.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 40; }}><table className="be-move-table"><colgroup><col className="be-move-number-col" /><col /><col /></colgroup><thead className="be-sr-only"><tr><th scope="col">Lượt</th><th scope="col">Trắng</th><th scope="col">Đen</th></tr></thead><tbody>{moveRows.map((row) => <tr key={row.number}><th scope="row">{row.number}.</th>{[row.white, row.black].map((move, column) => <td key={column} aria-current={move?.index === currentMoveIndex ? "step" : undefined}>{move && <button type="button" className="be-history-move" aria-label={`Xem nước ${row.number}, ${column === 0 ? "Trắng" : "Đen"}: ${move.san}`} aria-current={move.index === currentMoveIndex ? "step" : undefined} disabled={Boolean(promotion) || Boolean(replay?.busy)} onClick={() => reviewMove(move.index)}>{move.san}</button>}</td>)}</tr>)}</tbody></table></div> : <span className="be-empty-moves" aria-label="Chưa có nước đi">Chưa có nước đi. Chọn một quân trên bàn để bắt đầu.</span>}<div className="be-history-navigation" role="group" aria-label="Điều hướng nước đi">{[{ label: "Về thế cờ ban đầu", icon: "firstMove", index: -1, boundary: currentMoveIndex < 0 }, { label: "Lùi một bước", icon: "previousMove", index: currentMoveIndex - 1, boundary: currentMoveIndex < 0 }, { label: "Tiến một bước", icon: "nextMove", index: currentMoveIndex + 1, boundary: currentMoveIndex >= moves.length - 1 }, { label: "Đến nước cuối cùng", icon: "lastMove", index: moves.length - 1, boundary: currentMoveIndex >= moves.length - 1 }].map(({ label, icon, index, boundary }) => <IconButton key={icon} label={label} icon={icon} disabled={!moves.length || boundary || Boolean(promotion) || Boolean(replay?.busy)} onClick={() => navigateHistory(index)} />)}</div></section>
          </>}
        </aside>
      </div>
    </ChessboardProvider>
  </main></div>;
}

function IconButton({ label, note, icon, onClick, disabled = false, pressed, visibleLabel = false, tone }) {
  const id = useId();
  const button = <button type="button" className={`be-icon-button${visibleLabel ? " be-labeled-button" : ""}${tone ? ` be-button--${tone}` : ""}`} aria-label={label} title={note ? undefined : label} aria-describedby={note ? id : undefined} aria-pressed={pressed} disabled={disabled} onClick={onClick}><UiIcon name={icon} size={20} />{visibleLabel && <span>{label}</span>}</button>;
  return note ? <span className="be-button-tip">{button}<span id={id} role="tooltip" className="be-button-note"><strong>{label}</strong><span>{note}</span></span></span> : button;
}

