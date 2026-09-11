import {it,expect} from 'vitest';
import {initialPosition,parsePosition,reconcileRecognition} from '../../src/lib/state/position';
import type {RecognitionResult} from '../../src/lib/vision/types';
const candidate:RecognitionResult={provider:'local',board:{detected:true,bounds:{x:0,y:0,width:100,height:100},complete:true,orientation:'upright',tiles:[{row:8,col:8,letter:'D',isBlank:false,confidence:.9,blankConfidence:1,glyph:[],pointGlyph:[],bounds:{x:0,y:0,width:10,height:10}}]},rack:[],rackBounds:null,warnings:[],timings:{geometryMs:0,extractionMs:0,classificationMs:0,totalMs:0},imageSize:{width:100,height:100}};
it('preserves manual corrections and previously occupied tiles, reporting conflicts',()=>{
  const previous=initialPosition();previous.board[7][7]={letter:'O',isBlank:false};
  const result=reconcileRecognition(previous,candidate);
  expect(result.position.board[7][7]?.letter).toBe('O');expect(result.conflicts).toHaveLength(1);
  previous.board[7][7]=null;previous.manualCells={'7,7':true};
  expect(reconcileRecognition(previous,candidate).position.board[7][7]).toBe(null);
});
it('rejects corrupt JSON before replacing editor state',()=>{
  expect(()=>parsePosition({version:1,board:[],rack:['A']})).toThrow('Invalid position');
  expect(parsePosition(initialPosition())).toEqual(initialPosition());
});
