'use client';
import {useRef} from 'react';
import {CROSSPLAY_CONFIG} from '../lib/crossplay/config';
export function Rack({rack,onChange,uncertain}:{rack:string[];onChange:(slot:number,letter:string)=>void;uncertain:Record<string,boolean>}) {
  const refs=useRef<(HTMLInputElement|null)[]>([]);
  return <div className="rack" role="group" aria-label="Your seven rack slots">{rack.map((letter,slot)=><div key={slot} className={`rack-tile ${letter?'filled':''} ${uncertain[`rack:${slot}`]?'uncertain':''}`}>
    <input ref={node=>{refs.current[slot]=node;}} aria-label={`Rack slot ${slot+1}`} data-testid={`rack-${slot}`} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={letter} maxLength={1}
      onFocus={event=>event.target.select()} onChange={event=>{const text=event.target.value.toUpperCase().replace(/[^A-Z?]/g,'').slice(-1);onChange(slot,text);if(text)refs.current[Math.min(6,slot+1)]?.focus({preventScroll:true});}}
      onKeyDown={event=>{if(event.key==='Backspace'&&!letter){event.preventDefault();onChange(Math.max(0,slot-1),'');refs.current[Math.max(0,slot-1)]?.focus();}if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();refs.current[Math.max(0,Math.min(6,slot+(event.key==='ArrowLeft'?-1:1)))]?.focus();}}}/>
    {letter&&<small aria-hidden="true">{letter==='?'?'○':CROSSPLAY_CONFIG.tileValues[letter]}</small>}{!letter&&<span aria-hidden="true">{slot+1}</span>}
    {uncertain[`rack:${slot}`]&&<em title="Review this reading">!</em>}
  </div>)}</div>;
}
