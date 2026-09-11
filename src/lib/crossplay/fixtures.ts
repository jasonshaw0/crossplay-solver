import { emptyBoard } from './board';
import { CROSSPLAY_CONFIG } from './config';
import type { Board, Direction, Placement } from './types';

export function placementsFor(word:string,row:number,col:number,direction:Direction='across'):Placement[] {
  return [...word].map((letter,i)=>({row:row+(direction==='down'?i:0),col:col+(direction==='across'?i:0),letter:letter.toUpperCase(),isBlank:letter!==letter.toUpperCase(),points:letter!==letter.toUpperCase()?0:CROSSPLAY_CONFIG.tileValues[letter]}));
}
export function put(board:Board,word:string,row:number,col:number,direction:Direction='across') {
  for(const p of placementsFor(word,row,col,direction)) board[p.row][p.col]={letter:p.letter,isBlank:p.isBlank};
  return board;
}
/** Manually transcribed committed state from IMG_2849.jpeg. */
export function realMidgame() {
  const board=emptyBoard();
  put(board,'RELAXED',7,5);put(board,'FEZ',6,6,'down');put(board,'LAVAS',7,7,'down');
  put(board,'VACS',9,7);put(board,'NOTES',11,3);put(board,'NeRD',11,3,'down');
  put(board,'GOLD',14,0);put(board,'OVeN',12,1);put(board,'REACT',13,3);
  return {board,rack:[...'HOIYDOW']};
}
