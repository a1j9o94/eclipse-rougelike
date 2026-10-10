#!/usr/bin/env python3
"""Three original jazz auditions with different tunes, bands, harmony and grooves.

Instruments: GeneralUser GS 2.0.3 by S. Christian Collins.
https://github.com/mrbumpy409/GeneralUser-GS
See generaluser-gs/documentation/LICENSE.txt for the sample-bank license.
No melodies or recordings from Cowboy Bebop are used.
Requires numpy, scipy, tinysoundfont and ffmpeg/ffprobe.
"""
from pathlib import Path
import json
import math
import subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile
import tinysoundfont

ROOT=Path(__file__).resolve().parent
import os
FONT=Path(os.environ['HYPERSPACE_SOUNDFONT'])
SR=44100
RNG=np.random.default_rng(202610091915)

class Band:
    def __init__(self,bpm,bars,swing):
        self.beat=60/bpm; self.bars=bars; self.swing=swing
        self.duration=bars*4*self.beat+3.2
        self.events=[]; self.parts={}

    def part(self,name,program,volume=100,pan=64,drums=False):
        self.parts[name]=(program,volume,pan,drums)

    def position(self,beat):
        # Swing only eighths; sixteenths retain their own funk/Latin placements.
        whole=math.floor(beat); fraction=beat-whole
        return whole+(self.swing if abs(fraction-.5)<1e-8 else fraction)

    def note(self,part,beat,note,length=.4,velocity=80,humanize=True):
        start=self.position(beat)*self.beat
        if humanize: start+=float(RNG.uniform(-.005,.007))
        start=max(0,start)
        end=start+length*self.beat
        vel=int(np.clip(velocity+RNG.integers(-4,5),1,127))
        self.events.extend([(start,1,part,note,vel),(end,0,part,note,0)])

    def chord(self,part,beat,notes,length=.5,velocity=70):
        for i,note in enumerate(notes):
            self.note(part,beat+i*.008,note,length,velocity-i)

    def render_part(self,name):
        program,volume,pan,drums=self.parts[name]
        synth=tinysoundfont.Synth(gain=-10,samplerate=SR)
        sf=synth.sfload(str(FONT))
        synth.program_select(0,sf,128 if drums else 0,program,is_drums=drums)
        synth.control_change(0,7,volume)
        synth.control_change(0,10,pan)
        events=sorted(e for e in self.events if e[2]==name)
        end=math.ceil(self.duration*SR); audio=np.zeros((end,2),dtype=np.float32)
        cursor=0
        for at,kind,_,note,velocity in events:
            target=min(end,max(cursor,round(at*SR)))
            if target>cursor:
                audio[cursor:target]=np.frombuffer(synth.generate_simple(target-cursor),dtype=np.float32).reshape(-1,2)
                cursor=target
            if kind: assert synth.noteon(0,note,velocity)
            else: synth.noteoff(0,note)
        if cursor<end:
            audio[cursor:]=np.frombuffer(synth.generate_simple(end-cursor),dtype=np.float32).reshape(-1,2)
        synth.sounds_off(0)
        return audio

def room(x,decay=.8):
    dry=signal.sosfilt(signal.butter(2,[350,6500],btype='band',fs=SR,output='sos'),x,axis=0)
    wet=np.zeros_like(x)
    for seconds in [.031,.043,.053,.069]:
        delay=round(seconds*SR); gain=10**(-3*seconds/decay)
        reflections=np.zeros_like(x); reflections[:delay]=dry[:delay]
        for start in range(delay,len(x),delay):
            end=min(len(x),start+delay)
            reflections[start:end]=dry[start:end]+gain*reflections[start-delay:end-delay]
        wet+=reflections/4
    return wet

def echo(x,beat,amount):
    output=np.zeros_like(x)
    for index,level in enumerate([.25,.10,.035]):
        delay=round(beat*.75*(index+1)*SR)
        output[delay:]+=x[:-delay,::-1]*level*amount
    return signal.sosfilt(signal.butter(2,4500,fs=SR,output='sos'),output,axis=0)

def percussion(band,bar,style):
    at=4*bar
    if style=='latin':
        for p in [0,1.5,2.5]:band.note('drums',at+p,36,.12,83 if p==0 else 65)
        for p in [1,3]:band.note('drums',at+p,38,.12,86)
        for i in range(8):
            band.note('drums',at+i*.5,51,.18,68 if i%2==0 else 44)
        for p,n in [(0,60),(.75,61),(1.5,60),(2.25,61),(3.5,60)]:
            band.note('drums',at+p,n,.15,54)
        if bar%4==3:
            for p,n,v in [(3,38,82),(3.5,48,74),(3.75,45,86)]:band.note('drums',at+p,n,.14,v)
        if bar in [2,10,18]:band.note('drums',at,49,.35,69)
    elif style=='swing':
        for p in [0,2]:band.note('drums',at+p,36,.18,49)
        for p in [1,3]:band.note('drums',at+p,38,.20,48)
        for p in [0,1,1.5,2,3,3.5]:band.note('drums',at+p,51,.22,54 if p%1==0 else 36)
        for p in [1,3]:band.note('drums',at+p,44,.15,39)
        if bar%4==3:
            band.note('drums',at+2.5,38,.18,32)
            band.note('drums',at+3.5,38,.20,40)
    elif style=='funk':
        kick=[0,.75,2,2.75] if bar%2==0 else [0,1.75,2.5,3.5]
        for p in kick:band.note('drums',at+p,36,.14,93 if p in [0,2] else 74)
        for p in [1,3]:band.note('drums',at+p,38,.14,103)
        for p in [1.75,2.25,3.75]:band.note('drums',at+p,38,.09,34)
        for i in range(16):
            band.note('drums',at+i*.25,46 if i==14 and bar%2 else 42,.1,60 if i%4==0 else 35 if i%2 else 48)
        for p,n in [(.5,69),(1.5,70),(2.5,69),(3.5,70)]:band.note('drums',at+p,n,.12,44)
        if bar%4==3:
            for p,n,v in [(3.25,48,72),(3.5,47,77),(3.75,45,86)]:band.note('drums',at+p,n,.14,v)
        if bar in [0,8,16]:band.note('drums',at,49,.4,65)

def hyperspace_chase():
    band=Band(126,20,.51)
    for args in [('bass',33,118,62),('clav',7,88,34),('rhodes',4,74,87),('guitar',27,77,99),('sax',66,99,53),('brass',61,62,79),('drums',0,108,64,True)]:band.part(*args)
    # E minor jazz-funk; independent riff, rests, octave bass and call-and-response.
    em=(28,[55,62,66,71]); c9=(36,[52,58,62,67]); fs=(30,[58,64,67,69]); b7=(35,[57,63,66,69]); am=(33,[55,60,64,71]); d9=(38,[54,60,64,69])
    changes=[em,em,c9,b7,em,am,fs,b7,am,d9,em,em,c9,c9,fs,b7,em,c9,am,b7]
    riff=[[(0,64,.55),(.75,67,.32),(1.5,69,.4),(2.5,71,.65),(3.5,67,.3)],
          [(.5,66,.35),(1.25,64,.35),(2,62,.65),(3.25,64,.45)],
          [(0,67,.7),(1.5,70,.35),(2.25,74,.45),(3.25,72,.45)],
          [(.5,66,.4),(1.25,69,.4),(2,63,.6),(3.25,66,.45)]]
    solo=[[(.5,72,.5),(1.5,71,.3),(2.25,67,.5),(3.25,64,.45)],
          [(0,66,.6),(1,69,.35),(1.75,72,.45),(2.75,74,.7)],
          [(.5,76,.6),(1.5,74,.35),(2.25,71,.55),(3.25,67,.4)],
          [(0,66,.35),(.75,67,.35),(1.5,71,.6),(2.75,74,.7)]]
    for bar,(root,chord) in enumerate(changes):
        at=4*bar; percussion(band,bar,'funk')
        third=3 if root in [28,33] else 4
        for p,n,d,v in [(0,root,.58,94),(.75,root+12,.25,82),(1.5,root+7,.35,88),(2,root,.49,97),(2.75,root+third,.24,78),(3.5,root+12,.28,84)]:band.note('bass',at+p,n,d,v)
        for p in [.25,1.5,2.75,3.5]:band.chord('clav',at+p,[chord[0],chord[2],chord[3]],.22,75 if p==1.5 else 66)
        for p in [0,2.5]:band.chord('rhodes',at+p,chord,.9,68)
        for p in [.5,1.25,2.25,3.75]:band.chord('guitar',at+p,[chord[1],chord[2],chord[3]],.12,67)
        if bar>=2:
            melody=solo[bar%4] if 8<=bar<12 else riff[bar%4]
            for p,n,d in melody:band.note('sax',at+p,n,d,92 if d>.5 else 84)
        if bar%4==3:
            band.chord('brass',at+2.5,[chord[0]+12,chord[2]+12,chord[3]+12],.36,78)
            band.chord('brass',at+3.5,[chord[0]+12,chord[2]+12],.29,73)
    return band


if __name__=='__main__':
    # Advance the original audition's random sequence to retain its performance.
    for _ in range(1373):
        RNG.uniform(-.005,.007); RNG.integers(-4,5)
    band=hyperspace_chase()
    ratio=126/120
    band.beat=60/120
    band.duration=40+3.2
    band.events=[(at*ratio,kind,part,note,velocity) for at,kind,part,note,velocity in band.events]
    tracks={name:band.render_part(name) for name in band.parts}
    pitched=sum(track for name,track in tracks.items() if name not in ['bass','drums'])
    audio=sum(tracks.values())+room(pitched,.48)*.11+echo(tracks['sax'],band.beat,.16)
    frames=40*SR
    loop=audio[:frames].copy()
    loop[:len(audio)-frames]+=audio[frames:]
    loop-=np.mean(loop,axis=0)
    # Tiny de-click ramps retain the full bar count and continuous musical tails.
    count=round(.001*SR)
    boundary=(loop[0]+loop[-1])*.5
    weight=np.linspace(0,1,count)[:,None]
    loop[:count]=boundary*(1-weight)+loop[:count]*weight
    loop[-count:]=loop[-count:]*(1-weight)+boundary*weight
    assert np.isfinite(loop).all()
    loop*=.85/np.max(np.abs(loop))
    target=ROOT.parents[1]/'src/second-dawn-game/sound/assets'
    target.mkdir(parents=True,exist_ok=True)
    wav=ROOT/'hyperspace-chase-loop.wav'
    wavfile.write(wav,SR,(loop*32767).astype(np.int16))
    result=subprocess.run(['ffmpeg','-hide_banner','-i',str(wav),'-af','loudnorm=I=-19:TP=-1.5:LRA=10:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
    metrics=json.loads(result[result.rfind('{'):result.rfind('}')+1])
    gain=-19-float(metrics['input_i'])
    staged=target/'hyperspace-chase-120.rendering.mp3'
    final=target/'hyperspace-chase-120.mp3'
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-af',f'volume={gain}dB','-ar','44100','-c:a','libmp3lame','-b:a','160k','-metadata','title=Hyperspace Chase','-metadata','artist=Eclipse original soundtrack',str(staged)],check=True)
    raw=subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(staged),'-f','f32le','-acodec','pcm_f32le','-'],capture_output=True,check=True).stdout
    decoded=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
    assert len(decoded)==frames and np.max(np.abs(decoded))<.99
    jump=float(np.max(np.abs(decoded[0]-decoded[-1])))
    assert jump<.025
    staged.replace(final)
    print(json.dumps({'file':str(final),'seconds':40,'bars':20,'bpm':120,'bytes':final.stat().st_size,'decoded_seam_jump':jump,'peak':float(np.max(np.abs(decoded)))}))
