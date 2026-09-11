import { delta, inside, perpendicular } from './board';
import type { Lexicon } from './dictionary';
import type { Board, Direction } from './types';
export const ALL_LETTERS=(1<<26)-1;
export function computeCrossChecks(board:Board, direction:Direction, lexicon:Pick<Lexicon,'words'>):number[][] {
  const size=board.length;
  const [dr,dc]=delta(perpendicular(direction));
  return board.map((row,r)=>row.map((tile,c)=>{
    if(tile) return 0;
    let before='',after='';
    for(let rr=r-dr,cc=c-dc;inside(rr,cc,size)&&board[rr][cc];rr-=dr,cc-=dc) before=board[rr][cc]!.letter+before;
    for(let rr=r+dr,cc=c+dc;inside(rr,cc,size)&&board[rr][cc];rr+=dr,cc+=dc) after+=board[rr][cc]!.letter;
    if(!before&&!after) return ALL_LETTERS;
    let mask=0;
    for(let i=0;i<26;i++) if(lexicon.words.has(before+String.fromCharCode(65+i)+after)) mask|=1<<i;
    return mask;
  }));
}
