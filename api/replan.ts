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

async function handleUnstick(req: ApiRequest, res: ApiResponse) {
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
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mode = req.query?.mode || req.body?.mode;
    if (mode === 'unstick' || (req.body?.missionTitle && !req.body?.reason)) {
      return await handleUnstick(req, res);
    }

    const { reason, missedMissions, missedTasks, activeEvents, today } = req.body ?? {};
    const list = Array.isArray(missedTasks)
      ? missedTasks
      : Array.isArray(missedMissions)
        ? missedMissions
        : null;

    if (!reason || !list) {
      return res.status(400).json({ error: 'Missing reason or tasks to re-plan.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);

    const strategyMap: Record<string, string> = {
      too_big:
        'Split the missed task smaller into a tiny 5-10 minute starter step for today so it feels safe to begin.',
      exam:
        'Move non-exam tasks forward by 2-4 days (dayOffset 2-4) or shrink today’s step to a gentle 10-minute review.',
      too_tired:
        'Keep today’s step super light (5-10 min) and spread remaining items gently across the next 3 days.',
      forgot:
        'Keep the core task for today (dayOffset 0) and simplify its title and firstAction into one ultra-clear cue.',
    };

    const strategy = strategyMap[reason] || strategyMap.forgot;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_FAST_MODEL,
      contents: [
        `A student is doing a guilt-free restart after ${list.length} task(s) didn't happen.`,
        `Reason chosen: ${reason}`,
        `Re-plan rule to follow strictly: ${strategy}`,
        `Today's date: ${todayStr}`,
        `Upcoming academic deadlines: ${JSON.stringify(activeEvents ?? [])}`,
        `Tasks that didn't happen: ${JSON.stringify(
          list.map((t: any) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            estimatedMinutes: t.estimatedMinutes,
            sourceType: t.sourceType,
            sourceId: t.sourceId,
            milestoneIndex: t.milestoneIndex,
            weeklyTargetId: t.weeklyTargetId,
          }))
        )}`,
        ``,
        `Return:`,
        `1. encouragement: 1 warm, non-punitive sentence acknowledging the reason with zero guilt.`,
        `2. adjustedTasks: 1-3 re-planned tasks (starting today or moved gently out by dayOffset 0..5) with tiny estimatedMinutes (5-20) and a crystal-clear 2-minute firstAction.`,
      ].join('\n'),
      config: {
        thinkingConfig: INSTANT_THINKING_CONFIG,
        systemInstruction:
          'You are Orbit. Never shame a student for missed days. Make the restart small, kind, and specific to their blocker reason.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            encouragement: { type: Type.STRING },
            adjustedTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalTaskId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  dayOffset: { type: Type.INTEGER },
                  estimatedMinutes: { type: Type.INTEGER },
                  firstAction: { type: Type.STRING },
                },
                required: ['title', 'category', 'priority', 'dayOffset', 'estimatedMinutes', 'firstAction'],
              },
            },
          },
          required: ['encouragement', 'adjustedTasks'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const firstSource = list[0] ?? {};

    const adjustedTasks = (Array.isArray(parsed.adjustedTasks) ? parsed.adjustedTasks : []).map(
      (t: any, idx: number) => {
        const matchedOrigin =
          list.find((m: any) => m.id === t.originalTaskId) ?? list[idx] ?? firstSource;
        const baseTitle = t?.title || matchedOrigin?.title || 'Gentle restart step';
        return {
          id: `replan-${Date.now()}-${idx}`,
          title: baseTitle,
          description: matchedOrigin?.description || '',
          category: t.category || matchedOrigin?.category || 'study',
          priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
          estimatedMinutes: Math.max(5, Math.min(25, Number(t.estimatedMinutes) || 10)),
          status: 'pending',
          scheduledDate: addDaysISO(todayStr, Math.max(0, Math.min(7, Number(t.dayOffset) || 0))),
          sourceType: matchedOrigin?.sourceType || 'custom',
          sourceId: matchedOrigin?.sourceId,
          milestoneIndex: matchedOrigin?.milestoneIndex,
          weeklyTargetId: matchedOrigin?.weeklyTargetId,
          orderIndex: idx,
          firstAction:
            t.firstAction || `Open your workspace for "${baseTitle}" and write one heading.`,
        };
      }
    );

    return res.status(200).json({
      encouragement:
        parsed.encouragement || 'No streaks lost here. Let’s take one gentle step forward.',
      adjustedTasks,
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
