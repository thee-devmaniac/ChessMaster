import type { Analysis, SearchLimit, Score, UciInfo } from "./types";
import { parseBestMove, parseInfoLine } from "./uci";
import { sideToMove, toWhitePov } from "./score";

/**
 * The small part of the browser Worker API we use. Depending on this
 * interface (instead of Worker directly) lets tests pass in a fake worker.
 */
export interface EngineWorker {
  postMessage(message: string): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror?: ((event: unknown) => void) | null;
  terminate(): void;
}

/** Thrown (as a rejected promise) when an analysis is replaced or cancelled. */
export class AnalysisCancelledError extends Error {
  constructor() {
    super("Analysis cancelled");
    this.name = "AnalysisCancelledError";
  }
}

interface Job {
  fen: string;
  limit: SearchLimit;
  onInfo?: (partial: { depth: number; score: Score; pv: string[] }) => void;
  resolve: (a: Analysis) => void;
  reject: (e: Error) => void;
  lastInfo: UciInfo | null;
  cancelled: boolean;
}

/**
 * Wraps one Stockfish worker and turns its text protocol (UCI) into promises.
 *
 * Rules:
 *  - The engine thinks about one position at a time.
 *  - "Latest request wins": calling analyse() while a search is running cancels
 *    that search. This is what we want when the user steps through a game
 *    quickly. Only the position currently on screen matters.
 *  - When a search is stopped, Stockfish still sends one last "bestmove" for
 *    it. We must ignore that line, and only then start the next search.
 */
export class StockfishEngine {
  private worker: EngineWorker;
  private ready: Promise<void>;
  private waiters: { token: string; resolve: () => void }[] = [];
  private running: Job | null = null;
  private pending: Job | null = null;

  constructor(createWorker: () => EngineWorker) {
    this.worker = createWorker();
    this.worker.onmessage = (e) => this.handleLine(String(e.data));

    this.ready = new Promise<void>((resolve, reject) => {
      this.worker.onerror = (err) =>
        reject(new Error(`Engine failed to load: ${String(err)}`));
      // Handshake: "uci" -> "uciok", then "isready" -> "readyok".
      this.waitFor("uciok")
        .then(() => {
          const r = this.waitFor("readyok");
          this.send("isready");
          return r;
        })
        .then(resolve);
      this.send("uci");
    });
  }

  /** Resolves once the engine has loaded and answered the UCI handshake. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /** Analyses a position. Resolves with the final result (White's point of view). */
  async analyse(
    fen: string,
    limit: SearchLimit,
    onInfo?: Job["onInfo"],
  ): Promise<Analysis> {
    await this.ready;
    return new Promise<Analysis>((resolve, reject) => {
      const job: Job = { fen, limit, onInfo, resolve, reject, lastInfo: null, cancelled: false };

      if (!this.running) {
        this.start(job);
        return;
      }
      // Something is running: replace whatever was waiting, and stop the current search.
      this.pending?.reject(new AnalysisCancelledError());
      this.pending = job;
      this.cancelRunning();
    });
  }

  /** Cancels the current and any waiting analysis. */
  cancel(): void {
    this.pending?.reject(new AnalysisCancelledError());
    this.pending = null;
    this.cancelRunning();
  }

  dispose(): void {
    this.cancel();
    this.worker.terminate();
  }

  // ---- internals ----

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(token: string): Promise<void> {
    return new Promise((resolve) => this.waiters.push({ token, resolve }));
  }

  private start(job: Job) {
    this.running = job;
    this.send(`position fen ${job.fen}`);
    this.send(
      "depth" in job.limit
        ? `go depth ${job.limit.depth}`
        : `go movetime ${job.limit.movetimeMs}`,
    );
  }

  private cancelRunning() {
    const job = this.running;
    if (job && !job.cancelled) {
      job.cancelled = true;
      job.reject(new AnalysisCancelledError());
      this.send("stop"); // Stockfish replies with a "bestmove", handled below
    }
  }

  private handleLine(line: string) {
    // Handshake replies ("uciok", "readyok").
    const waiterIndex = this.waiters.findIndex((w) => line.startsWith(w.token));
    if (waiterIndex !== -1) {
      this.waiters.splice(waiterIndex, 1)[0].resolve();
      return;
    }

    const job = this.running;
    if (!job) return;

    const info = parseInfoLine(line);
    if (info) {
      if (job.cancelled) return;
      job.lastInfo = info;
      job.onInfo?.({
        depth: info.depth,
        score: toWhitePov(info.score, sideToMove(job.fen)),
        pv: info.pv,
      });
      return;
    }

    const best = parseBestMove(line);
    if (best === undefined) return; // some other line we don't care about

    // The search has finished (or was stopped). Settle it, then start the next one.
    this.running = null;
    if (!job.cancelled) {
      const last = job.lastInfo;
      job.resolve({
        fen: job.fen,
        depth: last?.depth ?? 0,
        score: last
          ? toWhitePov(last.score, sideToMove(job.fen))
          : { type: "cp", cp: 0 },
        bestMove: best,
        pv: last?.pv ?? [],
      });
    }
    const next = this.pending;
    this.pending = null;
    if (next) this.start(next);
  }
}
