import { GoogleGenAI } from '@google/genai';

interface VercelRequest {
  method?: string;
  body?: {
    text?: string;
    voiceGender?: 'male' | 'female';
  } | string;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: Record<string, unknown>) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: 'Missing GEMINI_API_KEY in Vercel Environment Variables',
      });
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
              text: text.trim(),
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

    if (!base64Audio) {
      res.status(502).json({ error: 'لم يتم إرجاع مقطع صوتي من النموذج' });
      return;
    }

    res.status(200).json({
      audioBase64: base64Audio,
      mimeType,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ أثناء توليد الصوت';
    console.error('Vercel TTS error:', message);
    res.status(500).json({ error: message });
  }
}
