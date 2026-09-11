export interface PixelImage { width:number; height:number; data:Uint8Array|Uint8ClampedArray }
export interface Rect { x:number; y:number; width:number; height:number }
export const RECOGNITION_REVIEW_THRESHOLD=.85;
export interface RecognizedTile {
  row:number; col:number; letter:string; isBlank:boolean; confidence:number;
  blankConfidence:number; glyph:number[]; pointGlyph:number[]; bounds:Rect;
}
export interface RecognizedRackTile {
  slot:number; letter:string; isBlank:boolean; confidence:number; glyph:number[]; bounds:Rect;
}
export interface RecognitionResult {
  provider:'local';
  board:{ detected:boolean; bounds:Rect; orientation:'upright'; complete:boolean; tiles:RecognizedTile[] };
  rack:RecognizedRackTile[];
  rackBounds:Rect|null;
  warnings:string[];
  timings:{geometryMs:number;extractionMs:number;classificationMs:number;totalMs:number};
  imageSize:{width:number;height:number};
}
export interface GlyphTemplate { label:string; pixels:number[]; source:string }
export interface TemplateSet { version:1; letters:GlyphTemplate[]; digits:GlyphTemplate[] }
export interface ScreenshotRecognizer { recognize(image:File):Promise<RecognitionResult> }
