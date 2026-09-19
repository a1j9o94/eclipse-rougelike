import { AI_DIFFICULTY_LABELS, type AiDifficulty } from '../../shared/eclipse/aiConfig';
import './aiDifficulty.css';
const choices: readonly {id:AiDifficulty; detail:string; timing:string; bars:number}[] = [
 {id:'normal',detail:'Coordinated fleets and purposeful expansion',timing:'Fast · up to ½ second thinking',bars:1},
 {id:'hard',detail:'Looks further ahead for stronger plans',timing:'Up to 3 seconds per action',bars:2},
 {id:'expert',detail:'Examines more competing plans',timing:'Up to 30 seconds per action',bars:3},
];
export default function AiDifficultyPicker({value,onChange,disabled=false}:{value:AiDifficulty;onChange:(difficulty:AiDifficulty)=>void;disabled?:boolean}) {
 return <fieldset className="dg-ai-difficulty" disabled={disabled}><legend>AI difficulty</legend><div className="dg-ai-difficulty-options">{choices.map(choice=><button type="button" key={choice.id} aria-pressed={value===choice.id} onClick={()=>onChange(choice.id)}><span className="dg-ai-difficulty-title"><svg viewBox="0 0 24 24" aria-hidden="true">{[0,1,2].map(i=><rect key={i} x={2+i*8} y={16-i*6} width="5" height={6+i*6} opacity={i<choice.bars?1:.2}/>)}</svg><strong>{AI_DIFFICULTY_LABELS[choice.id]}</strong></span><span>{choice.detail}</span><small>{choice.timing}</small></button>)}</div><p>Same rules and public information. Thinking happens on the server.</p>{value==='expert'&&<p>Several Expert opponents can add a longer wait between your turns.</p>}</fieldset>;
}
