import {useAmbientEnabled,useAmbientVolume} from '../presentationSettings';
import {prepareCosmeticAudio} from '../dice3d/audio';
import './menuMusic.css';

export default function MenuMusicControls(){
 const [enabled,setEnabled]=useAmbientEnabled(),[volume,setVolume]=useAmbientVolume();
 return <div className="dg-menu-music-controls" role="group" aria-label="Music controls">
  <button data-sound="silent" aria-label={enabled?'Mute music':'Play music'} aria-pressed={enabled} onClick={()=>{if(!enabled)void prepareCosmeticAudio();setEnabled(!enabled);}}>{enabled?'Music on':'Music off'}</button>
  <input aria-label="Music volume" aria-valuetext={`${Math.round(volume*100)} percent`} type="range" min={0} max={100} step={5} value={Math.round(volume*100)} disabled={!enabled} onChange={event=>setVolume(Number(event.target.value)/100)}/>
 </div>;
}
