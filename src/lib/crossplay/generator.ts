import { delta, inside, cellKey } from './board';
import { findAnchors } from './anchors';
import { computeCrossChecks } from './crosschecks';
import { placementKey, validateProposedMove } from './validation';
import type { Lexicon } from './dictionary';
import type { Board, Cell, CrossplayGameConfig, Move, Placement, Rack, SolveStats } from './types';

/** Anchor/trie search with fixed start positions and perpendicular bit masks.
 * Every legal play contains a new anchor. Its left/top boundary is among the
 * starts scanned backward from that anchor within the rack's empty-cell budget.
 * Traverse from each unique boundary; consume existing tiles obligatorily and
 * branch over every rack/blank assignment. Accept only at a real word boundary.
 * No score cutoffs, word limits, beam search, or strategic pruning.
 */
export function generateMoves(board:Board,rack:Rack,lexicon:Lexicon,config:CrossplayGameConfig):{moves:Move[];stats:SolveStats} {
  const startTime=performance.now();
  if(board.length!==config.size||board.some(row=>row.length!==config.size)) throw new Error('Invalid board dimensions.');
  const letters=rack.filter(Boolean);
  if(letters.length>config.rackSize||letters.some(t=>!/^[A-Z?]$/.test(t))) throw new Error('Rack must contain up to seven A–Z letters or blanks (?).');
  if(board.some(row=>row.some(t=>t&&(!/^[A-Z]$/.test(t.letter)||typeof t.isBlank!=='boolean')))) throw new Error('Invalid board tile.');
  const anchors=findAnchors(board,config);
  const anchorKeys=new Set(anchors.map(cellKey));
  const checks={across:computeCrossChecks(board,'across',lexicon),down:computeCrossChecks(board,'down',lexicon)};
  const stats:SolveStats={durationMs:0,anchors:anchors.length,starts:0,traversals:0,candidates:0,legalMoves:0,crossChecks:checks};
  const moves=new Map<string,Move>();
  const seen=new Set<string>();
  const counts=new Int8Array(27);
  for(const letter of letters) counts[letter==='?'?26:letter.charCodeAt(0)-65]++;
  if(letters.length) for(const direction of ['across','down'] as const) {
    const [dr,dc]=delta(direction);
    const starts=new Map<string,Cell>();
    for(const anchor of anchors) {
      let empties=0;
      for(let row=anchor.row,col=anchor.col;inside(row,col,config.size);row-=dr,col-=dc) {
        if(!board[row][col]) empties++;
        if(empties>letters.length) break;
        if(!inside(row-dr,col-dc,config.size)||!board[row-dr][col-dc]) starts.set(`${row},${col}`,{row,col});
      }
    }
    stats.starts+=starts.size;
    const placed:Placement[]=[];
    function walk(row:number,col:number,index:number,touchedAnchor:boolean) {
      stats.traversals++;
      const inBounds=inside(row,col,config.size);
      const occupied=inBounds?board[row][col]:null;
      const node=lexicon.nodes[index];
      if(!occupied && node.terminal && placed.length && touchedAnchor) {
        const key=placementKey(placed);
        if(!seen.has(key)) {
          seen.add(key); stats.candidates++;
          const validated=validateProposedMove(board,rack,placed,lexicon,config);
          if(validated.legal) moves.set(key,validated.move!);
        }
      }
      if(!inBounds) return;
      if(occupied) {
        const child=node.children.get(occupied.letter.charCodeAt(0)-65);
        if(child!==undefined) walk(row+dr,col+dc,child,touchedAnchor);
        return;
      }
      if(placed.length===letters.length) return;
      let mask=node.mask & checks[direction][row][col];
      while(mask) {
        const bit=mask & -mask; const letterIndex=31-Math.clz32(bit); mask^=bit;
        const child=node.children.get(letterIndex)!;
        const letter=String.fromCharCode(65+letterIndex);
        for(const isBlank of [false,true]) {
          const rackIndex=isBlank?26:letterIndex;
          if(!counts[rackIndex]) continue;
          counts[rackIndex]--;
          placed.push({row,col,letter,isBlank,points:isBlank?0:config.tileValues[letter]});
          walk(row+dr,col+dc,child,touchedAnchor||anchorKeys.has(`${row},${col}`));
          placed.pop();counts[rackIndex]++;
        }
      }
    }
    for(const start of starts.values()) walk(start.row,start.col,0,false);
  }
  const sorted=[...moves.values()].sort((a,b)=>b.totalScore-a.totalScore || (a.mainWord<b.mainWord?-1:a.mainWord>b.mainWord?1:0) || a.id.localeCompare(b.id));
  stats.legalMoves=sorted.length;stats.durationMs=performance.now()-startTime;
  return {moves:sorted,stats};
}
