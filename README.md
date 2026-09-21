# 🔢 Number Quest 1-100

A free, browser-based counting and number-tracing game built for **Pre-K → Kindergarten** students. No installs, no accounts, no backend — just open `index.html` (or publish it with GitHub Pages) and start counting.

**Live demo:** enable GitHub Pages for this repo (steps below) and it will be at
`https://<your-username>.github.io/<repo-name>/`

## 🎮 How it works

Kids travel a winding mission map from **1 all the way to 100**. Each mission has two quick steps:

1. **Count & Match** – A friendly group of icons (stars, apples, butterflies…) appears, arranged in groups of ten so kids can see the quantity clearly. The child taps the number that matches how many they counted, out of three choices.
2. **Trace** – Once they pick the right number, it becomes a big dashed numeral. The child traces over it with a finger (touchscreen) or mouse, in free-draw mode — there's no "wrong" way to trace, so it stays encouraging for developing fine motor skills.

Finishing a mission unlocks the next one on the map, awards stars, and triggers a little confetti celebration. Progress, stars, and the sound on/off setting are all saved automatically in the browser (`localStorage`), so kids can close the tab and pick up right where they left off.

### Design choices

- **Color palette:** blue & green throughout (buttons, progress bar, mission nodes, tracing guide) — calm, high-contrast, and easy on the eyes for young children.
- **No reading required:** every instruction is also spoken aloud in English using the browser's built-in text-to-speech (Web Speech API), so pre-readers can play independently. There's a 🔊/🔇 button in the top-right corner to toggle sound.
- **No pressure tracing:** the tracing step never scores or rejects a child's drawing — it's guided practice, not a test, which is appropriate for the fine-motor stage of Pre-K/K learners.
- **Big tap targets, no timers:** buttons are large, there is no countdown or failure state, and kids can retry the multiple-choice step as many times as they like.
- **Replayable:** completed missions stay unlocked on the map so kids (or teachers) can revisit any number at any time for extra practice.

## 🗂 Project structure

```
number-quest/
├── index.html              # all screens (title, map, count, trace, complete)
├── manifest.json           # lets phones/tablets "Add to Home Screen" as an app
├── style.css               # blue/green theme, layout, animations, responsive rules
├── game.js                 # game logic: missions, map, speech, drawing, progress
├── icon-32.png             # favicon
├── icon-180.png            # Apple touch icon (iPhone/iPad home screen)
├── icon-192.png            # Android/Chrome home screen icon
├── icon-512.png            # high-res icon / splash
├── icon-512-maskable.png   # Android adaptive icon (keep content in center 80%)
├── .gitignore
└── README.md
```

All files live in the root of the repository (no subfolders), so GitHub Pages can serve `index.html` right away.

### Replacing the app icons

The `icon-*.png` files are placeholders (the turtle mascot on the blue/green gradient). To swap in your own artwork, replace those five files with new PNGs **at the exact same sizes and filenames**:

| File | Size |
|---|---|
| `icon-32.png` | 32×32 |
| `icon-180.png` | 180×180 (no transparency — iOS rounds the corners itself) |
| `icon-192.png` | 192×192 |
| `icon-512.png` | 512×512 |
| `icon-512-maskable.png` | 512×512, important content inside the center 80% (409×409) — Android crops the edges into a circle/squircle |

No code changes needed — `index.html` and `manifest.json` already point at these paths.

It's a static site — plain HTML/CSS/JS with no build step and no dependencies other than an optional Google Fonts stylesheet for the rounded kid-friendly typeface.

## 🚀 Publish it on GitHub Pages

1. Create a new repository on GitHub (e.g. `number-quest`) and push this folder to it:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick the **main** branch and the **/ (root)** folder, then **Save**.
5. Wait a minute or two — GitHub will give you a live URL like
   `https://<your-username>.github.io/<repo-name>/`.

That's it — no build tools, servers, or environment variables needed.

## 🧑‍🏫 Using it in a classroom

- Works great on tablets, Chromebooks, interactive whiteboards, or any modern browser with touch or a mouse.
- Progress is saved per-browser/per-device (not per-child-account), so for shared classroom devices you may want each child to use **Reset progress** (on the title screen) before their turn, or simply let the whole class share one running "Number Quest" streak.
- The "Hear it" button on the tracing screen lets a child repeat the number's name as many times as they need.

## 🔧 Customizing

- **Icons:** edit the `ICONS` array at the top of `game.js` to change what kids count with.
- **Colors:** all colors are CSS variables at the top of `style.css` (`--blue-*`, `--green-*`).
- **Praise phrases:** edit the `PRAISE` array in `game.js`.
- **Mission map shape:** the `COLS` array and `ROW_HEIGHT` constant in `game.js` control the zig-zag layout of the 100 mission nodes.

## 🌐 Browser support

Works in all modern evergreen browsers (Chrome, Edge, Safari, Firefox), and is laid out to work well from small phones (~320px wide) up through tablets and desktop, in portrait or landscape.

Voice narration uses the browser's built-in Web Speech API (`speechSynthesis`) — it's free and needs no setup, but its quality depends entirely on the device/browser it's running on: some (Chrome on desktop, Safari/iOS) sound quite natural, others sound flat or robotic. Number Quest automatically tries to pick the best-sounding voice available, speaks numbers as words ("twenty-one" instead of reading digits), and varies pitch/pace between excited praise and calm statements so it doesn't sound like one flat recording. There's also a voice settings panel (⚙️ icon) where a teacher can pick a different installed voice and adjust its speed/pitch by ear — the game shows a one-time tip pointing at it the first time you open the map. If speech is unavailable entirely, the game still works fully, just silently.

**Why not a higher-quality cloud voice API (ElevenLabs, Google Cloud TTS, etc.)?** GitHub Pages only serves static files — there's no server to keep an API key private, so calling a paid voice API straight from the browser would expose that key in the public page source for anyone to copy and run up charges on your account. If you'd like studio-quality narration later, the safe path is to pre-generate a fixed set of short audio clips (the 100 numbers + a handful of praise phrases) with a TTS service once, and ship those as static audio files instead of calling any API at runtime — happy to wire that up if you get access to a TTS tool and can share the audio files, or if you link a computer with broader network access.

---

Made with 💙💚 for Pre-K & Kindergarten learners.
