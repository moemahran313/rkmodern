import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    apiVersion: 'v1beta',
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Server-side in-memory audio cache to avoid redundant API calls & preserve quota
const serverAudioCache = new Map<
  string,
  { audioBase64: string; mimeType: string; isNeuralSaudi: boolean }
>();

// Tracks cooldown timestamp when Gemini TTS free-tier rate limit (429) is reached
let geminiQuotaCooldownUntil = 0;

function splitTextIntoChunks(text: string, maxLen = 170): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxLen) {
      if (current) chunks.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function synthesizeServerFallbackMp3(text: string): Promise<string> {
  const chunks = splitTextIntoChunks(text, 170);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      chunk
    )}&tl=ar&client=tw-ob`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) {
      throw new Error(`Fallback TTS HTTP ${res.status}`);
    }
    const arr = await res.arrayBuffer();
    buffers.push(Buffer.from(arr));
  }

  return Buffer.concat(buffers).toString('base64');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Server-side TTS endpoint with in-memory caching, quota cooldown guard, and zero-config MP3 fallback
  app.post('/api/tts', async (req, res) => {
    const { text, voiceGender = 'male' } = req.body as {
      text?: string;
      voiceGender?: 'male' | 'female';
    };

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'النص مطلوب لتحويله إلى صوت' });
      return;
    }

    const cleanText = text.trim();
    const cacheKey = `${voiceGender}::${cleanText}`;

    const cached = serverAudioCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const now = Date.now();

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && now >= geminiQuotaCooldownUntil) {
      try {
        const voiceName = voiceGender === 'female' ? 'Kore' : 'Charon';
        const stylePrompt =
          voiceGender === 'female'
            ? 'Warm, natural, human-like Saudi Arabian female university instructor from Riyadh speaking clear, friendly Saudi-accented Arabic (لهجة سعودية نجدية بيضاء طبيعية جداً ودافئة وغير آلية), conversational, encouraging, and expressive pacing'
            : 'Warm, natural, human-like Saudi Arabian male university professor from Riyadh speaking clear, friendly Saudi-accented Arabic (لهجة سعودية نجدية بيضاء طبيعية جداً وواثقة وغير آلية), conversational, engaging, and natural human pacing';

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                  speechMetadata: {
                    style: stylePrompt,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName,
                },
              },
            },
          },
        });

        const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        const base64Audio = inlineData?.data;
        const mimeType = inlineData?.mimeType || 'audio/wav';

        if (base64Audio) {
          const payload = {
            audioBase64: base64Audio,
            mimeType,
            isNeuralSaudi: true,
          };
          serverAudioCache.set(cacheKey, payload);
          res.json(payload);
          return;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          // Respect rate limit / daily quota cooldown silently without throwing server error logs
          const isDailyQuota = errMsg.includes('PerDay');
          geminiQuotaCooldownUntil = Date.now() + (isDailyQuota ? 30 * 60 * 1000 : 60 * 1000);
        }
      }
    }

    try {
      const mp3Base64 = await synthesizeServerFallbackMp3(cleanText);
      const fallbackPayload = {
        audioBase64: mp3Base64,
        mimeType: 'audio/mpeg',
        isNeuralSaudi: false,
      };
      res.json(fallbackPayload);
    } catch {
      res.status(500).json({ error: 'حدث خطأ أثناء توليد الصوت' });
    }
  });

  const httpServer = (await import('http')).createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
