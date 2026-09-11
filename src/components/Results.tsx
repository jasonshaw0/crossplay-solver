'use client';
import {useMemo,useState} from 'react';
import type {Move,SolveStats} from '../lib/crossplay/types';
import {Icon} from './Icons';
export function Results({moves,stats,selected,onSelect,solving,titleId='results-title',hideHeading=false}:{moves:Move[]|null;stats:SolveStats|null;selected:Move|null;onSelect:(move:Move)=>void;solving:boolean;titleId?:string;hideHeading?:boolean}) {
  const [query,setQuery]=useState(''),[scroll,setScroll]=useState(0);
  const filtered=useMemo(()=>moves?.filter(m=>m.mainWord.includes(query.toUpperCase()))??[],[moves,query]);
  const start=Math.max(0,Math.floor(scroll/58)-4),visible=filtered.slice(start,start+18);
  return <section className="results-section" aria-labelledby={titleId}>
    {!hideHeading&&<div className="section-heading"><div><span className="eyebrow">FIND YOUR NEXT PLAY</span><h2 id={titleId}>Legal moves {moves&&<span className="count">{moves.length.toLocaleString()}</span>}</h2></div><div className="results-meta">{stats&&<span>{Math.round(stats.durationMs)} ms · exact scores</span>}{moves&&moves.length>0&&<input aria-label="Filter results by word" placeholder="Find a word…" value={query} onChange={e=>{setQuery(e.target.value);setScroll(0);}}/>}</div></div>}
    {!moves?<div className="results-empty"><span className="empty-icon"><Icon name="spark" size={26}/></span><div><h3>{solving?'Finding every legal play…':'A good move starts here.'}</h3><p>{solving?'Checking words, crossings, and scores.':'Enter your board and rack, or import a screenshot. Then hit Solve.'}</p></div></div>:filtered.length===0?<div className="results-empty"><h3>{query?'No matching words.':'No legal plays found.'}</h3></div>:<>
      <div className="result-columns" aria-hidden="true"><span>#</span><span>WORD</span><span>POSITION</span><span>NEW TILES</span><span>POINTS</span><span/></div>
      <div className="results-scroll" onScroll={e=>setScroll(e.currentTarget.scrollTop)} role="group" aria-label="Moves ranked by exact score" data-testid="results-list">
        <div style={{height:filtered.length*58,position:'relative'}}>{visible.map((move,index)=><button key={move.id} data-testid={`move-${start+index}`} aria-label={`${move.mainWord}, ${move.totalScore} points, row ${move.startRow+1} column ${move.startCol+1}, ${move.direction}`} aria-pressed={selected?.id===move.id} className={`result-row ${selected?.id===move.id?'active':''}`} style={{position:'absolute',top:(start+index)*58,left:0,right:0}} onClick={()=>onSelect(move)}>
          <span className="rank">{start+index+1}</span><strong>{move.mainWord}</strong><span className="move-position">{String.fromCharCode(65+move.startCol)}{move.startRow+1}<span>{move.direction==='across'?'→':'↓'}</span></span><span className="mini-tiles">{move.placements.map((p,i)=><span key={i} title={p.isBlank?`Blank as ${p.letter}`:p.letter}>{p.isBlank?p.letter.toLowerCase():p.letter}</span>)}</span><strong className="move-score">{move.totalScore}</strong><Icon name="arrow" size={15}/>
        </button>)}</div>
      </div>
    </>}
    <p className="results-footnote">Ranked by immediate score using the loaded dictionary. Select a move to preview its placement.</p>
  </section>;
}
export function ScoreBreakdown({move,onApply,onClose}:{move:Move;onApply:()=>void;onClose:()=>void}) {
  return <section className="preview-card" aria-label="Move preview"><div className="preview-heading"><span className="eyebrow">ON THE BOARD</span><button className="icon-button" aria-label="Dismiss move preview" onClick={onClose}><Icon name="close" size={15}/></button></div>
    <div className="preview-title"><h2>{move.mainWord}</h2><div><strong>{move.totalScore}</strong><span>points</span></div></div>
    <p>{String.fromCharCode(65+move.startCol)}{move.startRow+1} · {move.direction} · {move.placements.length} tile{move.placements.length!==1?'s':''}</p>
    <div className="word-totals">{move.formedWords.map((word,i)=><div key={i}><span>{word.word}</span><strong>{word.score}</strong></div>)}{move.scoreBreakdown.bonus>0&&<div><span>All seven tiles</span><strong>+40</strong></div>}</div>
    <details className="score-details"><summary>Score breakdown</summary>{move.formedWords.map((word,i)=><div className="word-arithmetic" key={i}><b>{word.word}</b><p>{word.tiles.map(t=>`${t.letter}${t.isBlank?'(blank)':''} ${t.basePoints}${t.letterMultiplier>1?` ×${t.letterMultiplier}`:''}`).join(' + ')}</p><p>{word.subtotal}{word.wordMultiplier>1?` × ${word.wordMultiplier} word multiplier`:''} = <strong>{word.score}</strong></p></div>)}<p>Existing premiums stay spent. Blank tiles score zero.</p></details>
    <button className="button apply-button" onClick={onApply}><Icon name="check"/>Apply to position</button><span className="preview-note">Preview only until applied. Undo is always available.</span>
  </section>;
}
