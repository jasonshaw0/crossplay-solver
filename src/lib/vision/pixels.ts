import type { PixelImage, Rect } from './types';
export const blue = (r:number,g:number,b:number) => b>85 && b>r+38 && b>g+20 && r<140;
export const white = (r:number,g:number,b:number) => r>182 && g>182 && b>182 && Math.max(r,g,b)-Math.min(r,g,b)<48;

export interface Component extends Rect { area:number }
/** Binary 4-connected components. Iterative flood fill, bounded to image area. */
export function components(mask:Uint8Array,width:number,height:number):Component[] {
  const seen=new Uint8Array(mask.length),queue=new Int32Array(mask.length),result:Component[]=[];
  for(let origin=0;origin<mask.length;origin++) {
    if(!mask[origin]||seen[origin])continue;
    let head=0,tail=1;queue[0]=origin;seen[origin]=1;
    let left=width,top=height,right=0,bottom=0;
    while(head<tail) {
      const index=queue[head++],x=index%width,y=Math.floor(index/width);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      const neighbors=[x?index-1:-1,x<width-1?index+1:-1,y?index-width:-1,y<height-1?index+width:-1];
      for(const next of neighbors)if(next>=0&&mask[next]&&!seen[next]){seen[next]=1;queue[tail++]=next;}
    }
    result.push({x:left,y:top,width:right-left+1,height:bottom-top+1,area:tail});
  }
  return result;
}
export function sampleMask(image:PixelImage,bounds:Rect,predicate:(r:number,g:number,b:number)=>boolean) {
  const x=Math.max(0,Math.floor(bounds.x)),y=Math.max(0,Math.floor(bounds.y));
  const width=Math.max(0,Math.min(image.width-x,Math.ceil(bounds.width)));
  const height=Math.max(0,Math.min(image.height-y,Math.ceil(bounds.height)));
  const mask=new Uint8Array(width*height);
  for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++) {
    const at=((yy+y)*image.width+xx+x)*4;
    mask[yy*width+xx]=predicate(image.data[at],image.data[at+1],image.data[at+2])?1:0;
  }
  return {mask,width,height,x,y};
}

export const GLYPH_SIZE=24;
/** Tight central connected glyph, normalized by area sampling to 24×24.
 * Largest component excludes small corner numbers and highlight borders. */
export function extractGlyph(image:PixelImage,bounds:Rect,kind:'letter'|'point'='letter'):number[] {
  const region=kind==='letter'
    ? {x:bounds.x+bounds.width*.055,y:bounds.y+bounds.height*.27,width:bounds.width*.79,height:bounds.height*.66}
    : {x:bounds.x+bounds.width*.53,y:bounds.y+bounds.height*.025,width:bounds.width*.44,height:bounds.height*.32};
  const {mask,width,height}=sampleMask(image,region,white);
  if(!width||!height)return [];
  const candidates=components(mask,width,height).filter(c=>c.area>=3&&c.width<width*.98&&c.height<height*.99).sort((a,b)=>b.area-a.area);
  let best=candidates[0];if(!best)return [];
  if(kind==='point') {
    const digits=candidates.filter(c=>c.height>=best.height*.65&&c.area>=best.area*.15);
    const x=Math.min(...digits.map(c=>c.x)),y=Math.min(...digits.map(c=>c.y));
    best={x,y,width:Math.max(...digits.map(c=>c.x+c.width))-x,height:Math.max(...digits.map(c=>c.y+c.height))-y,area:best.area};
  }
  const result:number[]=[];
  // Keep a one-pixel margin and aspect ratio to distinguish I, L, O, Q.
  const scale=(GLYPH_SIZE-2)/Math.max(best.width,best.height);
  const offsetX=(GLYPH_SIZE-best.width*scale)/2,offsetY=(GLYPH_SIZE-best.height*scale)/2;
  for(let y=0;y<GLYPH_SIZE;y++)for(let x=0;x<GLYPH_SIZE;x++) {
    let sum=0;
    for(const dy of [.25,.75])for(const dx of [.25,.75]) {
      const sx=Math.floor((x+dx-offsetX)/scale+best.x),sy=Math.floor((y+dy-offsetY)/scale+best.y);
      if(sx>=best.x&&sx<best.x+best.width&&sy>=best.y&&sy<best.y+best.height)sum+=mask[sy*width+sx];
    }
    result.push(sum/4);
  }
  return result;
}
export function similarity(a:number[],b:number[]):number {
  if(!a.length||a.length!==b.length)return 0;
  let intersection=0,aa=0,bb=0;
  for(let i=0;i<a.length;i++){intersection+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];}
  return intersection/Math.sqrt(aa*bb||1);
}
