import { it,expect } from 'vitest';
import { emptyBoard,applyPlacements } from '../../src/lib/crossplay/board';
import { CROSSPLAY_CONFIG } from '../../src/lib/crossplay/config';
import { buildLexicon,normalizeWords } from '../../src/lib/crossplay/dictionary';
import { generateMoves } from '../../src/lib/crossplay/generator';
import { validateProposedMove } from '../../src/lib/crossplay/validation';
import { bruteForce } from './oracle';
import type { CrossplayGameConfig, Premium } from '../../src/lib/crossplay/types';
it('normalizes plain text, rejects punctuation and applies removals last',()=>{
  expect([...normalizeWords(' cat \r\nDOG\ncat\nX-Y\n123\n# comment').words]).toEqual(['CAT','DOG']);
  const lex=buildLexicon('CAT\nDOG','CATS\nCAT','DOG\nCATS');
  expect([...lex.words]).toEqual(['CAT']);expect(lex.info.removals).toBe(2);
});
it('agrees with a brute-force word/position oracle across randomized small games, including blanks',()=>{
  let seed=912341;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  const words:string[]=[];
  for(let length=2;length<=5;length++)for(let i=0;i<3**length;i++){
    let n=i,word='';for(let j=0;j<length;j++){word+='ABC'[n%3];n=Math.floor(n/3);}
    if(random()<.6)words.push(word);
  }
  const config:CrossplayGameConfig={...CROSSPLAY_CONFIG,size:5,center:{row:2,col:2},rackSize:3,premiums:Array.from({length:5},()=>Array.from({length:5},()=>[null,'DL','TL','DW','TW'][Math.floor(random()*5)] as Premium))};
  const lex=buildLexicon(words.join('\n'));
  for(let game=0;game<14;game++) {
    let board=emptyBoard(5);
    for(let turn=0;turn<5;turn++) {
      const rack=Array.from({length:3},()=> 'ABC?'[Math.floor(random()*4)]);
      const fast=generateMoves(board,rack,lex,config).moves.sort((a,b)=>a.id.localeCompare(b.id));
      const slow=bruteForce(board,rack,lex,config);
      expect(fast,`game ${game} turn ${turn}, rack ${rack}`).toEqual(slow);
      for(const move of fast) expect(validateProposedMove(board,rack,move.placements,lex,config).legal).toBe(true);
      if(!fast.length)break;
      board=applyPlacements(board,fast[Math.floor(random()*fast.length)].placements);
    }
  }
});
