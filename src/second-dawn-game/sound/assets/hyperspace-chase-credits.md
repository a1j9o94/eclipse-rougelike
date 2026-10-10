# Hyperspace Chase

Original Eclipse jazz-funk arrangement selected by Adrian (audition C), 120 BPM, twenty bars / 40 seconds. Tenor sax, clean guitar, clavinet, Rhodes, finger bass and standard-kit percussion. Sampled instrument recordings are provided by GeneralUser GS 2.0.3, S. Christian Collins: https://github.com/mrbumpy409/GeneralUser-GS (source commit 684543d5e5efaef08d02be50dcda8d552478fa60). See GeneralUser-GS-LICENSE.txt.

The browser ships only the mastered recording; it does not load the SoundFont or render notes. Loop tails are folded into the opening, with a 1 ms de-click at the seam. MP3 is 160 kbps stereo, encoded by libmp3lame. Decoded length: exactly 40 seconds at 44.1 kHz. Master target: -19 LUFS.

To re-render, install numpy, scipy and tinysoundfont==0.3.7; install ffmpeg; obtain the above SoundFont revision. Run `HYPERSPACE_SOUNDFONT=/absolute/path/GeneralUser-GS.sf2 python3 tools/audio/render-hyperspace-chase.py`. The intermediate WAV is disposable and is not committed.
