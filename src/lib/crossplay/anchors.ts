import { inside, occupiedCount } from './board';
import type { Board, Cell, CrossplayGameConfig } from './types';
export function findAnchors(board:Board, config:CrossplayGameConfig):Cell[] {
  if (!occupiedCount(board)) return [{...config.center}];
  const anchors:Cell[]=[];
  for(let row=0;row<config.size;row++) for(let col=0;col<config.size;col++) {
    if(!board[row][col] && [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>inside(row+dr,col+dc,config.size)&&board[row+dr][col+dc])) anchors.push({row,col});
  }
  return anchors;
}
