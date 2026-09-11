import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import sharp from 'sharp';
import {beforeAll,it,expect} from 'vitest';
import {recognizePixels} from '../../src/lib/vision/local';
import {recognitionSchema} from '../../src/lib/vision/schema';
import {RECOGNITION_REVIEW_THRESHOLD,type TemplateSet} from '../../src/lib/vision/types';
let templates:TemplateSet;
beforeAll(async()=>{templates=JSON.parse(await readFile('public/recognition/templates.json','utf8'));});
for(const name of ['IMG_2839','IMG_2842','IMG_2849','IMG_2850'])for(const variant of ['original','scaled-jpeg','compact-jpeg','degraded-jpeg']){
  const expected=JSON.parse(await readFile(`tests/fixtures/screenshots/${name}.expected.json`,'utf8'));
  const fixturePath=`tests/fixtures/screenshots/${expected.source}`;
  const run=existsSync(fixturePath)?it:it.skip;
  run(`${name}, ${variant}: occupancy, letters, rack, and physical blanks`,async()=>{
  let input=await readFile(fixturePath);
  if(variant==='scaled-jpeg')input=await sharp(input).resize({width:1000}).jpeg({quality:82}).toBuffer();
  if(variant==='compact-jpeg')input=await sharp(input).resize({width:700}).jpeg({quality:60}).toBuffer();
  if(variant==='degraded-jpeg')input=await sharp(input).resize({width:600}).jpeg({quality:50}).toBuffer();
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const result=recognizePixels({data,width:info.width,height:info.height},templates);
  expect(recognitionSchema.safeParse(result).success).toBe(true);
  expect(result.board.tiles.map(({row,col})=>({row,col}))).toEqual(expected.board.map(({row,col}:{row:number;col:number})=>({row,col})));
  expect(result.board.tiles.map(({row,col,letter,isBlank})=>({row,col,letter,isBlank}))).toEqual(expected.board);
  expect(result.rack.map(({slot,letter,isBlank})=>({slot,letter,isBlank}))).toEqual(expected.rack);
  if(variant==='original')expect([...result.board.tiles,...result.rack].every(tile=>tile.confidence>=RECOGNITION_REVIEW_THRESHOLD)).toBe(true);
  });
}
