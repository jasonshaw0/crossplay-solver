import type {Metadata} from 'next';
import katex from 'katex';
import {SiteBrand} from '../../components/SiteBrand';
import styles from './methodology.module.css';

export const metadata:Metadata={title:'Methodology — Crossplay Solver',description:'How Crossplay Solver exhaustively generates, validates, and scores legal moves.'};
const BASE_PATH=process.env.NEXT_PUBLIC_BASE_PATH??'';

function Formula({tex,block=false}:{tex:string;block?:boolean}) {
  const html=katex.renderToString(tex,{displayMode:block,throwOnError:false,strict:false});
  return block?<div className={styles.mathBlock} dangerouslySetInnerHTML={{__html:html}}/>:<span className={styles.mathInline} dangerouslySetInnerHTML={{__html:html}}/>;
}

export default function MethodologyPage() {
  return <>
    <header className="app-header"><SiteBrand/><a className={`button ${styles.backButton}`} href={`${BASE_PATH}/`}>← Back to Solver</a></header>
    <main className={styles.main}>
      <section className={styles.hero}>
        <span className="eyebrow">HOW IT WORKS</span>
        <h1>Exact search, carefully constrained</h1>
        <p>Crossplay Solver does not ask AI to invent a plausible move. It performs deterministic combinatorial search over the legal possibilities, prunes states that cannot succeed, independently validates every candidate, and computes the exact immediate score.</p>
        <div className={styles.summaryLine}>Anchors + Trie Traversal + Cross-Check Masks + Independent Validation + Exact Scoring</div>
      </section>

      <ol className={styles.flow} aria-label="Solver processing flow">
        {['Board + Rack','Anchors','Trie Search','Cross-Checks','Validation','Scoring','Ranked Moves'].map(step=><li key={step}>{step}</li>)}
      </ol>

      <section className={`${styles.card} ${styles.problem}`}>
        <div className={styles.number}>01</div><div><h2>Formal problem</h2><p>The position is a 15 × 15 board <Formula tex="B"/> and a rack <Formula tex="R"/> containing up to seven physical tiles. The rack is a multiset: repeated letters are distinct tiles with the same face, while a blank can represent any letter but always has value zero. A lexicon <Formula tex="D"/> decides which complete words are valid.</p>
        <Formula block tex={'M^* = \\arg\\max_{M \\in \\mathcal{L}(B,R)} S(M)'}/>
        <p><Formula tex={'\\mathcal{L}(B,R)'}/> is the set of legal moves and <Formula tex="S(M)"/> is immediate score. The solver ranks that objective only; it does not estimate leave quality, board volatility, or long-term strategic equity.</p></div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}><span className="eyebrow">SEARCH SPACE</span><h2>Finding every viable word without trying everything</h2></div>
        <div className={styles.threeGrid}>
          <article className={styles.card}><div className={styles.number}>02</div><h3>Prefix trie</h3><p>The dictionary is stored as a prefix trie. Every path is a word prefix and terminal nodes mark complete words. If a partial placement has no matching edge, that branch ends immediately.</p><p>Each node also stores a 26-bit mask of its outgoing letters. This avoids testing every word at every board location.</p></article>
          <article className={styles.card}><div className={styles.number}>03</div><h3>Anchor squares</h3><p>An anchor is an empty cell orthogonally adjacent to an occupied cell:</p><Formula block tex={'A = \\{x \\mid x \\text{ is empty and adjacent}\\}'}/><p>Every connected non-opening move places a tile on at least one anchor. On an empty board, the center is the anchor.</p></article>
          <article className={styles.card}><div className={styles.number}>04</div><h3>Candidate starts</h3><p>For each anchor and direction, the solver scans backward to find possible word starts. It stops when the number of empty cells exceeds the number of rack tiles.</p><p>A move cannot consume tiles that do not physically exist, so this discards unreachable starts before recursion begins.</p></article>
        </div>
      </section>

      <section className={`${styles.card} ${styles.emphasis}`}>
        <div className={styles.number}>05</div><div><span className="eyebrow">THE KEY INTERSECTION</span><h2>Cross-check sets as bitmasks</h2><p>For each empty cell <Formula tex="x"/>, the solver precomputes which letters can be placed there without making an invalid perpendicular word. If the fixed letters around the cell form <code>before + ? + after</code>, then:</p>
        <Formula block tex={'C(x) = \\{\\ell \\in \\Sigma \\mid \\text{before}\\,\\ell\\,\\text{after} \\in D\\}'}/>
        <p>When no perpendicular word is formed, every letter is allowed. Otherwise, <Formula tex="C(x)"/> becomes a 26-bit mask. During trie traversal the next-letter choices are:</p>
        <Formula block tex={'M_{\\mathrm{allowed}} = M_{\\mathrm{trie}} \\mathbin{\\&} M_{\\mathrm{cross}}'}/>
        <div className={styles.plainCallout}>A letter must both continue a dictionary prefix and create a legal perpendicular word.</div></div>
      </section>

      <section className={styles.twoGrid}>
        <article className={styles.card}><div className={styles.number}>06</div><h2>Recursive constrained search</h2><p>Depth-first search advances one board cell at a time.</p><ul><li><b>Occupied cell:</b> follow that exact letter in the trie. If its edge is missing, stop.</li><li><b>Empty cell:</b> intersect trie and cross-check masks, then try only letters present in the rack or representable by a blank.</li><li><b>Backtrack:</b> place temporarily, recurse, restore the tile count.</li></ul><p>The rack is a frequency vector rather than a list of permutations:</p><Formula block tex={'\\mathbf{r}=(r_A,r_B,\\ldots,r_Z,r_{?})'}/><p>Counts make repeated letters cheap: placing decrements one entry and backtracking restores it.</p></article>
        <article className={styles.card}><div className={styles.number}>07</div><h2>Acceptance and completeness</h2><p>A traversal becomes a candidate only when the trie node is terminal, the word ends at a true boundary, at least one new tile was placed, and an anchor was touched.</p><p>Anchor generation remains exhaustive over connected moves. Every legal non-opening play must connect to the existing position, so one of its new tiles must occupy an anchor. Searching every viable start associated with every anchor does not intentionally omit a legal move.</p><div className={styles.miniDiagram}><span>All anchors</span><b>→</b><span>All viable starts</span><b>→</b><span>All legal candidates</span></div></article>
      </section>

      <section className={styles.twoGrid}>
        <article className={styles.card}><div className={styles.number}>08</div><h2>Independent validation</h2><p>The optimized generator is never the final authority. A separate validator reconstructs the main word and every perpendicular word, then checks rack usage, connectivity, row or column alignment, the opening-center rule, boundaries, and dictionary membership.</p><div className={styles.architectureCallout}><b>Fast generator</b><span>→</span><b>Authoritative validator</b></div><p>The two layers favor different goals: efficient enumeration first, explicit legality checks second.</p></article>
        <article className={styles.card}><div className={styles.number}>09</div><h2>Exact scoring</h2><p>For each formed word <Formula tex="W"/>:</p><Formula block tex={'S(W)=M_W\\sum_i v_iL_i'}/><p><Formula tex="v_i"/> is the physical tile value, with blanks fixed at zero. <Formula tex="L_i"/> is a letter multiplier on a newly placed tile, and <Formula tex="M_W"/> is the product of newly activated word multipliers.</p><Formula block tex={'S(M)=\\sum_{W \\in \\text{formed words}}S(W)+B(M)'}/><p><Formula tex="B(M)"/> is the all-tiles bonus when applicable. Existing premium squares never reactivate.</p></article>
      </section>

      <section className={styles.twoGrid}>
        <article className={styles.card}><div className={styles.number}>10</div><h2>Why it is fast</h2><p>A naive search resembles <code>every word × every start × two directions</code>. The implementation visits reachable dictionary-prefix states instead.</p><ul className={styles.compactList}><li>anchors restrict where connected moves matter;</li><li>trie edges kill invalid prefixes;</li><li>cross-check masks remove illegal perpendicular letters;</li><li>rack counts avoid duplicate permutations;</li><li>boundaries and tile limits stop branches early.</li></ul><p className={styles.closingLine}>The search remains exhaustive over legal moves while aggressively avoiding impossible states.</p></article>
        <article className={styles.card}><div className={styles.number}>11</div><h2>Correctness testing</h2><p>Randomized positions are solved twice: once by the optimized generator and once by a deliberately slow brute-force oracle built by a different method.</p><Formula block tex={'\\operatorname{Optimized}(B,R,D)=\\operatorname{Oracle}(B,R,D)'}/><p>Comparing complete move sets provides strong regression protection. If an optimization accidentally prunes a legal branch, the independent oracle exposes the difference.</p></article>
      </section>

      <section className={`${styles.card} ${styles.vision}`}>
        <div className={styles.number}>12</div><div><span className="eyebrow">BEFORE THE SEARCH</span><h2>Local screenshot recognition</h2><p>The vision worker locates the repeated board grid, normalizes its geometry, segments tile colors, and extracts each large letter separately from its small point value. Templates include controlled scale and compression variants. A reliable point value can resolve a close letter ambiguity, while zero-value detection independently preserves physical blanks.</p><Formula block tex={'\\text{Screenshot} \\longrightarrow \\text{Recognized Board + Rack} \\longrightarrow \\text{Deterministic Solver}'}/><p>The evidence score combines glyph quality, separation from the next candidate, and point-value agreement; it is not a probability. Low-evidence readings are marked for review and pause automatic solving. Every tile remains editable, and importing over manual state produces explicit conflicts instead of silently overwriting prior work. Recognition and solving are independent browser workers; screenshot bytes stay on the device and no remote AI API is required.</p></div>
      </section>

      <section className={styles.finalCallout}><h2>The method in one sentence</h2><p>Constrain the board to places a legal move must touch, walk only dictionary prefixes that the rack and perpendicular words permit, validate the resulting moves independently, then score every formed word exactly.</p><a className={`button ${styles.backButton}`} href={`${BASE_PATH}/`}>Back to Solver →</a></section>
    </main>
    <footer className="app-footer"><span>Methodology for Crossplay Solver by <a href="https://github.com/jasonshaw0" target="_blank" rel="noreferrer">Jason Shaw</a>.</span><span><a href={`${BASE_PATH}/`}>Solver</a> · <a href="https://github.com/jasonshaw0/crossplay-solver" target="_blank" rel="noreferrer">View source</a></span></footer>
  </>;
}
