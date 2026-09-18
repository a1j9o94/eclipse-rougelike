import{useEffect,useState}from'react';
export const MOBILE_LAYOUT_QUERY='(max-width: 1023px), (pointer: coarse) and (max-height: 600px)';
export function useMobileLayout():boolean{
 const[compact,setCompact]=useState(()=>typeof window!=='undefined'&&!!window.matchMedia?.(MOBILE_LAYOUT_QUERY).matches);
 useEffect(()=>{const query=window.matchMedia?.(MOBILE_LAYOUT_QUERY);if(!query)return;const update=()=>setCompact(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 return compact;
}
