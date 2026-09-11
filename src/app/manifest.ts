import type {MetadataRoute} from 'next';

export const dynamic = 'force-static';

export default function manifest():MetadataRoute.Manifest {
  const basePath=process.env.NEXT_PUBLIC_BASE_PATH??'';
  return {
    name:'Crossplay Solver',short_name:'Crossplay Solver',
    description:'Private local screenshot recognition and exact deterministic move generation for Crossplay positions.',
    start_url:`${basePath}/`,scope:`${basePath}/`,display:'standalone',background_color:'#fafbf7',theme_color:'#275d4b',
    icons:[{src:`${basePath}/icon.svg`,sizes:'any',type:'image/svg+xml'}],
  };
}
