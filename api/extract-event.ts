import { Type } from '@google/genai';
import {
  FAST_THINKING_CONFIG,
  GEMINI_MODEL,
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
    const { text, today } = req.body ?? {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Please type or paste an exam or assignment note.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        `Extract the exam, assignment, or deadline from this student note.`,
        `Today's date is ${todayStr}. If a relative day is mentioned (e.g., "next Tuesday", "Friday", "in 4 days"), compute the exact YYYY-MM-DD date relative to ${todayStr}.`,
        `Note: "${text.trim()}"`,
      ].join('\n'),
      config: {
        thinkingConfig: FAST_THINKING_CONFIG,
        systemInstruction:
          'Extract academic event details cleanly into JSON. Keep summary calm and concise (max 12 words).',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING, description: 'YYYY-MM-DD format' },
            kind: { type: Type.STRING, description: 'exam, assignment, or deadline' },
            summary: { type: Type.STRING },
          },
          required: ['title', 'date', 'kind', 'summary'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : todayStr;
    const validKind = ['exam', 'assignment', 'deadline'].includes(parsed.kind)
      ? parsed.kind
      : 'exam';

    return res.status(200).json({
      title: parsed.title || 'Upcoming exam or assignment',
      date: validDate,
      kind: validKind,
      summary: parsed.summary || 'Academic focus week scheduled.',
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
