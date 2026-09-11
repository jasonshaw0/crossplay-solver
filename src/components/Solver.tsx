'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Board} from './Board';
import {Rack} from './Rack';
import {Results,ScoreBreakdown} from './Results';
import {RecognitionDebugger} from './RecognitionDebugger';
import type {CorrectionSample} from './RecognitionDebugger';
import {Icon} from './Icons';
import {applyPlacements,cloneBoard,consumeRack,occupiedCount} from '../lib/crossplay/board';
import type {BoardIssue,Cell,Direction,Move,SolveStats,Tile} from '../lib/crossplay/types';
import type {DictionaryInfo} from '../lib/crossplay/dictionary';
import {initialPosition,parsePosition,reconcileRecognition} from '../lib/state/position';
import type {Position,Conflict} from '../lib/state/position';
import {LocalCrossplayRecognizer} from '../lib/vision/provider';
import type {RecognitionResult,RecognizedTile} from '../lib/vision/types';
import type {SolverRequest} from '../workers/solver.worker';

interface Settings {additions:string;removals:string;customText?:string;customName?:string;saveCorrections:boolean}
const defaultSettings:Settings={additions:'',removals:'',saveCorrections:false};
const STORAGE='crossplay-position-v1',SETTINGS='crossplay-settings-v1';
const BASE_PATH=process.env.NEXT_PUBLIC_BASE_PATH??'';
function download(filename:string,value:unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function Solver() {
  const [position,setPosition]=useState<Position>(initialPosition),[hydrated,setHydrated]=useState(false),[settings,setSettings]=useState<Settings>(defaultSettings);
  const [selected,setSelected]=useState<Cell>({row:7,col:7}),[direction,setDirection]=useState<Direction>('across');
  const [history,setHistory]=useState<Position[]>([]),[preview,setPreview]=useState<Move|null>(null),[moves,setMoves]=useState<Move[]|null>(null),[stats,setStats]=useState<SolveStats|null>(null);
  const [info,setInfo]=useState<DictionaryInfo|null>(null),[nodes,setNodes]=useState(0),[solving,setSolving]=useState(false),[importing,setImporting]=useState(false);
  const [status,setStatus]=useState(''),[error,setError]=useState(''),[issues,setIssues]=useState<BoardIssue[]>([]);
  const [uncertain,setUncertain]=useState<Record<string,boolean>>({}),[conflicts,setConflicts]=useState<Conflict[]>([]),[recognition,setRecognition]=useState<RecognitionResult|null>(null),[imageUrl,setImageUrl]=useState('');
  const [showSettings,setShowSettings]=useState(false),[draft,setDraft]=useState(defaultSettings),[corrections,setCorrections]=useState<CorrectionSample[]>([]);
  const worker=useRef<Worker|null>(null),revision=useRef(0),latestPosition=useRef(position),screenshotInput=useRef<HTMLInputElement>(null),jsonInput=useRef<HTMLInputElement>(null),dictInput=useRef<HTMLInputElement>(null);
  const recognizer=useRef<LocalCrossplayRecognizer|null>(null);
  useEffect(()=>{latestPosition.current=position;},[position]);

  useEffect(()=>{
    // Browser-only storage is read after hydration; the initial board is usable immediately.
    const task=window.setTimeout(()=>{
      try {
        const saved=localStorage.getItem(STORAGE);if(saved)setPosition(parsePosition(JSON.parse(saved)));
        const savedSettings=localStorage.getItem(SETTINGS);
        if(savedSettings){const parsed=JSON.parse(savedSettings);if(typeof parsed.additions==='string'&&typeof parsed.removals==='string')setSettings({...defaultSettings,...parsed});}
        const samples=localStorage.getItem('crossplay-corrections-v1');if(samples){const parsed=JSON.parse(samples);if(Array.isArray(parsed))setCorrections(parsed);}
      }catch{setError('The saved position could not be restored. You can start a new one.');}
      setHydrated(true);
    },0);
    return()=>clearTimeout(task);
  },[]);
  useEffect(()=>{
    if(!hydrated)return;
    try {localStorage.setItem(STORAGE,JSON.stringify(position));localStorage.setItem(SETTINGS,JSON.stringify(settings));}
    catch {queueMicrotask(()=>setError('Browser storage is full or unavailable. Export your position to keep a copy.'));}
  },[position,settings,hydrated]);
  useEffect(()=>{
    if(!hydrated)return;
    const current=new Worker(new URL('../workers/solver.worker.ts',import.meta.url));worker.current=current;
    current.onmessage=event=>{
      const message=event.data;
      if(message.type==='ready'){setInfo(message.info);setNodes(message.nodes);return;}
      if(message.id!==undefined&&message.id!==revision.current)return;
      setSolving(false);
      if(message.type==='error'){setError(message.error);return;}
      setIssues(message.issues??[]);
      if(message.type==='invalid'){setError('Check the highlighted board cells before solving.');return;}
      if(message.type==='solved'){setMoves(message.moves);setStats(message.stats);setStatus(`${message.moves.length.toLocaleString()} legal plays found.`);}
    };
    current.onerror=()=>{setSolving(false);setError('The solver worker could not start. Reload to try again.');};
    const request:SolverRequest={type:'init',...settings};current.postMessage(request);
    return()=>{current.terminate();worker.current=null;};
  },[hydrated,settings]);
  useEffect(()=>()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);},[imageUrl]);
  // Load the recognition worker and templates with the app, before going offline.
  useEffect(()=>{
    recognizer.current=new LocalCrossplayRecognizer();
    if('serviceWorker' in navigator)navigator.serviceWorker.register(`${BASE_PATH}/sw.js`,{scope:`${BASE_PATH}/`}).catch(()=>{});
    return()=>recognizer.current?.dispose();
  },[]);

  function commit(next:Position,message='') {
    const previous=latestPosition.current;
    setHistory(past=>[...past.slice(-79),previous]);latestPosition.current=next;setPosition(next);
    revision.current++;setMoves(null);setPreview(null);setStats(null);setIssues([]);setError('');setStatus(message);setSolving(false);
  }
  function saveSample(tile:RecognizedTile,label:string) {
    const sample:CorrectionSample={label,pixels:tile.glyph,source:`local:r${tile.row}c${tile.col}`,predicted:tile.letter,confidence:tile.confidence,createdAt:new Date().toISOString()};
    const next=[...corrections,sample];setCorrections(next);
    try{localStorage.setItem('crossplay-corrections-v1',JSON.stringify(next));setStatus('Corrected crop saved locally.');}catch{setError('Could not save correction samples. Export them before closing.');}
  }
  function editCell(cell:Cell,tile:Tile|null) {
    const before=latestPosition.current,board=cloneBoard(before.board),key=`${cell.row},${cell.col}`;board[cell.row][cell.col]=tile;
    if(settings.saveCorrections&&tile&&recognition){const source=recognition.board.tiles.find(t=>t.row===cell.row+1&&t.col===cell.col+1);if(source&&source.letter!==tile.letter)saveSample(source,tile.letter);}
    commit({...before,board,manualCells:{...before.manualCells,[key]:true}});
    setUncertain(current=>({...current,[key]:false}));setConflicts(current=>current.filter(c=>c.row!==cell.row||c.col!==cell.col));
  }
  function editRack(slot:number,letter:string) {
    const before=latestPosition.current,rack=[...before.rack];rack[slot]=letter;
    commit({...before,rack,manualCells:{...before.manualCells,[`rack:${slot}`]:true}});
    setUncertain(current=>({...current,[`rack:${slot}`]:false}));setConflicts(current=>current.filter(c=>c.row!==-1||c.col!==slot));
  }
  function undo() {
    const previous=history.at(-1);if(!previous)return;
    setPosition(previous);latestPosition.current=previous;setHistory(history.slice(0,-1));revision.current++;setPreview(null);setMoves(null);setStats(null);setSolving(false);setError('');setIssues([]);setStatus('Last change undone.');
  }
  function solve() {
    if(!info||!worker.current)return;
    if(!position.rack.some(Boolean)){setError('Enter at least one rack tile to solve.');return;}
    setSolving(true);setError('');setStatus('');setMoves(null);setPreview(null);setStats(null);
    const request:SolverRequest={type:'solve',id:++revision.current,board:position.board,rack:position.rack};worker.current.postMessage(request);
  }
  async function importScreenshot(file:File) {
    setImporting(true);setError('');setStatus('Reading board and rack on this device…');
    try {
      recognizer.current??=new LocalCrossplayRecognizer();
      const result=await recognizer.current.recognize(file);
      const reconciled=reconcileRecognition(latestPosition.current,result);
      commit(reconciled.position,`Screenshot imported · ${result.board.tiles.length} board tiles · ${result.rack.length} rack tiles · ${Math.round(result.timings.totalMs)} ms`);
      setUncertain(reconciled.uncertain);setConflicts(reconciled.conflicts);setRecognition(result);setImageUrl(URL.createObjectURL(file));
    }catch(error){setError(`${error instanceof Error?error.message:'Screenshot recognition failed.'} Manual entry is always available.`);setStatus('');}
    finally{setImporting(false);}
  }
  async function importJSON(file:File) {
    try {if(file.size>2_000_000)throw new Error('Position file is too large.');const next=parsePosition(JSON.parse(await file.text()));commit(next,'Position imported.');setUncertain({});setConflicts([]);setRecognition(null);}
    catch(error){setError(error instanceof Error?error.message:'Could not import the position.');}
  }
  async function loadExample() {
    try{const response=await fetch(`${BASE_PATH}/fixtures/midgame.json`);if(!response.ok)throw new Error('Example could not be loaded.');commit(parsePosition(await response.json()),'Example loaded from the supplied game position.');setRecognition(null);setUncertain({});setConflicts([]);}
    catch(error){setError(error instanceof Error?error.message:'Could not load example.');}
  }
  function acceptConflict(conflict:Conflict) {
    if(conflict.row<0)editRack(conflict.col,conflict.candidate);
    else editCell(conflict,conflict.candidate?{letter:conflict.candidate,isBlank:conflict.candidateBlank}:null);
  }
  const tile=position.board[selected.row][selected.col],occupied=occupiedCount(position.board);
  const problemCells=useMemo(()=>new Set(issues.flatMap(issue=>issue.cells.map(p=>`${p.row},${p.col}`))),[issues]);
  const selectedConflict=conflicts.find(c=>c.row===selected.row&&c.col===selected.col);
  return <>
    <header className="app-header"><div className="brand"><span className="brand-mark" aria-hidden="true"><span>C</span><span>S</span></span><div><h1>Crossplay Solver</h1><span>A little clarity for your next move.</span></div></div><div className="header-actions"><span className="local-badge"><i/>Runs on your device</span><button className="button subtle" onClick={()=>{setDraft(settings);setShowSettings(!showSettings);}} aria-expanded={showSettings}><Icon name="settings"/><span>Settings</span></button></div></header>
    <main className="workspace">
      <div className="solver-layout">
        <section className="board-section" aria-labelledby="board-title"><div className="section-heading board-heading"><div><span className="eyebrow">YOUR POSITION</span><h2 id="board-title">The board <span className="small-count">{occupied} tiles</span></h2></div><div className="direction-switch" aria-label="Typing direction"><button className={direction==='across'?'active':''} aria-pressed={direction==='across'} onClick={()=>setDirection('across')}>Across →</button><button className={direction==='down'?'active':''} aria-pressed={direction==='down'} onClick={()=>setDirection('down')}>Down ↓</button></div></div>
          <Board board={position.board} selected={selected} direction={direction} preview={preview} uncertain={uncertain} problemCells={problemCells} onChange={editCell} onDirection={()=>setDirection(d=>d==='across'?'down':'across')} onSelect={(cell,repeat)=>{setSelected(cell);if(repeat)setDirection(d=>d==='across'?'down':'across');}}/>
          <div className="board-bottom"><div className="legend"><span className="DL">2L</span><span className="TL">3L</span><span className="DW">2W</span><span className="TW">3W</span><span className="legend-text">Letter & word bonuses</span></div><span className="board-hint">Click a square. Type a letter.</span></div>
          <div className="cell-inspector"><span><b>{String.fromCharCode(65+selected.col)}{selected.row+1}</b> {tile?`${tile.letter}${tile.isBlank?' · blank (0 points)':''}`:'Empty square'}</span><div><button disabled={!tile} aria-pressed={tile?.isBlank??false} onClick={()=>tile&&editCell(selected,{...tile,isBlank:!tile.isBlank})}>○ {tile?.isBlank?'Make regular':'Mark blank'}</button><button disabled={!tile} onClick={()=>editCell(selected,null)}>Clear cell</button></div></div>
          {selectedConflict&&<div className="conflict-inline">{selectedConflict.message}<button onClick={()=>acceptConflict(selectedConflict)}>Use screenshot reading</button></div>}
          <details className="keyboard-help"><summary>Keyboard shortcuts</summary><p>Letters advance in the selected direction. Arrow keys move between cells. Enter switches direction. Delete clears a cell; Backspace on an empty cell clears the previous tile. Shift + letter places a blank; ? or right-click toggles an existing blank. Lowercase letters and ○ identify blanks.</p></details>
        </section>
        <aside className="controls">
          <section className="rack-card"><div className="section-heading"><h2>Your rack</h2><span className="small-count">{position.rack.filter(Boolean).length} / 7</span></div><Rack rack={position.rack} onChange={editRack} uncertain={uncertain}/><p className="helper">Type your letters. Use <kbd>?</kbd> for a blank.</p><button className="button primary solve-button" data-testid="solve" onClick={solve} disabled={!info||solving||!position.rack.some(Boolean)}>{solving?<span className="spinner"/>:<Icon name="spark"/>}{solving?'Finding moves…':'Solve position'}<Icon name="arrow"/></button>
            <div className="secondary-actions"><button className="button" onClick={undo} disabled={!history.length}><Icon name="undo" size={15}/>Undo</button><button className="button" onClick={()=>{commit(initialPosition(),'Position cleared. Undo restores it.');setUncertain({});setConflicts([]);setRecognition(null);}}><Icon name="clear" size={15}/>Clear</button></div>
          </section>
          <section className={`import-card ${importing?'busy':''}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file&&!importing)void importScreenshot(file);}}><span className="import-icon"><Icon name="image" size={25}/></span><h3>Start with a screenshot</h3><p>Bring your board and rack straight<br/>from the game.</p><button className="button" disabled={importing} onClick={()=>screenshotInput.current?.click()}><Icon name="upload" size={16}/>{importing?'Reading screenshot…':'Import screenshot'}</button><span className="privacy-note">Local recognition. Your image stays here.</span><input ref={screenshotInput} data-testid="screenshot-input" type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void importScreenshot(file);e.target.value='';}}/></section>
          {preview?<ScoreBreakdown move={preview} onClose={()=>setPreview(null)} onApply={()=>{const board=applyPlacements(position.board,preview.placements),rack=consumeRack(position.rack,preview.placements);commit({...position,board,rack,manualCells:{}},`${preview.mainWord} applied. Refill your rack for the next solve.`);}}/>:<div className="quick-tip"><span>NEW TO THE BOARD?</span><p>Try a real game position, then select a move to see exactly where it goes.</p><button className="text-button" onClick={loadExample}>Load example position <Icon name="arrow" size={14}/></button></div>}
          <div className="position-actions"><button onClick={()=>download('crossplay-position.json',position)}><Icon name="download" size={14}/>Export position</button><button onClick={()=>jsonInput.current?.click()}><Icon name="upload" size={14}/>Import JSON</button><input ref={jsonInput} data-testid="position-input" type="file" hidden accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(file)void importJSON(file);e.target.value='';}}/></div>
        </aside>
      </div>
      <div className="status-area" aria-live="polite">{error?<p className="error-message" role="alert">{error}</p>:status?<p className="success-message"><Icon name={importing?'image':'check'} size={16}/>{status}</p>:<p className="quiet-message"><span className={`status-dot ${info?'ready':''}`}/>{info?`${info.wordCount.toLocaleString()} words ready · ${info.name}`:'Loading dictionary…'}</p>}</div>
      {(recognition?.warnings.length||conflicts.length>0||issues.length>0)?<details className="review-panel" open={conflicts.length>0||issues.some(i=>i.severity==='error')}><summary>Review position · {conflicts.length} conflict{conflicts.length!==1?'s':''}{Object.values(uncertain).some(Boolean)?' · marked cells need a look':''}</summary>{recognition?.warnings.map((warning,i)=><p key={i}>{warning}</p>)}{issues.map((issue,i)=><p key={i}>{issue.message}</p>)}{conflicts.map((conflict,i)=><div key={i}><span>{conflict.message}</span><button onClick={()=>acceptConflict(conflict)}>Use screenshot reading</button></div>)}</details>:null}
      <Results moves={moves} stats={stats} selected={preview} onSelect={setPreview} solving={solving}/>
      {showSettings&&<section className="settings-panel" aria-label="Dictionary settings"><div className="section-heading"><div><span className="eyebrow">YOUR WORD LIST</span><h2>Dictionary & preferences</h2></div><button className="icon-button" aria-label="Close settings" onClick={()=>setShowSettings(false)}><Icon name="close"/></button></div><p><b>{info?.name??'Loading'} · {info?.wordCount.toLocaleString()??'…'} words</b> · Overrides +{info?.additions??0} / −{info?.removals??0}</p><p>ENABLE is a full public-domain lexicon. NYT uses a curated NWL 2023 list, so accepted words can differ. Load your own word list or patch individual words below. Scores and legality are exact for the loaded dictionary.</p><div className="override-fields"><label>Add words <textarea aria-label="Dictionary additions" value={draft.additions} onChange={e=>setDraft({...draft,additions:e.target.value})} placeholder="One word per line"/></label><label>Remove words <textarea aria-label="Dictionary removals" value={draft.removals} onChange={e=>setDraft({...draft,removals:e.target.value})} placeholder="One word per line"/></label></div><div className="settings-buttons"><button className="button" onClick={()=>dictInput.current?.click()}>Load .txt dictionary</button>{draft.customText&&<button className="button" onClick={()=>setDraft({...draft,customText:undefined,customName:undefined})}>Use ENABLE</button>}<span>{draft.customName}</span><input ref={dictInput} type="file" hidden accept="text/plain,.txt" onChange={async e=>{const file=e.target.files?.[0];if(file){if(file.size>15_000_000){setError('Use a dictionary smaller than 15 MB.');return;}setDraft({...draft,customText:await file.text(),customName:file.name});}}}/></div><label className="checkbox-label"><input type="checkbox" checked={draft.saveCorrections} onChange={e=>setDraft({...draft,saveCorrections:e.target.checked})}/>Save corrected tile crops locally for training exports</label><div className="settings-buttons"><button className="button primary" onClick={()=>{setSettings(draft);setInfo(null);setMoves(null);setPreview(null);revision.current++;setError('');setShowSettings(false);}}>Save settings</button><button className="button" disabled={!corrections.length} onClick={()=>download('crossplay-training-samples.json',corrections)}>Export {corrections.length} labeled crops</button></div><p className="fine-print">No automatic retraining or cloud uploads. Tile distribution warnings are provisional until a tile-bag screenshot is verified.</p>{info&&<p className="fingerprint">Dictionary SHA-256: {info.fingerprint}</p>}</section>}
      {process.env.NODE_ENV==='development'&&<><details className="debug-panel"><summary>Solver debug</summary><p>Dictionary: {info?.wordCount??0} words · trie: {nodes.toLocaleString()} nodes · anchors: {stats?.anchors??0} · candidates: {stats?.candidates??0} · legal moves: {stats?.legalMoves??0}</p>{stats&&<><p>Selected cell cross-check masks: across {stats.crossChecks.across[selected.row][selected.col].toString(2)}, down {stats.crossChecks.down[selected.row][selected.col].toString(2)}</p><pre>{JSON.stringify({...stats,crossChecks:undefined},null,2)}</pre></>}</details>{recognition&&imageUrl&&<RecognitionDebugger result={recognition} imageUrl={imageUrl} onLabel={saveSample}/>}</>}
    </main><footer className="app-footer"><span>Built for the love of a good word by <a href="https://github.com/jasonshaw0" target="_blank" rel="noreferrer">Jason Shaw</a>.</span><span>Independent tool · Not affiliated with The New York Times · <a href="https://github.com/jasonshaw0/crossplay-solver" target="_blank" rel="noreferrer">View source</a></span></footer>
  </>;
}
