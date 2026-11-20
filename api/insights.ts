import { Type } from '@google/genai';
import {
  GEMINI_FAST_MODEL,
  INSTANT_THINKING_CONFIG,
  getFriendlyError,
  getGeminiClient,
  type ApiRequest,
  type ApiResponse,
} from '../lib/gemini.ts';

async function handleWinNote(req: ApiRequest, res: ApiResponse) {
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
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mode = req.query?.mode || req.body?.mode;
    if (mode === 'win-note' || (req.body?.missionTitle && !req.body?.stats)) {
      return await handleWinNote(req, res);
    }

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
