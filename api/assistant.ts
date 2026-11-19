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
    const {
      message,
      history,
      activeMission,
      syllabus,
      events,
      brainWeather,
      today,
    } = req.body ?? {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Say or type what you need help with.' });
    }

    const ai = getGeminiClient();

    const conversationContext = Array.isArray(history)
      ? history
          .slice(-6)
          .map((h: any) => `${h.role === 'user' ? 'Student' : 'Orbit'}: ${h.text}`)
          .join('\n')
      : '';

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        `You are speaking directly with a neurodivergent student as their calm, responsive personal assistant.`,
        `Today's date: ${today || new Date().toISOString().slice(0, 10)}`,
        `Current Brain Weather: ${brainWeather || 'okay'}`,
        activeMission
          ? `Active mission on screen: "${activeMission.title}" (${activeMission.action})`
          : 'No active mission selected.',
        syllabus ? `Student syllabus / topics: ${syllabus}` : '',
        Array.isArray(events) && events.length > 0
          ? `Upcoming exams/assignments: ${JSON.stringify(events.slice(0, 5))}`
          : '',
        conversationContext ? `Recent chat:\n${conversationContext}` : '',
        `Student just said: "${message.trim()}"`,
        ``,
        `Instructions:`,
        `- Reply warmly and concisely (2-3 short sentences max, easy to read/listen to, zero hype).`,
        `- If the student asks to break down, clarify, shorten, or adjust their current task (or shares a specific topic from their syllabus to focus on right now), set shouldUpdateMission=true and provide updatedTitle, updatedAction, and 3 concrete 2-minute microSteps.`,
        `- Otherwise set shouldUpdateMission=false.`,
      ]
        .filter(Boolean)
        .join('\n'),
      config: {
        thinkingConfig: FAST_THINKING_CONFIG,
        systemInstruction:
          'You are Orbit, a voice-friendly, non-punitive personal executive-function assistant for neurodivergent students. Keep responses short, concrete, and grounding.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            shouldUpdateMission: { type: Type.BOOLEAN },
            updatedTitle: { type: Type.STRING },
            updatedAction: { type: Type.STRING },
            microSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['reply', 'shouldUpdateMission'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());

    return res.status(200).json({
      reply: parsed.reply || 'I am right here with you. Let’s take one tiny step together.',
      shouldUpdateMission: Boolean(parsed.shouldUpdateMission),
      updatedTitle: parsed.updatedTitle || undefined,
      updatedAction: parsed.updatedAction || undefined,
      microSteps: Array.isArray(parsed.microSteps) ? parsed.microSteps.slice(0, 3) : undefined,
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
