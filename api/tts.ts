import { GoogleGenAI } from '@google/genai';

interface VercelRequest {
  method?: string;
  body?:
    | {
        text?: string;
        voiceGender?: 'male' | 'female';
      }
    | string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: Record<string, unknown>) => void;
}

const serverAudioCache = new Map<
  string,
  { audioBase64: string; mimeType: string; isNeuralSaudi: boolean }
>();

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const parsedBody =
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const { text, voiceGender = 'male' } = parsedBody as {
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
    res.status(200).json(cached);
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const now = Date.now();

  // 1. Try Gemini 3.8 Flash TTS if API key is configured and not in rate-limit cooldown
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && now >= geminiQuotaCooldownUntil) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          apiVersion: 'v1beta',
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

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
        res.status(200).json(payload);
        return;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
        const isDailyQuota = errMsg.includes('PerDay');
        geminiQuotaCooldownUntil = Date.now() + (isDailyQuota ? 30 * 60 * 1000 : 60 * 1000);
      }
    }
  }

  // 2. Zero-config Server MP3 TTS Fallback (works on Vercel even without GEMINI_API_KEY or when quota is reached)
  try {
    const mp3Base64 = await synthesizeServerFallbackMp3(cleanText);
    res.status(200).json({
      audioBase64: mp3Base64,
      mimeType: 'audio/mpeg',
      isNeuralSaudi: false,
    });
  } catch {
    res.status(500).json({ error: 'حدث خطأ أثناء توليد الصوت' });
  }
}
