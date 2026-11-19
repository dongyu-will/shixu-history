# Prototype Instructions

## Accepted product direction

- The user wants an immersive, animated map narrative, similar to playing a video. The map is the primary surface and the time axis is a playback scrubber.
- The original screenshot is a functional and map-composition reference, not a style to copy. The user rejected the three workbench concepts; do not implement a dashboard or multi-lane workbench.
- Playback should reveal historical processes: movement, convergence, setbacks, changing decisions, or organizational change, depending on the event. The user rejected animation that consists only of camera stretching/zooming. Hold the camera steady when content is moving; avoid continuous zoom as filler. Support pause, seek, speed, and chapter jumps from one shared clock.
- The user also found the generic dot-and-line animations too simple. Use subject-specific objects and phase-specific behavior: representative crowds assemble, proposal sheets fan out and consolidate, neutral troop counters advance/stop/converge, and policy diagrams distinguish parcels, recipients, deeds and protected interests. Keep quantities and routes explicitly schematic; do not add invented tactics, insignia or territorial control for spectacle.
- Keep playback copy concise: event, date, narrative summary, and necessary controls. Place source and study detail behind the details action. Support a persistent day/night toggle across the map, controls, and reading panels.
- User confirmed the white canvas, deep navy text and vermilion emphasis direction; keep a coordinated navy night theme. Default new visits to day mode and preserve explicit saved preferences. The user also confirmed approximately 12 minutes for the entire timeline, then clarified that shorter time must not mean less content. Keep all 100 nodes and all full phase descriptions visible during playback, without truncating or summarizing them to meet the time target. Allocate time by complexity and map authored animation time to playback time in both directions. Preserve pause/seek for reading, the full segmented explanation in details, and the original PDF material.
- Preserve access to the PDF's event, conference, writing, and land-policy material through source-linked details. Use location geography as an illustrative modern basemap, not as a historical territorial reconstruction.
- The user subsequently requested that the map-source disclosure and the source-name/PDF-page/open-original row be temporarily hidden in the reading panel. Keep those two metadata blocks hidden via `SHOW_SOURCE_METADATA`; retain original text, source data, files and other content.
- The user approved the event-process direction and requested coverage of the remaining timeline. All 100 retained nodes now have storyboards. Keep full coverage when adding or editing records; `npm run test:storyboards` checks coverage, phase boundaries, source retention, and critical policy distinctions. Do not replace this with a generic camera-only fallback.
- Author each event against the retained source. Use geographical movement only for documented changes of place or explicitly labelled directions. Conceptual relationships, proposed policies, comparisons, and schematic forces must remain distinguishable from actual routes, implemented redistribution, quantities, or historical territory.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Approved 90-second sample

- User approved a causal map documentary sample covering 秋收起义、三湾改编、古田会议, with a decision moment and chapter reconstruction, preserving complete content. Route: `/?lesson=road`.
- The sample is 90 seconds of net playback, allocated 36/30/24 seconds. Reading, decisions and reconstruction are untimed. Keep the existing 100-node, 12-minute timeline available independently.
- The decision gate at 20 seconds must precede the rural-turn reveal, block chapter/slider/keyboard bypass, and explain actual history after any answer. Never animate invented counterfactual history. Hide future route/place and future-stage labels until the gate is resolved.
- Reconstruction asks for chronology and matching the three different problems. Preserve the first submission score while allowing corrections and targeted replay. Do not label immediate quiz results as mastery or proven retention.
- Keep all 12 full phase explanations and each record’s entire original text accessible in 完整内容. Source metadata remains hidden as already requested. Narration captions are additional, not replacements.
- Audio and map animations share the same clock; preserve pause, seek, rate, day/night, reduced motion and background-tab pause. Locally generated Mandarin narration can be rebuilt with `node scripts/render-lesson-audio.mjs` on macOS with Tingting and ffmpeg.

## Full-timeline voice and captions

- User deferred the exam-training redesign and requested narration and subtitles for the existing map timeline. Preserve the current scope and the 90-second sample.
- All 100 events now have additional authored Mandarin explanations in `src/narration.js`; complete phase copy and originals remain unchanged. The full audio clock stays 720 seconds, with independent voice/caption switches and persistent preferences.
- Keep audio, captions, animations, seek, next/previous, rate, detail pauses and background-tab pauses synchronized. Use the local pre-generated track as master while narration is enabled, with text-only fallback when audio is unavailable. Never queue browser speech independently of the playback clock.
- User approved replacing the complete timeline with the GPT-SoVITS v2ProPlus voice from the confirmed local audition. Keep the same 164 authored lines, 100 nodes, 303 phases, originals and 720-second clock. Do not remove words to fit time. The separate 90-second sample is unchanged.
- `npm run audio:timeline` stages the cloned track using the approved local reference; `npm run audio:publish` switches the manifest only after current content checks. Keep model/reference/profile hashes bound to `scripts/approved-voice.json`. Never upload the reference to an external voice service implicitly.
- Run `scripts/audit-cloned-voice.py` in the local voice venv. Regenerate real mismatches; record narrow ASR false positives with transcript evidence. Automatic ASR is not human listening. Rebuild and re-audit after any clip changes. Preserve the old assets and manifest backup for rollback.
- Resample BEFORE trimming by sample count; assert encoded audio is exactly 720 seconds. Check all 100 IDs, exact script text, hashes, captions, bounded tempo and actual audio length with `npm run test:narration`. Keep the AI synthesis label and disclosure. `audio:timeline:system` is an explicit fallback, not the approved default.

## Deployment & subpath compatibility

- Keep Vite assets relative (`base: './'`), use `sitePath` for retained root-relative resources, and keep navigation inside the current directory so the site works cleanly both at domain root (Vercel / Netlify) and under repository subpaths (e.g. GitHub Pages `/shixu-history/`).
- Theme initialization (`public/theme-init.js`) must remain an external same-origin script compatible with restrictive CSP headers.
- Publish only runtime assets (never bundle copyrighted PDFs, voice references, local TTS models, or raw build-time caches). Verify audio `HEAD` and HTTP `Range` (`206 Partial Content`) support so timeline seeking remains accurate across all browsers.
- Optional self-hosting templates (generic `example.com` Nginx + S3-compatible redirects) live in `deploy/README.md` and use environment variables (`S3_*` / `SHIXU_MEDIA_ORIGIN`) rather than hardcoded hosts or credentials.
