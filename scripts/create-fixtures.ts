import { mkdir,writeFile,copyFile } from 'node:fs/promises';
import { emptyBoard } from '../src/lib/crossplay/board';
import { put,realMidgame } from '../src/lib/crossplay/fixtures';
import type { Board } from '../src/lib/crossplay/types';

const first=emptyBoard();
put(first,'RELAXED',7,5);put(first,'FEZ',6,6,'down');put(first,'LAVAS',7,7,'down');put(first,'NOTES',11,3);put(first,'NeRD',11,3,'down');
const second=first.map(row=>row.map(t=>t?{...t}:null));put(second,'VACS',9,7);put(second,'GOLD',14,0);
const third=realMidgame().board;
const fourth=third.map(row=>row.map(t=>t?{...t}:null));put(fourth,'YOW',10,0,'down');
const fixtures:[string,Board,string[],number,number][]=[['IMG_2839.png',first,[...'SHCAYOO'],80,52],['IMG_2842.png',second,[...'HOYNVOO'],93,69],['IMG_2849.jpeg',third,[...'HOIYDOW'],105,85],['IMG_2850.png',fourth,['H','O','I','','','D',''],105,85]];
await mkdir('tests/fixtures/screenshots',{recursive:true});
for(const [file,board,rack,playerScore,opponentScore] of fixtures) {
  await copyFile(`artifacts/${file}`,`tests/fixtures/screenshots/${file}`);
  await writeFile(`tests/fixtures/screenshots/${file.replace(/\.(png|jpeg)$/,'')}.expected.json`,JSON.stringify({
    source:file,verifiedBy:'Manual visual transcription, 2026-09-10',board:board.flatMap((row,r)=>row.flatMap((tile,c)=>tile?[{row:r+1,col:c+1,...tile}]:[])),rack:rack.flatMap((letter,slot)=>letter?[{slot,letter,isBlank:letter==='?'}]:[]),playerScore,opponentScore,
    note:file==='IMG_2850.png'?'Zoomed board clips columns 13–15. Visible YOW is a pending preview, not a committed move. Rack gaps are preserved.':'Committed position; board coordinates are 1-based.',
  },null,2)+'\n');
}
await mkdir('public/fixtures',{recursive:true});
await writeFile('public/fixtures/midgame.json',JSON.stringify({version:1,board:third,rack:[...'HOIYDOW'],scores:{player:105,opponent:85}},null,2)+'\n');
console.log('Wrote four manually verified screenshot fixtures and a sample position.');
