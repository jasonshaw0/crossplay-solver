import { cellKey, physicalPoints } from './board';
import type { Board, Cell, CrossplayGameConfig, Direction, FormedWord, Placement } from './types';

/** Scores full reconstructed words. Existing premiums never reactivate. */
export function scoreWord(boardAfter: Board, coordinates: Cell[], direction: Direction, newlyPlaced: Set<string>, config: CrossplayGameConfig): FormedWord {
  let wordMultiplier = 1;
  const tiles = coordinates.map(cell => {
    const tile = boardAfter[cell.row][cell.col]!;
    const isNew = newlyPlaced.has(cellKey(cell));
    const premium = isNew ? config.premiums[cell.row][cell.col] : null;
    const letterMultiplier = premium === 'DL' ? 2 : premium === 'TL' ? 3 : 1;
    if (premium === 'DW') wordMultiplier *= 2;
    if (premium === 'TW') wordMultiplier *= 3;
    const basePoints = physicalPoints(tile, config);
    return {...cell, ...tile, isNew, basePoints, letterMultiplier, contribution: basePoints * letterMultiplier};
  });
  const subtotal = tiles.reduce((sum, tile) => sum + tile.contribution, 0);
  return { word: tiles.map(tile=>tile.letter).join(''), direction, coordinates, tiles, subtotal, wordMultiplier, score: subtotal * wordMultiplier };
}
export function scoreWords(boardAfter: Board, words: {coordinates:Cell[]; direction:Direction}[], placements:Placement[], config:CrossplayGameConfig) {
  const newlyPlaced = new Set(placements.map(cellKey));
  const formedWords = words.map(word => scoreWord(boardAfter, word.coordinates, word.direction, newlyPlaced, config));
  const bonus = placements.length === config.rackSize ? config.allTilesBonus : 0;
  return { words: formedWords, bonus, total: formedWords.reduce((n,w)=>n+w.score,0) + bonus };
}
