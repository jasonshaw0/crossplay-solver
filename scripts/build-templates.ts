import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {detectBoard,detectRack} from '../src/lib/vision/geometry';
import {extractGlyph,GLYPH_SIZE} from '../src/lib/vision/pixels';
import {CROSSPLAY_CONFIG} from '../src/lib/crossplay/config';
import type {TemplateSet,PixelImage} from '../src/lib/vision/types';

const templates:TemplateSet={version:1,letters:[],digits:[]};
await mkdir('public/recognition',{recursive:true});await mkdir('artifacts/crops',{recursive:true});
// Use only IMG_2839 + IMG_2849 for exemplars; IMG_2842/2850 remain holdout screenshots.
for(const name of ['IMG_2839','IMG_2849']) {
  const expected=JSON.parse(await readFile(`tests/fixtures/screenshots/${name}.expected.json`,'utf8'));
  const {data,info}=await sharp(`tests/fixtures/screenshots/${expected.source}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const image:PixelImage={width:info.width,height:info.height,data};
  const board=detectBoard(image),rack=detectRack(image,board);console.log(name,{board,rack});
  for(const tile of expected.board) {
    const bounds={x:board.x+(tile.col-1)*board.width/15,y:board.y+(tile.row-1)*board.height/15,width:board.width/15,height:board.height/15};
    const pixels=extractGlyph(image,bounds);
    if(pixels.length)templates.letters.push({label:tile.letter,pixels,source:`${name}:r${tile.row}c${tile.col}`});
    const points=extractGlyph(image,bounds,'point');
    const value=tile.isBlank?0:CROSSPLAY_CONFIG.tileValues[tile.letter];
    if(points.length)templates.digits.push({label:String(value),pixels:points,source:`${name}:r${tile.row}c${tile.col}`});
  }
  for(const tile of expected.rack) {
    const rect=rack[tile.slot];if(!rect)continue;
    const pixels=extractGlyph(image,rect);
    if(pixels.length)templates.letters.push({label:tile.letter,pixels,source:`${name}:rack${tile.slot}`});
  }
}
// Local system-font exemplars cover letters absent from supplied game screenshots.
// They are explicitly lower-evidence templates, expanded by optional corrections.
for(const font of ['Arial','Arial Narrow','Helvetica','Verdana'])for(const label of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  const svg=`<svg width="120" height="140"><rect width="120" height="140" fill="#4076c6"/><text x="8" y="120" fill="white" font-family="${font}" font-weight="bold" font-size="88">${label}</text></svg>`;
  const {data,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const pixels=extractGlyph({data,width:info.width,height:info.height},{x:0,y:0,width:120,height:140});
  if(pixels.length)templates.letters.push({label,pixels,source:`system-font:${font}`});
}
await writeFile('public/recognition/templates.json',JSON.stringify(templates));
for(const t of templates.letters.filter(t=>!t.source.startsWith('system-font')).slice(0,60)) {
  await sharp(Buffer.from(t.pixels.map(v=>Math.round(v*255))),{raw:{width:GLYPH_SIZE,height:GLYPH_SIZE,channels:1}}).resize(144,144,{kernel:'nearest'}).png().toFile(`artifacts/crops/${t.source.replace(/[:]/g,'-')}-${t.label}.png`);
}
console.log(`Saved ${templates.letters.length} glyph and ${templates.digits.length} point templates.`);
