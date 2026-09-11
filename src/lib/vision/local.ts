import { detectBoard,detectRack } from './geometry';
import { blue,extractGlyph,sampleMask,similarity } from './pixels';
import { RECOGNITION_REVIEW_THRESHOLD,type GlyphTemplate,type PixelImage,type RecognitionResult,type RecognizedTile,type TemplateSet } from './types';
import { CROSSPLAY_CONFIG } from '../crossplay/config';

function rank(glyph:number[],templates:GlyphTemplate[]) {
  const scores=new Map<string,number>();
  for(const t of templates)scores.set(t.label,Math.max(scores.get(t.label)??0,similarity(glyph,t.pixels)));
  return [...scores].sort((a,b)=>b[1]-a[1]);
}
export function classify(glyph:number[],templates:GlyphTemplate[]) {
  const ranked=rank(glyph,templates);
  const [letter,score]=ranked[0]??['',0],gap=score-(ranked[1]?.[1]??0);
  return {letter,score,confidence:Math.min(1,score*.75+Math.min(.25,gap*2)),gap};
}
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
// Calibrated evidence score: absolute fit and separation both matter. This is
// intentionally not presented as a statistical probability.
const evidenceReliability=(score:number,gap:number)=>.45*clamp((score-.58)/.3)+.55*clamp(gap/.12);
function classifyBoardGlyph(glyph:number[],pointGlyph:number[],templates:TemplateSet) {
  const letters=rank(glyph,templates.letters),points=rank(pointGlyph,templates.digits);
  const global=letters[0]??['I',0] as [string,number],globalGap=global[1]-(letters[1]?.[1]??0);
  const point=points[0]??['',0] as [string,number],pointGap=point[1]-(points[1]?.[1]??0),pointReliability=evidenceReliability(point[1],pointGap);
  const compatible=letters.filter(([letter])=>String(CROSSPLAY_CONFIG.tileValues[letter])===point[0]);
  const guided=compatible[0],guidedGap=(guided?.[1]??0)-(compatible[1]?.[1]??0);
  // A tiny digit may break a near-tie, but cannot overrule a clear letter.
  // Rare 8/10-point tiles get one additional path when the glyph is degraded.
  const closeAmbiguity=globalGap<.025&&guided&&guided[1]>=global[1]-.04;
  const degradedRareValue=global[1]<.8&&['8','10'].includes(point[0])&&guided&&guided[1]>=global[1]-.18;
  const usePointValue=pointReliability>=.78&&(closeAmbiguity||degradedRareValue);
  const chosen=usePointValue?guided!:global,letterGap=usePointValue?guidedGap:globalGap;
  let confidence=Math.min(1,chosen[1]*.75+Math.min(.25,letterGap*2));
  if(usePointValue) {
    const quality=clamp((chosen[1]-.55)/.4),separation=clamp(letterGap/.08);
    confidence=.45*quality+.25*separation+.3*pointReliability;
  } else if(point[0]===String(CROSSPLAY_CONFIG.tileValues[chosen[0]])&&pointReliability>=.6) {
    confidence+=(1-confidence)*.3*pointReliability;
  }
  // False blanks change scoring, so zero needs both a strong match and margin.
  const isBlank=point[0]==='0'&&point[1]>=.7&&pointGap>=.05;
  const blankConfidence=Math.min(1,point[1]*.75+Math.min(.25,pointGap*2));
  if(isBlank)confidence=Math.min(confidence,blankConfidence);
  else if(point[0]==='0'&&point[1]>=.58&&pointReliability>=.55)confidence=Math.min(confidence,.74);
  return {letter:chosen[0],confidence,isBlank,blankConfidence};
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
    const match=classifyBoardGlyph(tile.glyph,tile.pointGlyph,templates);
    tile.letter=match.letter;tile.confidence=match.confidence;tile.isBlank=match.isBlank;tile.blankConfidence=match.blankConfidence;
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
  const reviewCount=tiles.filter(t=>t.confidence<RECOGNITION_REVIEW_THRESHOLD).length+rack.filter(t=>t.confidence<RECOGNITION_REVIEW_THRESHOLD).length;
  if(reviewCount)warnings.push(`Review ${reviewCount} marked reading${reviewCount===1?'':'s'}. Confidence combines glyph shape, ambiguity, and point-value agreement; it is not a probability.`);
  // Green preview borders are visual state, not proof a move was committed.
  const preview=sampleMask(image,bounds,(r,g,b)=>g>130&&g>r*1.12&&g>b*1.4&&r>70);
  if(preview.mask.reduce((n,v)=>n+v,0)>width*height*.15)warnings.push('Green move-preview highlighting is visible. The imported position includes the shown tiles; recall the move in Crossplay first if you want the earlier position.');
  const end=performance.now();
  return {provider:'local',board:{detected:true,bounds,orientation:'upright',complete,tiles},rack:rack.map(({index,...rest})=>{void index;return rest;}),rackBounds:rackBounds.length?{x:rackBounds[0].x,y:rackBounds[0].y,width:rackBounds.at(-1)!.x+rackBounds.at(-1)!.width-rackBounds[0].x,height:rackBounds[0].height}:null,warnings,timings:{geometryMs:geometryDone-began,extractionMs:extractionDone-geometryDone,classificationMs:end-extractionDone,totalMs:end-began},imageSize:{width:image.width,height:image.height}};
}
