import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {recognizePixels} from '../src/lib/vision/local';
import {RECOGNITION_REVIEW_THRESHOLD} from '../src/lib/vision/types';
const templates=JSON.parse(await readFile('public/recognition/templates.json','utf8'));
for(const name of ['IMG_2839','IMG_2842','IMG_2849','IMG_2850']) {
  const expected=JSON.parse(await readFile(`tests/fixtures/screenshots/${name}.expected.json`,'utf8'));
  const {data,info}=await sharp(`tests/fixtures/screenshots/${expected.source}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const result=recognizePixels({data,width:info.width,height:info.height},templates);
  const errors=[];let letters=0,blanks=0;
  for(const tile of expected.board) {
    const actual=result.board.tiles.find(t=>t.row===tile.row&&t.col===tile.col);
    if(actual?.letter===tile.letter)letters++;else errors.push({cell:`${tile.row},${tile.col}`,expected:tile.letter,actual:actual?.letter,confidence:actual?.confidence});
    if(actual?.isBlank===tile.isBlank)blanks++;else errors.push({blank:`${tile.row},${tile.col}`,expected:tile.isBlank,actual:actual?.isBlank,confidence:actual?.blankConfidence});
  }
  const review=[...result.board.tiles.filter(t=>t.confidence<RECOGNITION_REVIEW_THRESHOLD).map(t=>`r${t.row}c${t.col}`),...result.rack.filter(t=>t.confidence<RECOGNITION_REVIEW_THRESHOLD).map(t=>`rack${t.slot+1}`)];
  console.log(name,JSON.stringify({bounds:result.board.bounds,occupancy:[result.board.tiles.length,expected.board.length],letters:[letters,expected.board.length],blanks:[blanks,expected.board.length],rack:result.rack.map(t=>[t.slot,t.letter,Math.round(t.confidence*100)]),expectedRack:expected.rack,review,timings:result.timings,errors}));
}
