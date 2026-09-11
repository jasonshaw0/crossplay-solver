import { describe,it,expect } from 'vitest';
import { CROSSPLAY_CONFIG as config, PREMIUM_SQUARES } from '../../src/lib/crossplay/config';
import { emptyBoard, applyPlacements } from '../../src/lib/crossplay/board';
import { buildLexicon } from '../../src/lib/crossplay/dictionary';
import { validateProposedMove } from '../../src/lib/crossplay/validation';
import { generateMoves } from '../../src/lib/crossplay/generator';
import { put,placementsFor,realMidgame } from '../../src/lib/crossplay/fixtures';
const lexicon=buildLexicon('RELAX\nRELAXED\nYOW\nWOVEN\nOVEN\nSCHOOL\nAVAS\nYE\nABCDEFG\nCAT\nAT\nZA');
describe('real Crossplay scores, screenshot coordinates',()=>{
  it('RELAX r8c6 across = 22; R and X double, center ordinary',()=>{
    const result=validateProposedMove(emptyBoard(),[...'RELAX'],placementsFor('RELAX',7,5),lexicon,config);
    expect(result.legal).toBe(true);expect(result.move?.totalScore).toBe(22);
  });
  it('RELAXED = 32, old R/X premiums never reactivate',()=>{
    const board=put(emptyBoard(),'RELAX',7,5);
    const result=validateProposedMove(board,[...'ED'],placementsFor('ED',7,10),lexicon,config);
    expect(result.move?.totalScore).toBe(32);
    expect(result.move?.scoreBreakdown.words[0].subtotal).toBe(16);
  });
  it('YOW r11c1 down + WOVEN, zero-value E = 43 (IMG_2850)',()=>{
    const {board,rack}=realMidgame();
    const result=validateProposedMove(board,rack,placementsFor('YOW',10,0,'down'),lexicon,config);
    expect(result.legal).toBe(true); expect(result.move?.totalScore).toBe(43);
    expect(result.move?.formedWords.map(w=>[w.word,w.score])).toEqual([['YOW',30],['WOVEN',13]]);
    expect(generateMoves(board,rack,lexicon,config).moves.some(m=>m.id===result.move?.id)).toBe(true);
  });
  it('rejects EY even when main word is valid',()=>{
    const board=put(emptyBoard(),'E',6,7);
    const result=validateProposedMove(board,[...'YE'],placementsFor('YE',7,7),lexicon,config);
    expect(result.legal).toBe(false);expect(result.reasons.join()).toContain('EY is not in the dictionary');
  });
  it('does not stop at SCHOOL when AVAS continues below it',()=>{
    const board=put(emptyBoard(),'AVAS',8,7,'down');
    const result=validateProposedMove(board,[...'SCHOOL'],placementsFor('SCHOOL',2,7,'down'),lexicon,config);
    expect(result.legal).toBe(false);expect(result.reasons.join()).toContain('SCHOOLAVAS');
    expect(generateMoves(board,[...'SCHOOL'],lexicon,config).moves.some(m=>m.startRow===2&&m.startCol===7&&m.mainWord==='SCHOOL')).toBe(false);
  });
  it('adds exactly 40 after word multipliers',()=>{
    const result=validateProposedMove(emptyBoard(),[...'ABCDEFG'],placementsFor('ABCDEFG',7,7),lexicon,config).move!;
    expect(result.scoreBreakdown.bonus).toBe(40);
    expect(result.totalScore).toBe(result.formedWords[0].score+40);
  });
  it('rack blanks and existing blanks always contribute zero',()=>{
    const before=emptyBoard();
    const opening=validateProposedMove(before,['C','?','T'],placementsFor('CaT',7,6),lexicon,config).move!;
    const after=applyPlacements(before,opening.placements);
    expect(after[7][7]?.isBlank).toBe(true);
    expect(opening.formedWords[0].tiles[1].basePoints).toBe(0);
    expect(opening.placements[1].points).toBe(0);
  });
  it('tile values and geometry are centralized and symmetric',()=>{
    expect(Object.values(config.tileValues)).toEqual([1,4,3,2,1,4,4,3,1,10,6,2,3,1,1,3,10,1,1,1,2,6,5,8,4,10,0]);
    expect(config.premiums[7][7]).toBe(null);
    const cells=Object.values(PREMIUM_SQUARES).flat().map(p=>p.join(','));
    expect(new Set(cells).size).toBe(cells.length);
    for(let r=0;r<15;r++)for(let c=0;c<15;c++)expect(config.premiums[r][c]).toBe(config.premiums[14-r][14-c]);
  });
});
