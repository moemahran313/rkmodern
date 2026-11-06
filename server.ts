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

  // Server-side Gemini 3.8 TTS endpoint with natural Saudi Arabic voice persona + zero-config fallback
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
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
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
          res.json({
            audioBase64: base64Audio,
            mimeType,
          });
          return;
        }
      } catch (geminiError) {
        console.warn('Gemini TTS error, using fallback MP3 TTS:', geminiError);
      }
    }

    try {
      const mp3Base64 = await synthesizeServerFallbackMp3(cleanText);
      res.json({
        audioBase64: mp3Base64,
        mimeType: 'audio/mpeg',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء توليد الصوت';
      console.error('TTS error:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
