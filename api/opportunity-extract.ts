import { Type } from '@google/genai';
import {
  GEMINI_FAST_MODEL,
  INSTANT_THINKING_CONFIG,
  getFriendlyError,
  getGeminiClient,
  type ApiRequest,
  type ApiResponse,
} from '../lib/gemini.ts';

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(`${baseISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, fileBase64, mimeType, today } = req.body ?? {};
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasFile = typeof fileBase64 === 'string' && fileBase64.length > 0;

    if (!hasText && !hasFile) {
      return res.status(400).json({ error: 'Paste an email/message or upload a screenshot or PDF.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);

    const ai = getGeminiClient();
    const parts: any[] = [];

    if (hasFile) {
      parts.push({
        inlineData: {
          mimeType:
            typeof mimeType === 'string' && mimeType.length > 0 ? mimeType : 'image/png',
          data: fileBase64,
        },
      });
    }

    parts.push({
      text: [
        `Extract external opportunity details (internship, hackathon, course, scholarship, or competition) for user confirmation.`,
        `Today's date is ${todayStr}. Convert relative dates to YYYY-MM-DD.`,
        hasText ? `Pasted text:\n"""\n${text.trim()}\n"""` : 'Read the uploaded screenshot/PDF carefully.',
        ``,
        `Also suggest 1-2 tiny preparation tasks (5-20 min) if preparation (resume tweak, essay draft, form check) is needed.`,
      ].join('\n'),
    });

    const response = await ai.models.generateContent({
      model: GEMINI_FAST_MODEL,
      contents: { parts },
      config: {
        thinkingConfig: INSTANT_THINKING_CONFIG,
        systemInstruction:
          'Extract opportunity metadata faithfully from text or screenshots without inventing links or fake deadlines.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            organization: { type: Type.STRING },
            category: {
              type: Type.STRING,
              description: 'Internship, Hackathon, Course, Scholarship, or Competition',
            },
            applicationDeadline: { type: Type.STRING, description: 'YYYY-MM-DD' },
            eventDate: { type: Type.STRING, description: 'Optional YYYY-MM-DD' },
            registrationLink: { type: Type.STRING },
            eligibility: { type: Type.STRING },
            requirements: { type: Type.STRING },
            prepTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                  firstAction: { type: Type.STRING },
                },
                required: ['title', 'estimatedMinutes', 'firstAction'],
              },
            },
          },
          required: ['title', 'organization', 'category', 'applicationDeadline'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const allowedCats = ['Internship', 'Hackathon', 'Course', 'Scholarship', 'Competition'];
    const category = allowedCats.includes(parsed.category) ? parsed.category : 'Internship';
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(parsed.applicationDeadline)
      ? parsed.applicationDeadline
      : addDaysISO(todayStr, 10);

    return res.status(200).json({
      title: parsed.title || 'External Opportunity',
      organization: parsed.organization || 'Organization',
      category,
      applicationDeadline: deadline,
      eventDate:
        parsed.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.eventDate)
          ? parsed.eventDate
          : '',
      registrationLink: parsed.registrationLink || '',
      eligibility: parsed.eligibility || '',
      requirements: parsed.requirements || '',
      prepTasks: Array.isArray(parsed.prepTasks) ? parsed.prepTasks.slice(0, 2) : [],
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
