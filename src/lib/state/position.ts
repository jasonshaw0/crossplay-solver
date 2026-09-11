import { z } from 'zod';
import { emptyBoard } from '../crossplay/board';
import type { Board, Cell } from '../crossplay/types';
import type { RecognitionResult } from '../vision/types';

const tileSchema=z.object({letter:z.string().regex(/^[A-Z]$/),isBlank:z.boolean()});
export const positionSchema=z.object({
  version:z.literal(1),board:z.array(z.array(tileSchema.nullable()).length(15)).length(15),
  rack:z.array(z.string().regex(/^[A-Z?]?$/)).length(7),
  scores:z.object({player:z.number().int().nonnegative().optional(),opponent:z.number().int().nonnegative().optional()}).optional(),
  manualCells:z.record(z.string(),z.boolean()).optional(),
});
export type Position=z.infer<typeof positionSchema>;
export interface Conflict extends Cell { previous:string; candidate:string; candidateBlank:boolean; message:string }
export const initialPosition=():Position=>({version:1,board:emptyBoard(),rack:Array<string>(7).fill(''),manualCells:{}});
export function parsePosition(value:unknown):Position {
  const result=positionSchema.safeParse(value);
  if(!result.success)throw new Error('Invalid position JSON. Expected version 1, a 15 × 15 board, and seven rack slots.');
  return result.data;
}
export function reconcileRecognition(previous:Position,result:RecognitionResult):{position:Position;conflicts:Conflict[];uncertain:Record<string,boolean>} {
  const board:Board=emptyBoard(),rack=Array<string>(7).fill(''),conflicts:Conflict[]=[],uncertain:Record<string,boolean>={};
  for(const tile of result.board.tiles) {
    const row=tile.row-1,col=tile.col-1;
    board[row][col]={letter:tile.letter,isBlank:tile.isBlank};
    if(tile.confidence<.85)uncertain[`${row},${col}`]=true;
  }
  for(const tile of result.rack) {rack[tile.slot]=tile.isBlank?'?':tile.letter;if(tile.confidence<.85)uncertain[`rack:${tile.slot}`]=true;}
  previous.board.forEach((line,row)=>line.forEach((old,col)=>{
    const candidate=board[row][col],key=`${row},${col}`;
    if((old||previous.manualCells?.[key])&&(old?.letter!==candidate?.letter||old?.isBlank!==candidate?.isBlank)) {
      conflicts.push({row,col,previous:old?.letter??'',candidate:candidate?.letter??'',candidateBlank:candidate?.isBlank??false,message:`r${row+1}c${col+1}: kept ${old?.letter??'your empty cell'}; screenshot reads ${candidate?.letter??'empty'}.`});
      board[row][col]=old;uncertain[key]=true;
    }
  }));
  // Manually corrected rack slots are likewise authoritative on later imports.
  previous.rack.forEach((letter,slot)=>{
    if(previous.manualCells?.[`rack:${slot}`]&&rack[slot]!==letter) {
      conflicts.push({row:-1,col:slot,previous:letter,candidate:rack[slot],candidateBlank:rack[slot]==='?',message:`Rack ${slot+1}: kept ${letter||'empty'}; screenshot reads ${rack[slot]||'empty'}.`});
      rack[slot]=letter;uncertain[`rack:${slot}`]=true;
    }
  });
  return {position:{...previous,board,rack},conflicts,uncertain};
}
