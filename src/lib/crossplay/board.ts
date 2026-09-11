import type { Board, Cell, CrossplayGameConfig, Direction, Placement, Tile } from './types';

export const cellKey = ({ row, col }: Cell) => `${row},${col}`;
export const inside = (row: number, col: number, size: number) => Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row < size && col < size;
export const delta = (direction: Direction): [number, number] => direction === 'across' ? [0, 1] : [1, 0];
export const perpendicular = (direction: Direction): Direction => direction === 'across' ? 'down' : 'across';
export const emptyBoard = (size = 15): Board => Array.from({ length: size }, () => Array<Tile | null>(size).fill(null));
export const cloneBoard = (board: Board): Board => board.map(row => row.map(tile => tile ? { ...tile } : null));
export const occupiedCount = (board: Board) => board.reduce((n, row) => n + row.filter(Boolean).length, 0);
export function applyPlacements(board: Board, placements: Placement[]): Board {
  const copy = cloneBoard(board);
  for (const tile of placements) copy[tile.row][tile.col] = { letter: tile.letter, isBlank: tile.isBlank };
  return copy;
}
export function physicalPoints(tile: Tile, config: CrossplayGameConfig) {
  return tile.isBlank ? 0 : config.tileValues[tile.letter];
}
export function collectWord(board: Board, cell: Cell, direction: Direction): Cell[] {
  const [dr, dc] = delta(direction);
  let { row, col } = cell;
  while (inside(row - dr, col - dc, board.length) && board[row - dr][col - dc]) { row -= dr; col -= dc; }
  const cells: Cell[] = [];
  while (inside(row, col, board.length) && board[row][col]) { cells.push({ row, col }); row += dr; col += dc; }
  return cells;
}
export function consumeRack(rack: string[], placements: Placement[]) {
  const next = [...rack];
  for (const tile of placements) {
    const index = next.indexOf(tile.isBlank ? '?' : tile.letter);
    if (index < 0) throw new Error('A placed tile is missing from the rack.');
    next[index] = '';
  }
  return next;
}
