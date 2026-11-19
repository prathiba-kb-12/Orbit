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
    const { text, imageBase64, mimeType, today } = req.body ?? {};
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;

    if (!hasText && !hasImage) {
      return res.status(400).json({ error: 'Paste a message or upload a screenshot to extract.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);

    const ai = getGeminiClient();

    const parts: any[] = [];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/png',
          data: imageBase64,
        },
      });
    }

    parts.push({
      text: [
        `Extract any college deadlines/exams/assignments AND any internship/job application updates from this input.`,
        `Today's date is ${todayStr}. Convert relative dates to YYYY-MM-DD.`,
        `For internship status, use ONLY one of: "Applied", "Shortlisted", "Interview", "Offer", "Rejected".`,
        hasText ? `Pasted text:\n"""\n${text.trim()}\n"""` : 'Read the attached screenshot carefully.',
      ].join('\n'),
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
      config: {
        thinkingConfig: FAST_THINKING_CONFIG,
        systemInstruction:
          'Extract structured deadlines and internship status updates from student emails, LMS messages, or screenshots. Never invent items not present in the input.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            deadlines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  date: { type: Type.STRING },
                  kind: { type: Type.STRING },
                  summary: { type: Type.STRING },
                },
                required: ['title', 'date', 'kind', 'summary'],
              },
            },
            internships: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  status: { type: Type.STRING },
                  deadline: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ['company', 'role', 'status'],
              },
            },
          },
          required: ['deadlines', 'internships'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const allowedStatuses = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Rejected'];

    const deadlines = (parsed.deadlines ?? []).map((d: any) => ({
      title: d.title || 'Captured deadline',
      date: /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : todayStr,
      kind: ['exam', 'assignment', 'deadline'].includes(d.kind) ? d.kind : 'deadline',
      summary: d.summary || 'Captured from message.',
    }));

    const internships = (parsed.internships ?? []).map((i: any) => ({
      company: i.company || 'Company',
      role: i.role || 'Intern',
      status: allowedStatuses.includes(i.status) ? i.status : 'Applied',
      deadline: i.deadline && /^\d{4}-\d{2}-\d{2}$/.test(i.deadline) ? i.deadline : undefined,
      notes: i.notes || undefined,
    }));

    return res.status(200).json({ deadlines, internships });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
