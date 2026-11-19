import { Type } from '@google/genai';
import {
  GEMINI_FAST_MODEL,
  INSTANT_THINKING_CONFIG,
  getFriendlyError,
  getGeminiClient,
  type ApiRequest,
  type ApiResponse,
} from './_lib/gemini';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stats } = req.body ?? {};
    if (!stats || typeof stats !== 'object') {
      return res.status(400).json({ error: 'Missing local activity summary.' });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_FAST_MODEL,
      contents: [
        `Write ONE warm, practical pattern observation (1 to 2 short sentences max) based on these student activity counts:`,
        JSON.stringify(stats),
        ``,
        `Rules:`,
        `- Sound like a gentle, observant friend (e.g., "You tend to skip tasks after 9 PM, so earlier afternoon windows might feel easier.").`,
        `- NEVER give warnings, scolding, urgency, or failure language.`,
        `- If there are very few logs yet, warmly note what Orbit is starting to learn and encourage tiny steps.`,
      ].join('\n'),
      config: {
        thinkingConfig: INSTANT_THINKING_CONFIG,
        systemInstruction:
          'You are Orbit. Turn simple behavior counts into one calm, supportive insight sentence. Never warn or judge.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentence: { type: Type.STRING },
          },
          required: ['sentence'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.status(200).json({
      sentence:
        parsed.sentence ||
        'Your wins cluster around gentle 5–15 minute starts — keep picking the size that fits today’s weather.',
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
