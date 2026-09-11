import { inside } from '../../src/lib/crossplay/board';
import { placementKey, validateProposedMove } from '../../src/lib/crossplay/validation';
import type { Lexicon } from '../../src/lib/crossplay/dictionary';
import type { Board, CrossplayGameConfig, Move, Placement, Rack } from '../../src/lib/crossplay/types';

/** Deliberately slow oracle: try every dictionary word at every board origin,
 * both ways, then every physical tile/blank assignment. No anchors or masks. */
export function bruteForce(board:Board,rack:Rack,lexicon:Lexicon,config:CrossplayGameConfig):Move[] {
  const moves=new Map<string,Move>();
  for(const word of lexicon.words) for(const [dr,dc] of [[0,1],[1,0]]) {
    for(let r=0;r<config.size;r++) for(let c=0;c<config.size;c++) {
      if(!inside(r+(word.length-1)*dr,c+(word.length-1)*dc,config.size)) continue;
      if(inside(r-dr,c-dc,config.size)&&board[r-dr][c-dc]) continue;
      if(inside(r+word.length*dr,c+word.length*dc,config.size)&&board[r+word.length*dr][c+word.length*dc]) continue;
      const needed:{row:number;col:number;letter:string}[]=[];
      let match=true;
      for(let i=0;i<word.length;i++) {
        const row=r+i*dr,col=c+i*dc;
        if(board[row][col]) {if(board[row][col]!.letter!==word[i]) {match=false;break;}}
        else needed.push({row,col,letter:word[i]});
      }
      if(!match||!needed.length||needed.length>rack.filter(Boolean).length) continue;
      function assign(index:number,remaining:Rack,placed:Placement[]) {
        if(index===needed.length) {
          const v=validateProposedMove(board,rack,placed,lexicon,config);
          if(v.legal) moves.set(placementKey(placed),v.move!);
          return;
        }
        const cell=needed[index];
        for(const symbol of [cell.letter,'?']) {
          const at=remaining.indexOf(symbol); if(at<0) continue;
          assign(index+1,remaining.filter((_,i)=>i!==at),[...placed,{...cell,isBlank:symbol==='?',points:symbol==='?'?0:config.tileValues[symbol]}]);
        }
      }
      assign(0,rack,[]);
    }
  }
  return [...moves.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
