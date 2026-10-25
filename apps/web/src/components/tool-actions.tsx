"use client";
import {useState} from 'react';
import {Share2,Check} from 'lucide-react';
export function ToolActions(){const [message,setMessage]=useState('');async function share(){try{const url=location.href.split('?')[0];if(navigator.share)await navigator.share({title:document.title,url});else await navigator.clipboard.writeText(url);setMessage('Link ready');}catch(error){if(error instanceof DOMException&&error.name==='AbortError')return;setMessage('Copy the page URL from your address bar.')}}return <div className="tool-actions"><button type="button" onClick={share}>{message==='Link ready'?<Check size={15}/>:<Share2 size={15}/>} Share tool</button><span role="status">{message}</span></div>}
