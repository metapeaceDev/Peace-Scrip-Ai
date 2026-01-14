import axios from 'axios';
import fs from 'fs';

function getBaseUrl() {
  const raw = process.env.INFINITETALK_URL || process.env.INFINITE_TALK_URL || '';
  return String(raw).trim().replace(/\/$/, '');
}

function getDubPath() {
  // Allow custom path for different InfiniteTalk service wrappers.
  // Default is an opinionated "adapter" path you can implement.
  return String(process.env.INFINITETALK_DUB_PATH || '/api/dub').trim();
}

async function postMultipartExpectVideo(url, form) {
  // We request arraybuffer so we can support either:
  // - JSON response (videoUrl) OR
  // - binary video response
  const response = await axios.post(url, form, {
    headers: form.getHeaders(),
    responseType: 'arraybuffer',
    timeout: Number(process.env.INFINITETALK_TIMEOUT_MS || 15 * 60_000),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: s => s >= 200 && s < 300,
  });

  const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
  const dataBuf = Buffer.isBuffer(response.data)
    ? response.data
    : Buffer.from(response.data);

  if (contentType.includes('application/json') || contentType.includes('text/json')) {
    const text = dataBuf.toString('utf8');
    const parsed = JSON.parse(text);
    return { kind: 'json', json: parsed };
  }

  return { kind: 'video', videoData: dataBuf };
}

async function fetchBinary(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: Number(process.env.INFINITETALK_TIMEOUT_MS || 15 * 60_000),
    validateStatus: s => s >= 200 && s < 300,
  });

  return Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data);
}

/**
 * Calls an external InfiniteTalk service that performs lip-sync dubbing.
 *
 * Expected contract (recommended):
 * POST {INFINITETALK_URL}{INFINITETALK_DUB_PATH} as multipart/form-data
 *   - video: mp4 file
 *   - audio: wav/mp3 file
 * Response:
 *   - Either an MP4 binary, or JSON { videoUrl: "https://..." }
 */
export async function dubWithInfiniteTalk({ videoPath, audioPath }) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'InfiniteTalk is not configured. Set INFINITETALK_URL (or INFINITE_TALK_URL) on comfyui-service.'
    );
  }

  const endpoint = `${baseUrl}${getDubPath().startsWith('/') ? '' : '/'}${getDubPath()}`;

  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('video', fs.createReadStream(videoPath), {
    filename: 'input.mp4',
    contentType: 'video/mp4',
  });
  form.append('audio', fs.createReadStream(audioPath), {
    filename: 'audio',
  });

  const result = await postMultipartExpectVideo(endpoint, form);

  if (result.kind === 'video') {
    return {
      videoData: result.videoData,
      filename: `infiniteTalk-${Date.now()}.mp4`,
      provider: 'infiniteTalk',
    };
  }

  // JSON mode
  const videoUrl =
    result.json?.videoUrl ||
    result.json?.data?.videoUrl ||
    result.json?.result?.videoUrl ||
    null;

  if (typeof videoUrl === 'string' && videoUrl.length > 0) {
    const videoData = await fetchBinary(videoUrl);
    return {
      videoData,
      filename: `infiniteTalk-${Date.now()}.mp4`,
      provider: 'infiniteTalk',
      upstreamVideoUrl: videoUrl,
    };
  }

  throw new Error(
    `InfiniteTalk response did not include video data or a videoUrl. Response keys: ${Object.keys(
      result.json || {}
    ).join(', ')}`
  );
}
