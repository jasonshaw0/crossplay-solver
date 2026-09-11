import { detectBoard,detectRack } from './geometry';
import { blue,extractGlyph,sampleMask,similarity } from './pixels';
import type { GlyphTemplate, PixelImage, RecognitionResult, RecognizedTile, TemplateSet } from './types';

export function classify(glyph:number[],templates:GlyphTemplate[]) {
  const scores=new Map<string,number>();
  for(const t of templates)scores.set(t.label,Math.max(scores.get(t.label)??0,similarity(glyph,t.pixels)));
  const ranked=[...scores].sort((a,b)=>b[1]-a[1]);
  const [letter,score]=ranked[0]??['',0],gap=score-(ranked[1]?.[1]??0);
  return {letter,score,confidence:Math.min(1,score*.75+Math.min(.25,gap*2)),gap};
}
export function recognizePixels(image:PixelImage,templates:TemplateSet):RecognitionResult {
  const began=performance.now(),bounds=detectBoard(image),rackBounds=detectRack(image,bounds),geometryDone=performance.now();
  const tiles:RecognizedTile[]=[],warnings:string[]=[];
  const width=bounds.width/15,height=bounds.height/15;
  for(let row=0;row<15;row++)for(let col=0;col<15;col++) {
    const cell={x:bounds.x+col*width,y:bounds.y+row*height,width,height};
    if(cell.x+width*.5>=image.width||cell.y+height*.5>=image.height)continue;
    const {mask}=sampleMask(image,{x:cell.x+width*.13,y:cell.y+height*.13,width:width*.7,height:height*.7},blue);
    if(mask.reduce((n,v)=>n+v,0)/mask.length<.3)continue;
    tiles.push({row:row+1,col:col+1,letter:'',isBlank:false,confidence:0,blankConfidence:0,glyph:extractGlyph(image,cell),pointGlyph:extractGlyph(image,cell,'point'),bounds:cell});
  }
  const rack=rackBounds.map((bounds,index)=>({slot:Math.min(6,Math.max(0,Math.round((bounds.x+bounds.width/2)/(image.width/7)-.5))),letter:'',isBlank:false,confidence:0,glyph:extractGlyph(image,bounds),bounds,index}));
  const extractionDone=performance.now();
  for(const tile of tiles) {
    const match=classify(tile.glyph,templates.letters),point=classify(tile.pointGlyph,templates.digits);
    tile.letter=match.letter||'I';tile.confidence=match.confidence;
    tile.isBlank=point.letter==='0'&&point.score>.65;tile.blankConfidence=point.confidence;
    if(!tile.pointGlyph.length||point.confidence<.8)tile.confidence=Math.min(tile.confidence,.78);
  }
  for(const tile of rack) {
    const match=classify(tile.glyph,templates.letters);
    // Unassigned rack blanks have no central glyph; don't invent a letter.
    tile.isBlank=tile.glyph.length===0;
    tile.letter=tile.isBlank?'?':match.letter||'I';tile.confidence=tile.isBlank?.88:match.confidence;
  }
  const complete=bounds.x>=-width*.15&&bounds.x+bounds.width<=image.width+width*.15&&bounds.y>=0&&bounds.y+bounds.height<=image.height;
  if(!complete)warnings.push('The screenshot clips part of the board. Unseen squares could contain tiles; check the position before solving.');
  if(!rack.length)warnings.push('No rack was detected. Enter the rack manually or use an uncropped screenshot.');
  if(tiles.some(t=>t.confidence<.85)||rack.some(t=>t.confidence<.85))warnings.push('Review the marked letters or blank markers. Recognition confidence is a similarity estimate, not a probability.');
  // Green preview borders are visual state, not proof a move was committed.
  const preview=sampleMask(image,bounds,(r,g,b)=>g>130&&g>r*1.12&&g>b*1.4&&r>70);
  if(preview.mask.reduce((n,v)=>n+v,0)>width*height*.15)warnings.push('Green move-preview highlighting is visible. The imported position includes the shown tiles; recall the move in Crossplay first if you want the earlier position.');
  const end=performance.now();
  return {provider:'local',board:{detected:true,bounds,orientation:'upright',complete,tiles},rack:rack.map(({index,...rest})=>{void index;return rest;}),rackBounds:rackBounds.length?{x:rackBounds[0].x,y:rackBounds[0].y,width:rackBounds.at(-1)!.x+rackBounds.at(-1)!.width-rackBounds[0].x,height:rackBounds[0].height}:null,warnings,timings:{geometryMs:geometryDone-began,extractionMs:extractionDone-geometryDone,classificationMs:end-extractionDone,totalMs:end-began},imageSize:{width:image.width,height:image.height}};
}
