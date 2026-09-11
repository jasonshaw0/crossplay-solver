import { buildLexicon,fingerprintLexicon } from '../lib/crossplay/dictionary';
import type { Lexicon } from '../lib/crossplay/dictionary';
import { generateMoves } from '../lib/crossplay/generator';
import { inspectBoard } from '../lib/crossplay/validation';
import { CROSSPLAY_CONFIG } from '../lib/crossplay/config';
import type { Board, Rack } from '../lib/crossplay/types';
export type SolverRequest=
  |{type:'init';additions:string;removals:string;customText?:string;customName?:string}
  |{type:'solve';id:number;board:Board;rack:Rack};
let lexicon:Lexicon|null=null;
let sources:Promise<string[]>|null=null;
self.onmessage=async(event:MessageEvent<SolverRequest>)=>{
  const request=event.data;
  try {
    if(request.type==='init') {
      const basePath=process.env.NEXT_PUBLIC_BASE_PATH??'';
      sources??=Promise.all(['words.txt','additions.txt','removals.txt'].map(async file=>{
        const response=await fetch(`${basePath}/dictionary/${file}`,{cache:'no-cache'});
        if(!response.ok)throw new Error('Dictionary unavailable. Solver cannot run until a dictionary is loaded.');
        return response.text();
      }));
      const [words,additions,removals]=request.customText?[request.customText,'','']:await sources;
      lexicon=buildLexicon(words,additions+'\n'+request.additions,removals+'\n'+request.removals,request.customName||'ENABLE 2K');
      await fingerprintLexicon(lexicon);
      self.postMessage({type:'ready',info:lexicon.info,nodes:lexicon.nodes.length});
      return;
    }
    if(!lexicon)throw new Error('Dictionary is still loading.');
    const issues=inspectBoard(request.board,request.rack,lexicon,CROSSPLAY_CONFIG);
    if(issues.some(issue=>issue.severity==='error')) {self.postMessage({type:'invalid',id:request.id,issues});return;}
    const result=generateMoves(request.board,request.rack,lexicon,CROSSPLAY_CONFIG);
    self.postMessage({type:'solved',id:request.id,...result,issues});
  }catch(error){if(request.type==='init')sources=null;self.postMessage({type:'error',id:request.type==='solve'?request.id:undefined,error:error instanceof Error?error.message:'Solver failed.'});}
};
