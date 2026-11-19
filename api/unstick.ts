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
    const { missionTitle, action, brainWeather, syllabus } = req.body ?? {};
    if (!missionTitle || typeof missionTitle !== 'string') {
      return res.status(400).json({ error: 'Missing active task to unstick.' });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_FAST_MODEL,
      contents: [
        `A neurodivergent student clicked "I'm stuck" on this task:`,
        `Task: ${missionTitle}`,
        `Planned step: ${action || missionTitle}`,
        `Current Brain Weather: ${brainWeather || 'okay'}`,
        syllabus ? `Context: ${syllabus}` : '',
        ``,
        `Return:`,
        `1. firstPhysicalAction: ONE ultra-concrete 2-minute physical starter (under 18 words, e.g., "Open your notes app, create a blank page, and type the topic title at the top.").`,
        `2. microSteps: Exactly 3 tiny 40-second steps that fit inside a 2-minute Launch block so the task feels 100% defined.`,
      ]
        .filter(Boolean)
        .join('\n'),
      config: {
        thinkingConfig: INSTANT_THINKING_CONFIG,
        systemInstruction:
          'You help neurodivergent students overcome task paralysis with a crystal-clear, defined 2-minute physical starter and 3 tiny micro-steps.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstPhysicalAction: { type: Type.STRING },
            microSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['firstPhysicalAction', 'microSteps'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    return res.status(200).json({
      firstPhysicalAction:
        parsed.firstPhysicalAction ||
        'Open the exact folder or file you need and type a 3-word heading.',
      microSteps:
        Array.isArray(parsed.microSteps) && parsed.microSteps.length > 0
          ? parsed.microSteps.slice(0, 3)
          : [
              'Open the file or textbook to page 1.',
              'Write down one heading or question.',
              'Do just 1 tiny example or 2 sentences.',
            ],
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
