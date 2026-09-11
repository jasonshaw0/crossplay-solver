import type { CrossplayGameConfig, Premium } from './types';

/** 1-based coordinates transcribed from the user's IMG_2839/2842/2849.
 * Hidden r8c6 / r8c10 DL and r8c12 DW are corroborated by RELAX=22,
 * RELAXED=32; rotational symmetry supplies the few other covered cells.
 * The center is ordinary, NOT double word. See docs/verification.md.
 */
export const PREMIUM_SQUARES = {
  TL: [[1,1],[1,15],[2,7],[2,9],[5,6],[5,10],[6,5],[6,11],[7,2],[7,14],[9,2],[9,14],[10,5],[10,11],[11,6],[11,10],[14,7],[14,9],[15,1],[15,15]],
  DL: [[1,8],[3,5],[3,11],[4,4],[4,12],[5,3],[5,13],[6,8],[8,1],[8,6],[8,10],[8,15],[10,8],[11,3],[11,13],[12,4],[12,12],[13,5],[13,11],[15,8]],
  DW: [[2,2],[2,14],[4,8],[8,4],[8,12],[12,8],[14,2],[14,14]],
  TW: [[1,4],[1,12],[4,1],[4,15],[12,1],[12,15],[15,4],[15,12]],
} as const;
const premiums: Premium[][] = Array.from({length:15},()=>Array<Premium>(15).fill(null));
for (const [kind, cells] of Object.entries(PREMIUM_SQUARES)) for (const [row,col] of cells) premiums[row-1][col-1] = kind as Premium;

export const CROSSPLAY_CONFIG: CrossplayGameConfig = {
  size: 15, center: {row:7,col:7}, premiums, rackSize:7, allTilesBonus:40,
  tileValues: {A:1,B:4,C:3,D:2,E:1,F:4,G:4,H:3,I:1,J:10,K:6,L:2,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:2,V:6,W:5,X:8,Y:4,Z:10,'?':0},
  // Provisional distribution; used ONLY for nonblocking sanity warnings.
  // No bag/count screenshot was supplied. Never prune moves using this table.
  tileCounts: {A:9,B:2,C:2,D:4,E:12,F:2,G:3,H:2,I:9,J:1,K:1,L:4,M:2,N:6,O:8,P:2,Q:1,R:6,S:5,T:6,U:3,V:1,W:1,X:1,Y:2,Z:1,'?':3},
};
