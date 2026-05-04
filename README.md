# Qro 🎙️✨

**Narrate. Trim. Share.**

Qro is a premium, high-performance web tool designed for educators, creators, and professionals to instantly convert voice notes into shareable QR codes. Built with a stunning ivory-and-gold aesthetic, it combines seamless recording with a powerful built-in audio trimmer.

![Qro Preview](https://res.cloudinary.com/degbpmmp3/image/upload/v1714856000/qro_mockup.png) *(Placeholder: Update with real screenshot)*

## ✨ Features

- **🎙️ Seamless Recording**: One-tap recording with live waveform feedback.
- **✂️ Built-in Trimmer**: Precise, frame-accurate audio trimming using the Web Audio API.
- **✨ Premium UI**: A sophisticated light-mode interface with floating glassmorphism and gold accents.
- **📂 Personal Library**: Local history with the ability to rename, replay, and delete past recordings.
- **⚡ Instant QR**: Automatic upload to Cloudinary and QR code generation for instant sharing.
- **🔊 Custom Player**: Bespoke audio player with a live reactive visualizer during playback.

## 🛠️ Technology Stack

- **Frontend**: Vanilla JS, HTML5, CSS3 (with CSS Variables & Glassmorphism)
- **Audio Engine**: Web Audio API, MediaRecorder API
- **Backend**: Vercel Serverless Functions (Node.js 20)
- **Storage**: Cloudinary (Audio Storage)
- **QR Generation**: QRCode.js

## 🚀 Getting Started

### Prerequisites
- [Vercel CLI](https://vercel.com/download) (for local development)
- Cloudinary Account (for audio storage)

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/VibeCoderXD/VoiceQR-Qro.git
   ```
2. Create a `.env` file and add your Cloudinary keys:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```
3. Run the local server:
   ```bash
   node server.mjs
   ```
4. Open `http://localhost:3000`

## 📦 Deployment

This project is optimized for **Vercel Zero-Config**. Simply push to GitHub and connect your repository to Vercel. Don't forget to add your Cloudinary environment variables in the Vercel dashboard.

---

Built with ❤️ by [VibeCoderXD](https://github.com/VibeCoderXD)
