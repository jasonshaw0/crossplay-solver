'use client';
import {useEffect,useRef} from 'react';
import type {Board as BoardState,Cell,Direction,Move,Tile} from '../lib/crossplay/types';
import {CROSSPLAY_CONFIG as config} from '../lib/crossplay/config';
import {cellKey} from '../lib/crossplay/board';
interface Props {
  board:BoardState;selected:Cell;direction:Direction;preview:Move|null;uncertain:Record<string,boolean>;problemCells:Set<string>;
  onSelect:(cell:Cell,repeat:boolean)=>void;onChange:(cell:Cell,tile:Tile|null)=>void;onDirection:()=>void;
}
export function Board({board,selected,direction,preview,uncertain,problemCells,onSelect,onChange,onDirection}:Props) {
  const refs=useRef<(HTMLInputElement|null)[]>([]);
  const repeatedClick=useRef(false);
  useEffect(()=>{if(window.matchMedia('(pointer:fine)').matches)refs.current[112]?.focus({preventScroll:true});},[]);
  function move(cell:Cell,dr:number,dc:number) {
    const next={row:Math.max(0,Math.min(14,cell.row+dr)),col:Math.max(0,Math.min(14,cell.col+dc))};
    onSelect(next,false);refs.current[next.row*15+next.col]?.focus({preventScroll:true});
  }
  const previewTiles=new Map(preview?.placements.map(p=>[cellKey(p),p]));
  return <div className="board-shell" data-testid="board">
    <div className="board-columns" aria-hidden="true">{Array.from({length:15},(_,i)=><span key={i}>{String.fromCharCode(65+i)}</span>)}</div>
    <div className="board-rows" aria-hidden="true">{Array.from({length:15},(_,i)=><span key={i}>{i+1}</span>)}</div>
    <div className="board-grid" role="group" aria-label="Editable 15 by 15 Crossplay board">
      {board.flatMap((line,row)=>line.map((tile,col)=>{
        const cell={row,col},key=cellKey(cell),premium=config.premiums[row][col],proposed=previewTiles.get(key),shown=proposed??tile;
        const active=selected.row===row&&selected.col===col;
        return <div key={key} className={['square',premium??'',shown?'occupied':'',shown?.isBlank?'blank-tile':'',proposed?'preview-tile':'',active?'selected':'',uncertain[key]?'uncertain':'',problemCells.has(key)?'problem':''].filter(Boolean).join(' ')} data-testid={`cell-${row+1}-${col+1}`} data-letter={tile?.letter??''} data-blank={tile?.isBlank??false} data-preview={proposed?.letter??''}>
          <span className="tile-face" aria-hidden="true">{shown?<><b>{shown.letter}</b><small>{shown.isBlank?'0':config.tileValues[shown.letter]}</small>{proposed&&<em>+</em>}</>:<span className="premium-label">{premium?.replace('D','2').replace('T','3')??(row===7&&col===7?'✦':'')}</span>}</span>
          {uncertain[key]&&<span className="uncertainty-mark" aria-hidden="true">!</span>}
          <input ref={node=>{refs.current[row*15+col]=node;}} aria-label={`Row ${row+1}, column ${col+1}${tile?`, ${tile.letter}${tile.isBlank?', blank':''}`:', empty'}${uncertain[key]?', review reading':''}`} autoComplete="off" autoCapitalize="characters" spellCheck={false} value={tile?.letter??''} maxLength={1} tabIndex={active?0:-1}
            onPointerDown={()=>{repeatedClick.current=active;}} onClick={()=>onSelect(cell,repeatedClick.current)} onFocus={()=>onSelect(cell,false)}
            onChange={event=>{const letter=event.target.value.replace(/[^a-z]/gi,'').slice(-1).toUpperCase();onChange(cell,letter?{letter,isBlank:false}:null);if(letter)move(cell,direction==='down'?1:0,direction==='across'?1:0);}}
            onContextMenu={event=>{event.preventDefault();if(tile)onChange(cell,{...tile,isBlank:!tile.isBlank});}}
            onKeyDown={event=>{
              if(event.ctrlKey||event.metaKey||event.altKey)return;
              if(/^[a-z]$/i.test(event.key)) {event.preventDefault();onChange(cell,{letter:event.key.toUpperCase(),isBlank:event.shiftKey});move(cell,direction==='down'?1:0,direction==='across'?1:0);}
              else if(event.key==='Delete'){event.preventDefault();onChange(cell,null);}
              else if(event.key==='Backspace'){event.preventDefault();if(tile)onChange(cell,null);else {const next={row:Math.max(0,row-(direction==='down'?1:0)),col:Math.max(0,col-(direction==='across'?1:0))};onChange(next,null);move(cell,next.row-row,next.col-col);}}
              else if(event.key.startsWith('Arrow')){event.preventDefault();move(cell,event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0,event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0);}
              else if(event.key==='Enter'){event.preventDefault();onDirection();}
              else if(event.key==='?'&&tile){event.preventDefault();onChange(cell,{...tile,isBlank:!tile.isBlank});}
            }}/>
        </div>;
      }))}
    </div>
  </div>;
}
