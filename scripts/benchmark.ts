import {readFile} from 'node:fs/promises';
import {buildLexicon} from '../src/lib/crossplay/dictionary';
import {generateMoves} from '../src/lib/crossplay/generator';
import {CROSSPLAY_CONFIG} from '../src/lib/crossplay/config';
import {realMidgame} from '../src/lib/crossplay/fixtures';
const start=performance.now();
const lex=buildLexicon(await readFile('public/dictionary/words.txt','utf8'));
console.log({words:lex.words.size,trieNodes:lex.nodes.length,initializationMs:performance.now()-start});
for(const rack of [[...'HOIYDOW'],[...'AEIRST?'],[...'AEIRS??']]){
  const times=[];let result;
  for(let i=0;i<6;i++){result=generateMoves(realMidgame().board,rack,lex,CROSSPLAY_CONFIG);if(i)times.push(result.stats.durationMs);}
  console.log({rack:rack.join(''),moves:result!.moves.length,top:result!.moves[0],medianMs:times.sort((a,b)=>a-b)[2],times});
}
