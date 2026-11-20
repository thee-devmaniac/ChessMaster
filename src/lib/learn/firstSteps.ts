import { Chess } from "chess.js";
import type { PlayedMove } from "@/lib/chess/rules";

/**
 * "First steps": the rules of chess for complete beginners, one small task
 * at a time. Each step has a position (FEN), a short explanation and a goal.
 * Tests replay every step's `solution` to prove the positions are legal and
 * the goals can be reached.
 */

export type Goal =
  /** Just read: the Next button is available straight away. */
  | { kind: "read" }
  /** Click a square (for learning square names). */
  | { kind: "square"; square: string }
  /** Play one of these moves (standard notation, as chess.js writes it). */
  | { kind: "move"; accept: string[] }
  /** Give check / checkmate / castle / promote a pawn / make any legal move. */
  | { kind: "check" }
  | { kind: "mate" }
  | { kind: "castle" }
  | { kind: "promote" }
  | { kind: "any" };

export interface LessonStep {
  id: string;
  title: string;
  /** Short paragraphs. */
  text: string[];
  /** What to do, shown as the task. */
  task: string;
  fen: string;
  goal: Goal;
  /** A square whose piece starts selected, so its moves show as dots. */
  showMovesFrom?: string;
  /** A nudge after a wrong try. */
  hint: string;
  /** Said when the task is done. */
  success: string;
  /** For "Show me" and for the tests: a move (or square) that reaches the goal. */
  solution?: string;
}

export const FIRST_STEPS: LessonStep[] = [
  {
    id: "board",
    title: "The board",
    text: [
      "A chessboard has 64 squares. The columns are called files, named a to h. The rows are called ranks, numbered 1 to 8.",
      "So every square has a name: a letter and a number, like e4. White starts at the bottom (ranks 1 and 2), Black at the top.",
    ],
    task: "Click the square e4.",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    goal: { kind: "square", square: "e4" },
    hint: "Find file e (the fifth letter along the bottom), then go up to rank 4.",
    success: "That's e4: the square many games start with.",
    solution: "e4",
  },
  {
    id: "rook",
    title: "The rook",
    text: [
      "The rook moves in straight lines: up, down, left or right, as far as it likes. It can't jump over pieces.",
      "You capture by moving onto an enemy piece's square: the piece is removed. The dots show where your rook can go.",
    ],
    task: "Capture the black knight with your rook.",
    fen: "k7/3n4/8/8/8/8/8/3R3K w - - 0 1",
    goal: { kind: "move", accept: ["Rxd7"] },
    showMovesFrom: "d1",
    hint: "The knight is straight up the d-file from your rook.",
    success: "Captured! Rooks are strong on open files like this one.",
    solution: "Rxd7",
  },
  {
    id: "bishop",
    title: "The bishop",
    text: [
      "The bishop moves diagonally, as far as it likes. Each bishop stays on one colour of square for the whole game.",
    ],
    task: "Capture the black rook with your bishop.",
    fen: "k7/8/7r/8/8/8/8/K1B5 w - - 0 1",
    goal: { kind: "move", accept: ["Bxh6"] },
    showMovesFrom: "c1",
    hint: "Follow the diagonal from c1 up and to the right.",
    success: "Well done. A bishop for a rook is a good trade for you.",
    solution: "Bxh6",
  },
  {
    id: "queen",
    title: "The queen",
    text: ["The queen is the strongest piece: she moves like a rook and a bishop together, in any straight line or diagonal."],
    task: "Capture the black rook with your queen.",
    fen: "7k/8/8/8/r7/8/8/3Q3K w - - 0 1",
    goal: { kind: "move", accept: ["Qxa4"] },
    showMovesFrom: "d1",
    hint: "The rook is on a diagonal from your queen.",
    success: "Right! Remember: because she is so valuable, keep your queen safe.",
    solution: "Qxa4",
  },
  {
    id: "king",
    title: "The king",
    text: [
      "The king moves one square in any direction. He is the most important piece: if he is trapped, you lose.",
      "The king can capture too, but only a piece that isn't protected.",
    ],
    task: "Capture the black pawn with your king.",
    fen: "7k/8/8/3p4/4K3/8/8/8 w - - 0 1",
    goal: { kind: "move", accept: ["Kxd5"] },
    showMovesFrom: "e4",
    hint: "The pawn is one step away, diagonally up and to the left.",
    success: "Good. Nothing protected that pawn, so your king could take it safely.",
    solution: "Kxd5",
  },
  {
    id: "knight",
    title: "The knight",
    text: [
      "The knight moves in an L: two squares in one direction, then one square to the side.",
      "It's the only piece that can jump over others. Notice the pawns around it don't stop it.",
    ],
    task: "Jump over the pawns and capture the black bishop.",
    fen: "7k/8/4b3/3P4/2PNP3/3P4/8/7K w - - 0 1",
    goal: { kind: "move", accept: ["Nxe6"] },
    showMovesFrom: "d4",
    hint: "Two squares up, then one to the right.",
    success: "Jumped! Knights are tricky because they attack in ways other pieces don't.",
    solution: "Nxe6",
  },
  {
    id: "pawn",
    title: "The pawn",
    text: [
      "Pawns move straight forward one square (two squares on their very first move). They never move backwards.",
      "But pawns capture differently: one square diagonally forward. A pawn blocked in front can still capture.",
    ],
    task: "Your pawn is blocked. Capture the knight with it.",
    fen: "7k/8/8/3np3/4P3/8/8/K7 w - - 0 1",
    goal: { kind: "move", accept: ["exd5"] },
    showMovesFrom: "e4",
    hint: "Pawns capture one square diagonally forward.",
    success: "That's how pawns capture. Don't forget it: beginners often miss pawn captures.",
    solution: "exd5",
  },
  {
    id: "promotion",
    title: "Promotion",
    text: [
      "When a pawn reaches the other side of the board, it turns into a queen, rook, bishop or knight: your choice. Almost everyone chooses a queen.",
    ],
    task: "Push your pawn to the last rank and promote it.",
    fen: "7k/1P6/8/8/8/8/8/K7 w - - 0 1",
    goal: { kind: "promote" },
    showMovesFrom: "b7",
    hint: "Move the pawn forward one square, then pick a piece.",
    success: "A new queen! Getting a pawn to the end can win the game.",
    solution: "b8=Q+",
  },
  {
    id: "check",
    title: "Check",
    text: [
      "When a piece attacks the king, the king is in check. The player in check must get out of it straight away.",
    ],
    task: "Put the black king in check with your rook.",
    fen: "4k3/8/8/8/8/8/8/R5K1 w - - 0 1",
    goal: { kind: "check" },
    showMovesFrom: "a1",
    hint: "Move the rook onto the same row or column as the black king.",
    success: "Check! Black now has to deal with it.",
    solution: "Ra8+",
  },
  {
    id: "escape",
    title: "Getting out of check",
    text: [
      "Now you are in check: the black rook attacks your king along the e-file.",
      "There are three ways out: move the king, block the attack by putting a piece in between, or capture the attacker.",
    ],
    task: "Get out of check (any way you like).",
    fen: "4r2k/8/8/8/R7/8/8/4K3 w - - 0 1",
    goal: { kind: "any" },
    hint: "Your king can step aside, or your rook can block on the e-file.",
    success: "Safe! Chess doesn't even allow a move that leaves your king in check.",
    solution: "Re4",
  },
  {
    id: "mate",
    title: "Checkmate",
    text: [
      "Checkmate is check with no way out: the king can't move, the attack can't be blocked, and the attacker can't be captured. Checkmate wins the game.",
      "Here Black's own pawns trap the king. This is called a back-rank mate.",
    ],
    task: "Checkmate the black king in one move.",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    goal: { kind: "mate" },
    hint: "Your rook can reach Black's back rank, and the king has nowhere to go.",
    success: "Checkmate! You've won the game.",
    solution: "Ra8#",
  },
  {
    id: "castling",
    title: "Castling",
    text: [
      "Castling is a special move: the king moves two squares towards a rook, and the rook jumps to the other side of him. It's the only move where two pieces move at once.",
      "You can castle only if neither piece has moved yet, nothing stands between them, and your king is not in check and doesn't pass through an attacked square.",
    ],
    task: "Castle to make your king safe. Move the king two squares to the right.",
    fen: "4k3/8/8/8/8/8/5PPP/4K2R w K - 0 1",
    goal: { kind: "castle" },
    showMovesFrom: "e1",
    hint: "Click your king, then the square two to its right (g1).",
    success: "Castled! Your king is tucked behind its pawns, and the rook is ready to play.",
    solution: "O-O",
  },
  {
    id: "en-passant",
    title: "En passant",
    text: [
      "One more pawn rule. Black's pawn has just jumped two squares, from d7 to d5, landing right beside your pawn.",
      "For this one move only, your pawn may capture it as if it had moved just one square: you move to d6 and the black pawn disappears. This is called en passant (French for \"in passing\").",
    ],
    task: "Capture the black pawn en passant.",
    fen: "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1",
    goal: { kind: "move", accept: ["exd6"] },
    showMovesFrom: "e5",
    hint: "Move your pawn diagonally to d6, behind the black pawn.",
    success: "That's en passant: rare, but now you'll recognise it.",
    solution: "exd6",
  },
  {
    id: "stalemate",
    title: "Stalemate and draws",
    text: [
      "Here it is Black's move. Black is not in check, but every square the king could go to is attacked, and Black has no other pieces. That's stalemate, and stalemate is a draw.",
      "So when you're winning, make sure the other king always has a move until you checkmate it. Games are also drawn by agreement, by repeating the same position three times, or when nobody has enough pieces left to checkmate.",
    ],
    task: "Read, then press Next.",
    fen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1",
    goal: { kind: "read" },
    hint: "",
    success: "",
  },
  {
    id: "values",
    title: "What the pieces are worth",
    text: [
      "To decide whether a trade is good, players count: pawn 1, knight 3, bishop 3, rook 5, queen 9. The king can't be traded: losing him loses the game.",
      "Three simple rules for your first games: bring out your knights and bishops, castle early, and before every move ask: what does my opponent's last move attack?",
    ],
    task: "You know the rules! Press Next to finish.",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    goal: { kind: "read" },
    hint: "",
    success: "",
  },
];

/** Did this move complete the step's goal? (A square click is handled separately, by `square`.) */
export function moveMeetsGoal(goal: Goal, move: PlayedMove): boolean {
  const after = new Chess(move.fenAfter);
  switch (goal.kind) {
    case "move":
      return goal.accept.includes(move.san.replace(/[+#]$/, "")) || goal.accept.includes(move.san);
    case "check":
      return after.inCheck();
    case "mate":
      return after.isCheckmate();
    case "castle":
      return move.san.startsWith("O-O");
    case "promote":
      return Boolean(move.promotion);
    case "any":
      return true;
    default:
      return false;
  }
}
