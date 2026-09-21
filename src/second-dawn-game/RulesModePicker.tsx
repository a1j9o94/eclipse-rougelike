import {useId} from 'react';
import type {RulesMode} from '../../shared/eclipse/types';
import './rulesModePicker.css';

interface RulesModePickerProps {
 value:RulesMode;
 disabled:boolean;
 onChange:(mode:RulesMode)=>void;
}
const choices = [
 {value:'standard',label:'Standard Eclipse',description:'Preset: 8 rounds · hidden discoveries and reputation.'},
 {value:'less-random-v1',label:'Régis’s Less Random',description:'Preset: 10 rounds · open technology · public discoveries and reputation.'},
] as const;

export default function RulesModePicker({value,disabled,onChange}:RulesModePickerProps){
 const id=`rules-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
 return <fieldset className="dg-rules-mode" disabled={disabled}>
  <legend>Rules preset</legend>
  <div className="dg-rules-options">{choices.map(choice=><label key={choice.value} className={value===choice.value?'is-selected':''}>
   <input type="radio" name={id} value={choice.value} checked={value===choice.value} aria-labelledby={`${id}-${choice.value}-label`} aria-describedby={`${id}-${choice.value}-description`} onClick={()=>{if(value===choice.value)onChange(choice.value);}} onChange={()=>onChange(choice.value)}/>
   <span><strong id={`${id}-${choice.value}-label`}>{choice.label}</strong><small id={`${id}-${choice.value}-description`}>{choice.description}</small></span>
  </label>)}</div>
 </fieldset>;
}
