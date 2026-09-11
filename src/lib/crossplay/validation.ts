import { applyPlacements, cellKey, collectWord, delta, inside, occupiedCount, perpendicular, physicalPoints } from './board';
import { scoreWords } from './scoring';
import type { Lexicon } from './dictionary';
import type { Board, BoardIssue, Cell, CrossplayGameConfig, Direction, Placement, Rack, ValidationResult } from './types';

export function placementKey(placements: Placement[]) {
  return [...placements].sort((a,b)=>a.row-b.row || a.col-b.col).map(p=>`${p.row},${p.col}:${p.letter}${p.isBlank?'?':''}`).join('|');
}

/** Independent of anchors, cross-checks and trie traversal. Reconstructs all words. */
export function validateProposedMove(board:Board, rack:Rack, placements:Placement[], lexicon:Pick<Lexicon,'words'>, config:CrossplayGameConfig): ValidationResult {
  const reasons:string[] = [];
  if (!placements.length) return {legal:false, reasons:['Place at least one new tile.']};
  if (board.length !== config.size || board.some(row=>row.length!==config.size)) return {legal:false,reasons:['Board dimensions do not match the game configuration.']};
  const used = new Set<string>();
  const available = new Map<string,number>();
  for (const tile of rack) if (tile) available.set(tile,(available.get(tile)??0)+1);
  for (const p of placements) {
    if (!inside(p.row,p.col,config.size)) { reasons.push('A tile is outside the board.'); continue; }
    if (!/^[A-Z]$/.test(p.letter) || typeof p.isBlank !== 'boolean') { reasons.push('Tiles must represent a letter A–Z and record physical blank status.'); continue; }
    if (board[p.row][p.col]) reasons.push(`The square at r${p.row+1}c${p.col+1} is already occupied.`);
    if (used.has(cellKey(p))) reasons.push('Two tiles occupy the same square.');
    used.add(cellKey(p));
    const symbol = p.isBlank ? '?' : p.letter;
    if (!(available.get(symbol)??0)) reasons.push(`You do not have ${symbol==='?'?'a blank':`a ${symbol}`} in your rack.`);
    else available.set(symbol,available.get(symbol)!-1);
  }
  if (placements.length>config.rackSize) reasons.push(`Use at most ${config.rackSize} rack tiles.`);
  const sameRow = placements.every(p=>p.row===placements[0].row);
  const sameCol = placements.every(p=>p.col===placements[0].col);
  if (!sameRow && !sameCol) reasons.push('All new tiles must be in one row or one column.');
  if (reasons.length) return {legal:false,reasons};
  const after = applyPlacements(board, placements);
  let direction:Direction = sameRow ? 'across' : 'down';
  // One-tile plays are one physical move, independent of traversal orientation.
  if (placements.length===1 && collectWord(after,placements[0],'across').length<2) direction='down';
  const main = collectWord(after,placements[0],direction);
  const mainKeys = new Set(main.map(cellKey));
  if (placements.some(p=>!mainKeys.has(cellKey(p)))) reasons.push('The move contains an empty gap.');
  const opening = occupiedCount(board)===0;
  if (opening && !used.has(cellKey(config.center))) reasons.push('The opening move must cover the center square.');
  if (!opening && !placements.some(p=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>inside(p.row+dr,p.col+dc,config.size)&&board[p.row+dr][p.col+dc]))) {
    reasons.push('The move does not connect to an existing tile.');
  }
  const words: {coordinates:Cell[];direction:Direction}[] = [];
  if (main.length>1) words.push({coordinates:main,direction});
  const crossDirection = perpendicular(direction);
  for (const p of placements) {
    const cross = collectWord(after,p,crossDirection);
    if (cross.length>1) words.push({coordinates:cross,direction:crossDirection});
  }
  if (!words.length) reasons.push('The play must form a word of at least two letters.');
  for (const word of words) {
    const text = word.coordinates.map(p=>after[p.row][p.col]!.letter).join('');
    if (!lexicon.words.has(text)) reasons.push(`${text} is not in the dictionary. The full contiguous word formed is ${text}.`);
  }
  if (reasons.length) return {legal:false,reasons};
  const canonical = [...placements].sort((a,b)=>a.row-b.row||a.col-b.col).map(p=>({...p,points:physicalPoints(p,config)}));
  const scoreBreakdown = scoreWords(after,words,canonical,config);
  const first = scoreBreakdown.words[0];
  return {legal:true,reasons:[],move:{
    id:placementKey(canonical), mainWord:first.word, direction:first.direction,
    startRow:first.coordinates[0].row,startCol:first.coordinates[0].col,placements:canonical,
    formedWords:scoreBreakdown.words,totalScore:scoreBreakdown.total,scoreBreakdown,
  }};
}

export function inspectBoard(board:Board, rack:Rack, lexicon:Pick<Lexicon,'words'>|null, config:CrossplayGameConfig):BoardIssue[] {
  const issues:BoardIssue[]=[];
  if (board.length!==config.size || board.some(row=>row.length!==config.size)) return [{message:'Board must be 15 × 15.',cells:[],severity:'error'}];
  const occupied:Cell[]=[];
  const physical = new Map<string, Cell[]>();
  board.forEach((row,r)=>row.forEach((tile,c)=>{
    if (!tile) return;
    const cell={row:r,col:c}; occupied.push(cell);
    if (!/^[A-Z]$/.test(tile.letter) || typeof tile.isBlank!=='boolean') issues.push({message:'Invalid tile.',cells:[cell],severity:'error'});
    const key=tile.isBlank?'?':tile.letter;
    physical.set(key,[...(physical.get(key)??[]),cell]);
    if (lexicon) for (const direction of ['across','down'] as const) {
      const [dr,dc]=delta(direction);
      if (inside(r-dr,c-dc,config.size)&&board[r-dr][c-dc]) continue;
      const cells=collectWord(board,cell,direction);
      if (cells.length>1) {
        const word=cells.map(p=>board[p.row][p.col]!.letter).join('');
        if (!lexicon.words.has(word)) issues.push({message:`Existing word ${word} is absent from the loaded dictionary. Check the tiles or add a dictionary override.`,cells,severity:'warning'});
      }
    }
  }));
  if (occupied.length) {
    const seen=new Set<string>(); const queue=[occupied[0]];
    while (queue.length) {
      const p=queue.pop()!; if(seen.has(cellKey(p))) continue; seen.add(cellKey(p));
      for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) if(inside(p.row+dr,p.col+dc,config.size)&&board[p.row+dr][p.col+dc]) queue.push({row:p.row+dr,col:p.col+dc});
    }
    const disconnected=occupied.filter(p=>!seen.has(cellKey(p)));
    if (disconnected.length) issues.push({message:'Board tiles form disconnected groups. Check the highlighted cells.',cells:disconnected,severity:'error'});
    if (!board[config.center.row][config.center.col]) issues.push({message:'The center is empty on a non-empty board. Check the board alignment.',cells:[config.center],severity:'error'});
  }
  if (occupied.length+rack.filter(Boolean).length>100) issues.push({message:'More than 100 physical tiles are present.',cells:occupied,severity:'error'});
  for (const [letter,cells] of physical) if(cells.length+rack.filter(t=>t===letter).length>(config.tileCounts[letter]??100)) {
    issues.push({message:`Check ${letter==='?'?'blank':letter} tile counts (bag distribution is provisional).`,cells,severity:'warning'});
  }
  return issues;
}
