/** The printed opening and its connected states use the same edge bars on tiles and cards. */
export default function WormholeMark({kind='printed'}:{kind?:'printed'|'wormhole'|'generator'}){
 const color=kind==='printed'?'currentColor':kind==='generator'?'#8cd8e5':'#efca77';
 return <g data-wormhole-mark={kind}>
  <path d="M0 -11V11" stroke="#0b1822" strokeWidth="6"/>
  <path className={kind==='printed'?'dg-wormhole-opening':'dg-wormhole-connected'} d="M0 -11V11" fill="none" stroke={color} strokeWidth={kind==='printed'?3:4} strokeDasharray={kind==='printed'?'1 4':kind==='generator'?'5 3':undefined} strokeLinecap="round"/>
  <path d="M-4 -12H3 M-4 12H3" fill="none" stroke={color} strokeWidth="2"/>
 </g>;
}
