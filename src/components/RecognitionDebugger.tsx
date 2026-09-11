'use client';
import {useEffect,useRef,useState} from 'react';
import {RECOGNITION_REVIEW_THRESHOLD,type RecognitionResult,type RecognizedTile} from '../lib/vision/types';
export interface CorrectionSample {label:string;pixels:number[];source:string;predicted:string;confidence:number;createdAt:string}
export function RecognitionDebugger({result,imageUrl,onLabel}:{result:RecognitionResult;imageUrl:string;onLabel:(tile:RecognizedTile,label:string)=>void}) {
  const canvasRef=useRef<HTMLCanvasElement>(null),[label,setLabel]=useState('A'),[selected,setSelected]=useState<RecognizedTile|null>(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const context=canvas.getContext('2d');if(!context)return;
    const image=new Image();image.onload=()=>{
      const b=result.board.bounds;canvas.width=750;canvas.height=750;
      const scale=image.naturalWidth/result.imageSize.width;
      context.drawImage(image,b.x*scale,b.y*scale,b.width*scale,b.height*scale,0,0,750,750);
      context.strokeStyle='#ca4930';context.lineWidth=1;
      for(let i=0;i<=15;i++){context.beginPath();context.moveTo(i*50,0);context.lineTo(i*50,750);context.stroke();context.beginPath();context.moveTo(0,i*50);context.lineTo(750,i*50);context.stroke();}
      for(const tile of result.board.tiles){context.strokeStyle=tile.confidence<RECOGNITION_REVIEW_THRESHOLD?'#f5bc36':'#52edc4';context.lineWidth=3;context.strokeRect((tile.col-1)*50+3,(tile.row-1)*50+3,44,44);}
    };image.src=imageUrl;
  },[result,imageUrl]);
  return <details className="debug-panel"><summary>Local recognition debugger</summary><p>Board bounds: {Object.entries(result.board.bounds).map(([k,v])=>`${k} ${Math.round(v)}`).join(' · ')}</p><p>Geometry {result.timings.geometryMs.toFixed(1)} ms · extraction {result.timings.extractionMs.toFixed(1)} ms · classification {result.timings.classificationMs.toFixed(1)} ms</p>
    <canvas ref={canvasRef} aria-label="Normalized board, grid, and occupancy overlay" style={{width:'100%',maxWidth:500}}/>
    <p>Choose a crop to label it for a local training export.</p><div className="debug-glyphs">{result.board.tiles.map(tile=><button key={`${tile.row},${tile.col}`} onClick={()=>{setSelected(tile);setLabel(tile.letter);}} title={`r${tile.row}c${tile.col}: ${Math.round(tile.confidence*100)}%`}><Glyph pixels={tile.glyph}/><span>{tile.letter} {Math.round(tile.confidence*100)}%</span></button>)}</div>
    {selected&&<div className="label-editor"><label>Correct label <input value={label} maxLength={1} onChange={e=>setLabel(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))}/></label><button className="button" disabled={!label} onClick={()=>onLabel(selected,label)}>Save local sample</button></div>}
    <p>Rack crops</p><div className="debug-glyphs">{result.rack.map(tile=><span key={tile.slot}><Glyph pixels={tile.glyph}/>{tile.slot+1}: {tile.letter} ({Math.round(tile.confidence*100)}%)</span>)}</div>
  </details>;
}
function Glyph({pixels}:{pixels:number[]}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const ctx=ref.current?.getContext('2d');if(!ctx||pixels.length!==576)return;const image=ctx.createImageData(24,24);pixels.forEach((v,i)=>{image.data[i*4]=image.data[i*4+1]=image.data[i*4+2]=v*255;image.data[i*4+3]=255;});ctx.putImageData(image,0,0);},[pixels]);
  return <canvas ref={ref} width={24} height={24} style={{width:40,height:40,imageRendering:'pixelated'}}/>;
}
