# Songs / Scenes / Cues

Note that unlike what you've proposed, Except for Pre, Cues are always the trigger for the next Scene, the "###" marked section indicates a cue.

And here I list all the assets used, they're all saved under the assets folder:

- samarkand-bg-blue.png
- samarkand-bg-blue-blooming.mp4
- samarkand-fg-door.png
- samarkand-fg-4dancers.mp4
- samarkand-bg-purple.png
- samarkand-bg-purple-blooming.mp4
- samarkand-bg-purple-rotate.png
- samarkand-fg-3dancers.mp4
- asalini-bg-sand.mp4
- asalini-bg-purple.mp4
- asalini-fg-ox.png
- asalini-bg-wheels-a.mp4
- asalini-bg-wheels-b.mp4
- asalini-fg-wheel.png
- asalini-bg-dark.png
- asalini-fg-monks.png
- asalini-bg-wave.mp4
- asalini-fg-swim.mp4
- yebali-bg-intro.mp4
- yebali-bg-group.mp4
- yebali-bg-cloud.png
- yebali-bg-mountains.png
- yebali-fg-birds.png
- yebali-bg-bw.png
- yebali-fg-characters.png
- yebali-bg-green.mp4
- kargyraa-bg-blue.mp4
- kargyraa-bg-green.mp4
- pagoda-bg-mist.mp4
- pagoda-bg-mountains.png

Most assets are named to be specific to a single song, but that's not a guarantee, cross song reuse of assets may occur.

Assets don't share names, even between different formats, So I'll just refer to them by there name without clarifying the format

The bpm are mostly for effects, I will specify that by stating syncing to the bpm. The videos are made already matching the bpm, if I want a playback speed change, I will specify.

Almost all videos are looped, meaning they have there ends meet, Unless specify, keep playing them in loops.

Everything keep their aspect-ratio until I specify

## Pre:

- bpm: does not apply here
- Showing samarkand-bg-blue, object-cover, static, no effects

## Song1: 撒马尔罕 Samarkand

### 开场: 当贝斯开始演奏第一个音，全曲开始的时 (0:00)

- bpm: 66
- background: samarkand-bg-blue, object-cover, static, no effects
- foreground: samarkand-fg-door, centered both vertical & horizontal, 25% width, blend mode lighten
  - opacity: from 0 at cue start -> 1 at 20 seconds from cue start, linear
  - distortion: give mild horizontal distortion to the door, make it like in a lake wave, sync the bpm

### 吉他进：吉他开始演奏乐句（1:00）

- bpm: 66
- inherit the last scene
- the background image changes hue, circling its hue in a medium range, sync with bpm
- the colours also get a bit richer (saturation up to 1.3) as the hue starts circling, like the "Color cycle" preset

### Chorus：两把吉他共同演奏和弦（2:00）

- bpm: 66
- inherit the last scene
- the door changes blend mode to normal, and becomes a koleidescope, same as the lab's "Kaleidoscope" preset:
  - the door rotates inside the koleidescope (so the pattern keeps changing), one turn every 32 beats
  - 6 mirrors
  - koleidescope at 80% size, breathing in/out ±10%, one breath every 8 beats
  - cross-fades in from the plain door in 2 seconds
- once every 4 beats, make a duplication of the background, overlay it on the original one, from opacity 0.8, from transform origin in the center, quickly scale-out, while fading its opacity to 0, at the same time rotate a bit while zooming, creating a splashing effect. Only one copy per splash, no echo copies

### 主题出现：主音吉他演奏主题（2:28）

- bpm: 66
- the foreground fades out
- the background fade-in change to samarkand-bg-blue-blooming, object cover
- keep the hue circling (and the richer colours) from 吉他进 on the video background, other background effects are reset
- this background video is not looped, so connect the loops with a 2s in advance fade-in
- lighten up the video(moving closer to #FFFFFF color) every 2 beats, until the next loop, the lighten up is reset for the next faded-in video loop

### 推进：鼓组整体进来以后（2:56）中段可加 kaleidoscope

- bpm: 76
- the previous foreground is fade out
- the new foreground samarkand-fg-4dancers fade in, centered, looping, totally Inverted, then overlayed with blendmode difference, 65% width, opacity fixed to 0.8
  - the dancers do not rotate directly: every 2 beats they copy themselves, each copy rotated 70° further than the previous one
  - every copy holds its opacity for 1 beats then fades its opacity out over 4 beats
- in a 5 seconds duartion, sync the effects speed from the previous scene to the current bpm

### 加速段落：在中间暂停之后，吉他重新加快进入 (5:08)

- bpm: 160
- everything reset
- background: samarkand-bg-purple, object full, static

### 鼓组进入：鼓组加强后进入规整节奏 (5:32)

- bpm: 160
- background change to samarkand-bg-purple-blooming, object full
- background layer2:place the samarkand-bg-purple-rotate image on the background, with 109.375% width, the bottom middle point of the image is anchored to the bottom middle point of the screen, blend-mode overlay, rotate hue sync to the bpm, and rotate the image around the bottom middle point, sync to half speed of the bpm
- the samarkand-fg-3dancers fade in, and play the following 8-beat scheme as a loop, the even loop gets mirrored left/right-wise.
  - for 6 beats, placed at the center, with width 60%, opacity 0.8, blendmode difference (the 2 duplicating beats stay lighten)
  - for 2 beats, with 100%, place at a position that's transformed X-wise for -15%, and by the gap of 100ms, use the bottom center point of the screen, create a 0.2 opacity rotated copy, every copy created is rotated by a further degree of 6.75 clockwise. a total of 8 copies are created

## Song2: 阿舍里尼 Asalini

### 开头：鼓组及悠远的吉他 (0:00)

- bpm: 74
- play the asalini-bg-sand video

### 吉他主题进入 (1:04)

- bpm: 76
- a quick switch into the asalini-bg-purple video
- slightly rotate its hue around the zero point

### 第二把吉他进入（1:29）

- bpm 76
- use the asalini-fg-ox with normal blendmode 35% width, opacity 0.6
- 4 beats a group to form a loop:
  - 1st beat, place the 17vh from the top, 0 from the right of the screen(the horizontal position here only applies for the 1st loop)
  - every next beat create a duplicated overlay, positioned at transform(-22%, 22%) (these are CSS syntax exp, so the percentage are fg image self w&h based), no extra effect is applied.
- after a loop is done, on playing the next loop, all the layers are first removed, and the loop is placed 13vw to the left of the previous loop
- after 4 loops are played, the position is reset, the next loop is played back to the position of the 1st loop, meaning the 4n + i loop is played right at the position of the ith loop,
- all placements are instant with no ease-in/out fade-in/out

### 副歌：4句人声唱完以后进入 (2:20)

- bpm: 75
- reset the background, quickly ease-out the previous ones, and play asalini-bg-wheels-b
- after 16 beats, auto fade-in to asalini-bg-wheels-a

### gong出现 (2:46)

- bpm: 75
- place asalini-fg-wheel in the center, width 41.67vw, no rotation, play the kaleidoscope effect on it the whole time

### 贝斯桥段 (3:42)

- bpm: 78
- fade-in replace the bg with asalini-bg-dark, replace the fg with asalini-fg-monks, the monks alternate: 8 beats plain, rotating 12 beats a cycle, then 8 beats kaleidoscope, one after another

### 推起：蓄力后再次进入高潮 (4:58)

- bpm: 157
- reset the scene
- play the asalini-bg-wave object-cover, at 1.5x speed, starting from its 2nd frame (the 1st frame is skipped for a cleaner loop), rotate its hue in small range
- play the asalini-fg-swim object-cover, without the first several frames where the background is white, blendmode lighten, opacity 0.7, give distortion to the layer, making a floating on water effect

## Song3: 长安西郊夜巴黎 Yebali

### Intro: 无节奏的即兴 (0:00)

bpm: does not apply
play object cover yebali-bg-intro

### 敲锣: 即兴突然变得激烈 (2:28)

bpm: does not apply
inherit previous scene
introduce exaggerate abrupt effects on the screen, like intense glitch, invert flashing, hue jumping, transforming, converting coatic, intensive emotions

### 副歌：鼓进入节奏，吉他独奏 (3:20)

bpm: 85
reset the previous scene
doing a montage loop consist of the following clips, those clips are instantly switched

- 5 beats: yebali-bg-group, play object-cover, adding random film grain and slight hue shift every time (1st loop no hue shift)
- 2 beats: yebali-bg-cloud, play object-cover, give it horizontal distortion or waving, making it having a floating feeling
- 1 beat: background a static object-cover image yebali-bg-mountains, the image of yebali-fg-birds is set to a width of 37vw, goes from out of screen (CSS position: bottom:100vh; right:0), moving swiftly in 2/3 of the beat's time (1.5x the earlier speed), in a 45deg angle torwards left-bottom, throught the screen, to out of the screen again. blend-mode darken

### 念经：鼓停止，开始念经 (5:48)

- bpm: 73
- reset the previous scene, give a cross-fade
- play object-cover yebali-bg-bw, add wave floating effects to it
- after 7 beats show with object-cover yebali-fg-characters with blendmode difference, opacity 0.3, this image contains merely 9 sparsely distributed chinese characters, apply a very coarse grained noise filter, to make the image gets partially and dynamically dimmer or brighter, so that the characters gets back-forth between unreadable / readable. the grain may need to be as large as 20vh.

### 推进：鼓再进节奏，推动最后的一段 (9:39)

- bpm: 73
- reset the previous scene
- play object-cover yebali-bg-green, introduce effects to make the scene more vivid, sync to bpm

## Song4: 喀喇昆仑 Kargyraa

### 开场：曲目开始

bpm: 64
background: switch between 2 assets, both object cover:

- 16 beats: kargyraa-bg-blue
- 16 beats: kargyraa-bg-green
- hue rotating from a very slight range, starting from 32 beats, then very slowly gradually increase the hue rotating range, make the range larger and larger, sync to bpm

## Song5: 潮气吹过后山破庙时 Misty Mountain Pagoda

### 开场：曲目开始，吉他进入 (0:00)

bpm: 64
background: pagoda-bg-cloud, object fill, plainly played

### 吉他升高八度 (2:22)

bpm: 65
fade in the pagoda-bg-mountains image, replacing the previous background, it's a very wide one, position it left/top/bottom: 0 to the screen, mirror along the middle vertical align of the screen to generate a copy, the copy is overlayed on the original image using blendmode lighten. The original image then slowly move from right to left linearly until its right side is aligned with the screen's right side, then it goes back with the same speed, forming a forth/back loop. the mirror image keeps mirroring the position of the original.
a #41BAF7 mask with opacity 0.1 is placed over them, it's hue slowly rotates back/forth
For these animations, the bpm syncing isn't required.

### 高潮：主音吉他和泛音笛的演奏愈发激烈（3:14）

bpm: 69

- inherit from the previous scene
- glitch and rgb split the mask layer, sync to the bpm
  - a complicated, streaked glitch: bands of random size and position shifted sideways, some smeared into long streaks, a few inverted, random blocks jumping off, rgb split in a random direction
  - each hit picks a random direction (mostly horizontal, sometimes vertical); the pattern changes 4 times per beat, strongest on the beat

### 低落：吉他降低八度

bpm: 65

- fade out the effects and background of the previous scene
- fade in the opening scene of the song

## Live FX (not cues)

The operator can switch these on/off at any time from the control window (keys 1–0, X = all off), on top of whatever the cues are doing. They ease in/out, follow the current bpm, and have one Amount slider.

- on the foregrounds: Spin, Pulse, Liquid, Twist, Kaleidoscope, Echo copies, Color cycle, Glitch
- on the whole screen: RGB split, Trails
