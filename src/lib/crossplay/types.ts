export type Direction = 'across' | 'down';
export type Premium = 'DL' | 'TL' | 'DW' | 'TW' | null;
export interface Cell { row: number; col: number }
export interface Tile { letter: string; isBlank: boolean }
export type Board = (Tile | null)[][];
export type Rack = string[];
export interface Placement extends Cell, Tile { points: number }
export interface CrossplayGameConfig {
  size: number;
  center: Cell;
  premiums: Premium[][];
  tileValues: Record<string, number>;
  tileCounts: Record<string, number>;
  rackSize: number;
  allTilesBonus: number;
}
export interface WordTileScore extends Cell, Tile {
  basePoints: number;
  letterMultiplier: number;
  isNew: boolean;
  contribution: number;
}
export interface FormedWord {
  word: string;
  direction: Direction;
  coordinates: Cell[];
  tiles: WordTileScore[];
  subtotal: number;
  wordMultiplier: number;
  score: number;
}
export interface Move {
  id: string;
  mainWord: string;
  direction: Direction;
  startRow: number;
  startCol: number;
  placements: Placement[];
  formedWords: FormedWord[];
  totalScore: number;
  scoreBreakdown: { words: FormedWord[]; bonus: number; total: number };
}
export interface ValidationResult { legal: boolean; reasons: string[]; move?: Move }
export interface BoardIssue { message: string; cells: Cell[]; severity: 'warning' | 'error' }
export interface SolveStats {
  durationMs: number;
  anchors: number;
  starts: number;
  traversals: number;
  candidates: number;
  legalMoves: number;
  crossChecks: { across: number[][]; down: number[][] };
}
