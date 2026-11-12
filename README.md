# Khunathi · Hydra live visuals

Live visuals for a 5-song set, built on [Hydra](https://hydra.ojack.xyz/) (hydra-synth, bundled in `vendor/`).
An operator runs the show from a control window while the visuals play fullscreen on the venue screen.

## Get it running

1. Clone (or download) this repo.
2. Download **`oasis-assets.zip`** from the [Releases](../../releases) page and unzip it into the project folder,
   so there is an `assets/` folder next to `control.html`. (The images and videos are not in git — they're too big.)
3. Start it:
   - **Mac:** double-click `start.command` (first time: right-click → Open, if macOS blocks it)
   - **Windows:** double-click `start-windows.bat` (untested)
4. The control window opens in Chrome. Click **Open output window**, put it on the projector screen and press **F**
   in it for fullscreen. Run the show from the control window: **Space** = next cue.

Nothing to install: the local server uses Perl (built into macOS) or PowerShell (built into Windows).

## Files

| | |
|---|---|
| `cues.md` | The show, song by song and cue by cue — the source the code follows |
| `js/scenes.js` | The show as code (one Hydra program per song) |
| `js/core.js` | Custom Hydra effects (blend modes, kaleidoscope, glitch, grain, …) |
| `js/engine.js` | Loads assets, runs the cue + beat clocks |
| `js/livefx.js` | Live FX buttons for improvising on top of the cues |
| `js/assets.js` | Asset names → files in `assets/` |
| `control.html` / `output.html` | Operator window / visuals window |
| `index.html` | Effects lab for trying things out |
