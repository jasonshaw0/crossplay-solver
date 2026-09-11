import { blue, components, sampleMask } from './pixels';
import type { PixelImage, Rect } from './types';
import { CROSSPLAY_CONFIG } from '../crossplay/config';
const palette=[[241,238,237],[223,231,209],[240,234,205],[230,221,232],[217,224,238]];
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const groups=(values:number[],tolerance:number)=>{
  const result:number[][]=[];
  for(const value of [...values].sort((a,b)=>a-b)) {
    const last=result.at(-1);
    if(last&&Math.abs(value-median(last))<tolerance)last.push(value);else result.push([value]);
  }
  return result;
};
export function detectBoard(image:PixelImage):Rect {
  // Work at roughly 650 pixels wide; all sizes derived from observed cells.
  const step=Math.max(1,Math.round(image.width/650)),width=Math.floor(image.width/step),height=Math.floor(image.height/step);
  const mask=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const i=(y*step*image.width+x*step)*4;
    const [r,g,b]=[image.data[i],image.data[i+1],image.data[i+2]];
    mask[y*width+x]=palette.some(([rr,gg,bb])=>Math.abs(rr-r)+Math.abs(gg-g)+Math.abs(bb-b)<30)?1:0;
  }
  const candidates=components(mask,width,height).filter(c=>c.width>width*.018&&c.width<width*.14&&c.height/c.width>.78&&c.height/c.width<1.25&&c.area/(c.width*c.height)>.48);
  if(candidates.length<25)throw new Error('Could not locate a Crossplay grid. Use a screenshot showing the board and rack.');
  let best=candidates[0],support=0;
  for(const c of candidates) {
    const count=candidates.filter(o=>Math.abs(o.width-c.width)<c.width*.12&&Math.abs(o.height-c.height)<c.height*.12).length;
    if(count>support){support=count;best=c;}
  }
  const cells=candidates.filter(c=>Math.abs(c.width-best.width)<best.width*.13&&Math.abs(c.height-best.height)<best.height*.13);
  const gaps:number[]=[];
  for(const a of cells)for(const b of cells)if(Math.abs(a.y-b.y)<best.height*.1&&b.x-a.x>best.width*.85&&b.x-a.x<best.width*1.4)gaps.push(b.x-a.x);
  if(!gaps.length)throw new Error('The board grid is too cropped to align reliably.');
  const pitch=median(gaps);
  const rowGroups=groups(cells.map(c=>c.y+c.height/2),pitch*.2).filter(g=>g.length>=3);
  // Choose the densest regular run of 15 rows, rejecting UI panels elsewhere.
  let rowCenters:number[]=[],score=0;
  for(const row of rowGroups) {
    const start=median(row);
    const run=rowGroups.filter(g=>{
      const d=(median(g)-start)/pitch;
      return d>=-.15&&d<14.2&&Math.abs(d-Math.round(d))<.16;
    });
    const weight=run.reduce((n,g)=>n+g.length,0);
    if(run.length>=12&&weight>score){score=weight;rowCenters=run.map(median);}
  }
  if(rowCenters.length<12)throw new Error('Could not align 15 board rows. Include the whole board in the screenshot.');
  const topCenter=Math.min(...rowCenters);
  const boardCells=cells.filter(c=>c.y+c.height/2>=topCenter-pitch*.2&&c.y+c.height/2<=topCenter+14.2*pitch);
  const colGroups=groups(boardCells.map(c=>c.x+c.width/2),pitch*.2).filter(g=>g.length>=3);
  const leftCenter=Math.min(...colGroups.map(median));
  const fit=(values:number[],origin:number)=>{
    const indices=values.map(v=>Math.round((v-origin)/pitch));
    const meanI=indices.reduce((n,v)=>n+v,0)/values.length,meanV=values.reduce((n,v)=>n+v,0)/values.length;
    const slope=values.reduce((n,v,i)=>n+(indices[i]-meanI)*(v-meanV),0)/indices.reduce((n,v)=>n+(v-meanI)**2,0);
    return {pitch:slope,origin:meanV-slope*meanI};
  };
  const fx=fit(colGroups.map(median),leftCenter),fy=fit(rowCenters,topCenter);
  const base={x:(fx.origin-fx.pitch/2)*step,y:(fy.origin-fy.pitch/2)*step,width:fx.pitch*15*step,height:fy.pitch*15*step};
  // A cropped edge or a connecting UI separator can hide the first row's
  // components. Align the observed pastel pattern to the known game config.
  // This is geometry calibration, never letter/dictionary inference.
  let aligned=base,bestScore=-Infinity;
  const kinds=[null,'TL','DL','TW','DW'];
  for(let rowOffset=-3;rowOffset<=1;rowOffset++)for(let colOffset=-3;colOffset<=1;colOffset++) {
    const rect={...base,x:base.x+colOffset*base.width/15,y:base.y+rowOffset*base.height/15};
    let score=0;
    for(let r=0;r<15;r++)for(let c=0;c<15;c++) {
      const xx=Math.round(rect.x+(c+.3)*rect.width/15),yy=Math.round(rect.y+(r+.3)*rect.height/15);
      if(xx<0||yy<0||xx>=image.width||yy>=image.height)continue;
      const at=(yy*image.width+xx)*4;
      const color=[image.data[at],image.data[at+1],image.data[at+2]];
      const distances=palette.map(p=>p.reduce((n,v,i)=>n+Math.abs(v-color[i]),0));
      const distance=Math.min(...distances);if(distance>42)continue;
      const kind=kinds[distances.indexOf(distance)],expected=CROSSPLAY_CONFIG.premiums[r][c];
      score+=kind===expected?(kind?4:.1):(kind||expected?-3:0);
    }
    if(score>bestScore){bestScore=score;aligned=rect;}
  }
  return aligned;
}
export function detectRack(image:PixelImage,board:Rect):Rect[] {
  const start=Math.floor(board.y+board.height+board.height/15*.15);
  if(start>=image.height)return [];
  const region={x:0,y:start,width:image.width,height:image.height-start};
  const {mask,width,height,x,y}=sampleMask(image,region,blue);
  const candidates=components(mask,width,height).filter(c=>c.width>board.width/15*.72&&c.height>board.height/15*.72&&c.width/c.height>.65&&c.width/c.height<1.45);
  if(!candidates.length)return [];
  const row=candidates.reduce((best,c)=>candidates.filter(o=>Math.abs(o.y-c.y)<c.height*.3).length>candidates.filter(o=>Math.abs(o.y-best.y)<best.height*.3).length?c:best,candidates[0]);
  return candidates.filter(c=>Math.abs(c.y-row.y)<row.height*.3).sort((a,b)=>a.x-b.x).slice(0,7).map(c=>({x:c.x+x,y:c.y+y,width:c.width,height:c.height}));
}
