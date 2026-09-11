import { z } from 'zod';
const bounds=z.object({x:z.number().finite(),y:z.number().finite(),width:z.number().positive(),height:z.number().positive()});
const glyph=z.array(z.number().min(0).max(1)).max(576);
const confidence=z.number().min(0).max(1);
export const recognitionSchema=z.object({
  provider:z.literal('local'),
  board:z.object({detected:z.literal(true),bounds,orientation:z.literal('upright'),complete:z.boolean(),tiles:z.array(z.object({
    row:z.number().int().min(1).max(15),col:z.number().int().min(1).max(15),letter:z.string().regex(/^[A-Z]$/),isBlank:z.boolean(),confidence,blankConfidence:confidence,glyph,pointGlyph:glyph,bounds,
  })).max(100)}),
  rack:z.array(z.object({slot:z.number().int().min(0).max(6),letter:z.string().regex(/^[A-Z?]$/),isBlank:z.boolean(),confidence,glyph,bounds})).max(7),
  rackBounds:bounds.nullable(),warnings:z.array(z.string()),
  timings:z.object({geometryMs:z.number(),extractionMs:z.number(),classificationMs:z.number(),totalMs:z.number()}),
  imageSize:z.object({width:z.number().positive(),height:z.number().positive()}),
}).superRefine((value,ctx)=>{
  const cells=value.board.tiles.map(t=>`${t.row},${t.col}`);
  if(new Set(cells).size!==cells.length)ctx.addIssue({code:'custom',message:'Duplicate board coordinates.'});
  if(new Set(value.rack.map(t=>t.slot)).size!==value.rack.length)ctx.addIssue({code:'custom',message:'Duplicate rack slots.'});
});
