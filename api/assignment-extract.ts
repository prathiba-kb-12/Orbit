import { Type } from '@google/genai';
import {
  GEMINI_FAST_MODEL,
  INSTANT_THINKING_CONFIG,
  getFriendlyError,
  getGeminiClient,
  type ApiRequest,
  type ApiResponse,
} from '../lib/gemini';

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
    const { text, fileBase64, mimeType, fileName, today } = req.body ?? {};
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasFile = typeof fileBase64 === 'string' && fileBase64.length > 0;

    if (!hasText && !hasFile) {
      return res.status(400).json({ error: 'Paste assignment details or upload a PDF, document, or image.' });
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
            typeof mimeType === 'string' && mimeType.length > 0
              ? mimeType
              : 'application/pdf',
          data: fileBase64,
        },
      });
    }

    parts.push({
      text: [
        `Extract the academic assignment or exam details and break it into 4-6 small actionable tasks with estimated durations (5-30 min each).`,
        `Today's date is ${todayStr}. Convert relative dates to YYYY-MM-DD.`,
        fileName ? `Uploaded file name: ${fileName}` : '',
        hasText ? `Assignment/Exam text:\n"""\n${text.trim()}\n"""` : 'Read the uploaded document/image carefully.',
        ``,
        `Example task style: "Understand requirements", "Collect data", "Complete analysis", "Create visualizations", "Prepare final submission".`,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    const response = await ai.models.generateContent({
      model: GEMINI_FAST_MODEL,
      contents: { parts },
      config: {
        thinkingConfig: INSTANT_THINKING_CONFIG,
        systemInstruction:
          'Extract assignment/exam requirements accurately and break the work into realistic small steps for a student.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subject: { type: Type.STRING },
            kind: { type: Type.STRING, description: 'assignment or exam' },
            dueDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
            requirements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                  priority: { type: Type.STRING },
                  firstAction: { type: Type.STRING },
                },
                required: ['title', 'estimatedMinutes', 'priority', 'firstAction'],
              },
            },
          },
          required: ['title', 'subject', 'kind', 'dueDate', 'requirements', 'tasks'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate)
      ? parsed.dueDate
      : addDaysISO(todayStr, 7);
    const kind = parsed.kind === 'exam' ? 'exam' : 'assignment';

    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const tasks = rawTasks.map((t: any, idx: number) => ({
      title: t.title || `Step ${idx + 1}`,
      estimatedMinutes: Math.max(5, Math.min(45, Number(t.estimatedMinutes) || 15)),
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
      firstAction: t.firstAction || `Open the prompt and start "${t.title || 'step 1'}".`,
    }));

    return res.status(200).json({
      title: parsed.title || 'New Assignment',
      subject: parsed.subject || 'Coursework',
      kind,
      dueDate,
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements.slice(0, 6) : [],
      tasks,
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
