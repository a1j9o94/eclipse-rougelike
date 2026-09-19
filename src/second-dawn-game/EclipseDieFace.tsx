import {BURST_POINTS,eclipseDieFace} from './dice3d/faces';
import {presentationColor} from './dice3d/math';
import './dice3d/dice3d.css';

/** Same printed face specification as the 3D renderer, including Rift backfire outlines. */
export default function EclipseDieFace({color,face,decorative=false}:{color:string;face:number;decorative?:boolean}) {
  const printed=eclipseDieFace(color,face);
  return <span className="dg-eclipse-die" role={decorative?undefined:'img'} aria-hidden={decorative||undefined} aria-label={decorative?undefined:printed.label} title={printed.label} style={{backgroundColor:presentationColor(color)}}>
    <svg viewBox="0 0 40 40" aria-hidden="true">
      {printed.number!==undefined&&<text x="20" y="21" textAnchor="middle" dominantBaseline="central">{printed.number}</text>}
      {printed.marks.map((mark,index)=><polygon key={index} data-mark={mark.kind} points={BURST_POINTS} transform={`translate(${mark.x} ${mark.y}) scale(${printed.marks.length>1?.76:1})`} fill={mark.kind==='backfire'?'none':'currentColor'} stroke="currentColor" strokeWidth={mark.kind==='backfire'?1.8:.6} strokeLinejoin="round"/>)}
    </svg>
  </span>;
}
