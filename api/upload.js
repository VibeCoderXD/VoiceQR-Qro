// api/upload.js
// Handles audio upload to Cloudinary
// Keys are server-side only — never exposed to browser

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    // Parse multipart manually — extract file blob
    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return res.status(400).json({ error: 'No boundary found' });

    const boundaryBuffer = Buffer.from('--' + boundary);
    const parts = splitBuffer(buffer, boundaryBuffer);

    let fileBuffer = null;
    let fileName = 'recording.webm';

    for (const part of parts) {
      const headerEnd = indexOfBuffer(part, Buffer.from('\r\n\r\n'));
      if (headerEnd === -1) continue;
      const headerStr = part.slice(0, headerEnd).toString();
      const body = part.slice(headerEnd + 4);
      const trimmed = trimBuffer(body);
      if (headerStr.includes('filename=')) {
        const match = headerStr.match(/filename="([^"]+)"/);
        if (match) fileName = match[1];
        fileBuffer = trimmed;
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file found in request' });

    // Upload to Cloudinary
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }

    const FormData = (await import('form-data')).default;
    const fetch = (await import('node-fetch')).default;

    const form = new FormData();
    form.append('file', fileBuffer, { filename: fileName, contentType: 'audio/webm' });
    form.append('upload_preset', uploadPreset);
    form.append('resource_type', 'video');

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
      { method: 'POST', body: form }
    );

    const data = await cloudRes.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');

    return res.status(200).json({ url: data.secure_url, publicId: data.public_id });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let idx;
  while ((idx = indexOfBuffer(buf, delimiter, start)) !== -1) {
    parts.push(buf.slice(start, idx));
    start = idx + delimiter.length;
  }
  parts.push(buf.slice(start));
  return parts.filter(p => p.length > 4);
}

function indexOfBuffer(buf, search, offset = 0) {
  for (let i = offset; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

function trimBuffer(buf) {
  let start = 0, end = buf.length;
  while (start < end && (buf[start] === 13 || buf[start] === 10)) start++;
  while (end > start && (buf[end - 1] === 13 || buf[end - 1] === 10)) end--;
  return buf.slice(start, end);
}
