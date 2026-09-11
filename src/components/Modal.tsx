'use client';
import {useEffect,useRef,type ReactNode} from 'react';

interface Props {
  open:boolean;
  onClose:()=>void;
  labelledBy:string;
  children:ReactNode;
  panelClassName?:string;
}

const focusable='button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({open,onClose,labelledBy,children,panelClassName=''}:Props) {
  const panel=useRef<HTMLElement>(null),lastFocused=useRef<HTMLElement|null>(null),closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose;},[onClose]);
  useEffect(()=>{
    if(!open)return;
    lastFocused.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const frame=requestAnimationFrame(()=>panel.current?.querySelector<HTMLElement>('[data-modal-close]')?.focus());
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();return;}
      if(event.key!=='Tab'||!panel.current)return;
      const items=[...panel.current.querySelectorAll<HTMLElement>(focusable)].filter(item=>item.offsetParent!==null);
      if(!items.length){event.preventDefault();panel.current.focus();return;}
      const first=items[0],last=items.at(-1)!;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keydown);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',keydown);document.body.style.overflow=previousOverflow;lastFocused.current?.focus({preventScroll:true});};
  },[open]);
  if(!open)return null;
  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section ref={panel} className={`modal-panel ${panelClassName}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>{children}</section></div>;
}
