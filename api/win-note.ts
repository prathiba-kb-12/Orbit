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
    const {
      missionTitle,
      minutes,
      milestoneTitle,
      planetName,
      nextPlanetName,
      completedCount,
      targetSteps,
      milestoneCompleted,
    } = req.body ?? {};

    if (!missionTitle) {
      return res.status(400).json({ error: 'Missing completed task details.' });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_FAST_MODEL,
      contents: [
        `A neurodivergent student just finished a step.`,
        `What they did: "${missionTitle}" (${minutes || 10} min)`,
        `Planet / Milestone: "${planetName || 'Luna'} — ${milestoneTitle || 'Milestone 1'}"`,
        `Steps finished in this planet: ${completedCount ?? 1} of ${targetSteps ?? 4}`,
        milestoneCompleted
          ? `MILESTONE COMPLETE! They just finished ALL steps of ${planetName || 'Luna'} and are moving toward ${nextPlanetName || 'the next goal'}! Start with an enthusiastic, warm "Yayy!" celebrating finishing ${planetName || 'Luna'} and smoothly pointing toward ${nextPlanetName || 'the next milestone'}.`
          : `Start with a cheerful, genuine "Yayy!" (1-2 short sentences, max 32 words) naming what they specifically did and their progress (${completedCount}/${targetSteps}) on ${planetName || 'Luna'}. Calm, encouraging, zero streaks.`,
      ].join('\n'),
      config: {
        thinkingConfig: INSTANT_THINKING_CONFIG,
        systemInstruction:
          'You are Orbit. Celebrate small wins warmly ("Yayy! ...") without loud hype, streaks, or leaderboards.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            note: { type: Type.STRING },
          },
          required: ['note'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const fallback = milestoneCompleted
      ? `Yayy! You finished every step of ${planetName || 'Luna'} (${missionTitle}) — Mission Done! Ready to orbit toward ${nextPlanetName || 'your next milestone'}.`
      : `Yayy! You finished "${missionTitle}" — that's ${completedCount ?? 1}/${targetSteps ?? 4} steps on ${planetName || 'Luna'}.`;

    return res.status(200).json({
      note: parsed.note || fallback,
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
