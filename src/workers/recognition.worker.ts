import { recognizePixels } from '../lib/vision/local';
import type { TemplateSet } from '../lib/vision/types';
let templatePromise:Promise<TemplateSet>|null=null;
function loadTemplates(){
  const basePath=process.env.NEXT_PUBLIC_BASE_PATH??'';
  templatePromise??=fetch(`${basePath}/recognition/templates.json`,{cache:'force-cache'}).then(response=>{
    if(!response.ok)throw new Error('Local recognition templates are unavailable. Reload the app while online once.');
    return response.json();
  }).catch(error=>{templatePromise=null;throw error;});
  return templatePromise;
}
self.onmessage=async(event:MessageEvent<{image?:File;warmup?:boolean}>)=>{
  if(event.data.warmup){try{await loadTemplates();}catch{/* A real import retries and reports the error. */}return;}
  try {
    const templates=await loadTemplates();
    const bitmap=await createImageBitmap(event.data.image!);
    if(bitmap.width*bitmap.height>32_000_000){bitmap.close();throw new Error('Image dimensions are too large. Use a phone screenshot.');}
    const scale=Math.min(1,1600/bitmap.width);
    const canvas=new OffscreenCanvas(Math.round(bitmap.width*scale),Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context)throw new Error('Your browser does not support local image processing.');
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    self.postMessage({result:recognizePixels(pixels,templates)});
  }catch(error){self.postMessage({error:error instanceof Error?error.message:'Local recognition failed.'});}
};
