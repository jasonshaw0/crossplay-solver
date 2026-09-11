import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Crossplay Solver — find your next move',description:'An editable Crossplay board, private local screenshot recognition, and exact deterministic move generation.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>;}
