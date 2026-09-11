import type { RecognitionResult, ScreenshotRecognizer } from './types';
import { recognitionSchema } from './schema';
/** The default provider has no network upload path. Image bytes go only to a local Worker. */
export class LocalCrossplayRecognizer implements ScreenshotRecognizer {
  private worker:Worker|null=null;
  constructor(){this.startWorker();}
  private startWorker(){
    this.worker=new Worker(new URL('../../workers/recognition.worker.ts',import.meta.url));
    this.worker.postMessage({warmup:true});
  }
  dispose(){this.worker?.terminate();this.worker=null;}
  async recognize(image:File):Promise<RecognitionResult> {
    if(image.size>20*1024*1024)throw new Error('Use an image smaller than 20 MB.');
    if(!['image/png','image/jpeg','image/webp'].includes(image.type))throw new Error('Use a PNG, JPEG, or WebP screenshot.');
    if(!this.worker)this.startWorker();
    const worker=this.worker!;
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{this.dispose();reject(new Error('Screenshot recognition timed out. You can still enter the position manually.'));},20000);
      worker.onmessage=event=>{
        clearTimeout(timeout);
        if(event.data.error){reject(new Error(event.data.error));return;}
        const parsed=recognitionSchema.safeParse(event.data.result);
        if(!parsed.success){reject(new Error('The detected image is not a valid Crossplay position. Try a full board screenshot.'));return;}
        resolve(parsed.data);
      };
      worker.onerror=()=>{clearTimeout(timeout);this.dispose();reject(new Error('Local recognition failed. You can still enter the position manually.'));};
      worker.postMessage({image});
    });
  }
}
