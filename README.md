# Qro 🎙

> Record audio → Upload → Get a QR code instantly. Built for teachers.

## Features
| Feature | Tool | Cost |
|---------|------|------|
| 🎙 Record | Browser | Free |
| ☁️ Audio Storage | Cloudinary | Free (25GB) |
| 📱 QR Code | qrcode.js | Free |
| 🗂 History | localStorage (Client) | Free |
| 📤 Share | Web Share API | Free |

---

## Setup

### 1. Configure Cloudinary (Unsigned)

1.  **Create Account**: Sign up at [Cloudinary](https://cloudinary.com).
2.  **Unsigned Upload Preset**:
    *   Go to **Settings** (gear icon) → **Upload**.
    *   Scroll to **Upload presets** → **Add upload preset**.
    *   Set **Signing Mode** to **Unsigned**.
    *   **Restrict (Optional but Recommended)**:
        *   **Resource type**: Set to `video` (Cloudinary uses this for audio).
        *   **Allowed formats**: `mp3, wav, webm`.
    *   Copy the **Preset Name**.
3.  **Cloud Name**: Copy your **Cloud Name** from the Dashboard.

### 2. Clone & Configure

```bash
git clone https://github.com/YOUR_USERNAME/qro.git
cd qro
cp .env.example .env.local
# Fill in your Cloud Name and Preset Name in .env.local
```

### 3. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel
```

---

## Local Development

```bash
npm install
vercel dev
# Opens at http://localhost:3000
```

---

## Environment Variables

```
CLOUDINARY_CLOUD_NAME
CLOUDINARY_UPLOAD_PRESET
```

---

## Why this works
*   **One network call**: Record → Upload → QR. Fast and reliable.
*   **Secure**: No API keys exposed in the browser. Uses a proxy serverless function.
*   **Mobile First**: Works perfectly on mobile browsers.
*   **Persistent**: Your recordings stay in your device's library (`localStorage`).
