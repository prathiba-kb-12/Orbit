import { Type } from '@google/genai';
import {
  FAST_THINKING_CONFIG,
  GEMINI_MODEL,
  getFriendlyError,
  getGeminiClient,
  type ApiRequest,
  type ApiResponse,
} from './_lib/gemini';

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
    const {
      message,
      imageBase64,
      mimeType,
      history,
      tracks,
      activeMission,
      events,
      brainWeather,
      today,
    } = req.body ?? {};

    const hasText = typeof message === 'string' && message.trim().length > 0;
    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0;

    if (!hasText && !hasImage) {
      return res.status(400).json({ error: 'Type, speak, or attach an image to talk to Orbit.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);

    const ai = getGeminiClient();

    const conversationContext = Array.isArray(history)
      ? history
          .slice(-4)
          .map((h: any) => `${h.role === 'user' ? 'Student' : 'Orbit'}: ${h.text}`)
          .join('\n')
      : '';

    const tracksSummary = Array.isArray(tracks) && tracks.length > 0
      ? tracks.map((t: any) => `- ${t.title}: ${t.completedSteps}/${t.totalSteps} done`).join('\n')
      : 'None yet.';

    const parts: any[] = [];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType:
            typeof mimeType === 'string' && mimeType.startsWith('image/')
              ? mimeType
              : 'image/png',
          data: imageBase64,
        },
      });
    }

    parts.push({
      text: [
        `You are Orbit, a fast, calm Gemini-style executive-function copilot for a student.`,
        `Today's date: ${todayStr}`,
        `Brain Weather: ${brainWeather || 'okay'}`,
        `Existing tracked Goal Cards:\n${tracksSummary}`,
        `Upcoming exams/assignments: ${JSON.stringify(Array.isArray(events) ? events.slice(0, 6) : [])}`,
        activeMission
          ? `Current 2-min focus mission: "${activeMission.title}" (${activeMission.action})`
          : `No active mission yet.`,
        conversationContext ? `Recent chat:\n${conversationContext}` : '',
        hasText ? `Student message: "${message.trim()}"` : 'Student attached an image without text.',
        ``,
        `Decide the ONE primary intent ("new_goal", "add_event", or "chat") and return JSON:`,
        `1) "new_goal": When the student gives a 3-month goal, subject, syllabus, or attaches a roadmap/syllabus image. Create ONE Goal Track Card ("trackTitle", 2-5 words; "goalSummary", 1 sentence), 3 monthly milestones ("Luna", "Vega", "Polaris"), and 5-6 tiny sequential missions (5-30 min) strictly broken down from their roadmap/image (or thoughtfully structured if they only gave a goal name). Every mission needs "microSteps" (3 concrete 2-minute steps) and "sizes" (fried, okay, lockedIn).`,
        `2) "add_event": When the student drops an exam, quiz, assignment, or deadline (text or image). Extract "eventTitle", "eventDate" (YYYY-MM-DD), "eventKind" ("exam" | "assignment" | "deadline"), "eventSummary", and optionally 1 tiny prep mission ("prepMission") for today/tomorrow so their timetable updates right away.`,
        `3) "chat": For questions, overwhelm, asking to shrink/clarify the current task, or general check-ins. Give a short, warm "reply" (1-3 sentences). If they asked to adjust/clarify/shrink the current task, set "shouldUpdateMission": true and supply "updatedTitle", "updatedAction", and 3 concrete "updatedMicroSteps".`,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
      config: {
        thinkingConfig: FAST_THINKING_CONFIG,
        systemInstruction:
          'You are Orbit. Be concise, calm, and practical. If the user provides a roadmap or syllabus image/text, extract and break down THEIR exact items instead of inventing random topics.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING, description: 'new_goal, add_event, or chat' },
            reply: { type: Type.STRING },
            trackTitle: { type: Type.STRING },
            goalSummary: { type: Type.STRING },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.INTEGER },
                  monthLabel: { type: Type.STRING },
                  planetName: { type: Type.STRING },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  daysFromNow: { type: Type.INTEGER },
                },
                required: ['index', 'monthLabel', 'planetName', 'title', 'summary', 'daysFromNow'],
              },
            },
            missions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayOffset: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  category: { type: Type.STRING },
                  milestoneIndex: { type: Type.INTEGER },
                  estimatedMinutes: { type: Type.INTEGER },
                  microSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sizes: {
                    type: Type.OBJECT,
                    properties: {
                      fried: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          action: { type: Type.STRING },
                          minutes: { type: Type.INTEGER },
                        },
                        required: ['title', 'action', 'minutes'],
                      },
                      okay: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          action: { type: Type.STRING },
                          minutes: { type: Type.INTEGER },
                        },
                        required: ['title', 'action', 'minutes'],
                      },
                      lockedIn: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          action: { type: Type.STRING },
                          minutes: { type: Type.INTEGER },
                        },
                        required: ['title', 'action', 'minutes'],
                      },
                    },
                    required: ['fried', 'okay', 'lockedIn'],
                  },
                },
                required: ['dayOffset', 'title', 'category', 'milestoneIndex', 'estimatedMinutes', 'microSteps', 'sizes'],
              },
            },
            eventTitle: { type: Type.STRING },
            eventDate: { type: Type.STRING },
            eventKind: { type: Type.STRING },
            eventSummary: { type: Type.STRING },
            shouldUpdateMission: { type: Type.BOOLEAN },
            updatedTitle: { type: Type.STRING },
            updatedAction: { type: Type.STRING },
            updatedMicroSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['intent', 'reply'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const intent = ['new_goal', 'add_event', 'chat'].includes(parsed.intent)
      ? parsed.intent
      : 'chat';

    const normalizeMission = (m: any, idx: number, trackId: string, trackTitle: string) => {
      const cat = ['career', 'study', 'project'].includes(m?.category) ? m.category : 'study';
      const offset = Math.max(0, Math.min(21, Number(m?.dayOffset ?? idx)));
      const baseTitle = m?.title || `Step ${idx + 1}`;
      return {
        id: `m-${Date.now()}-${idx}`,
        trackId,
        trackTitle,
        title: baseTitle,
        category: cat,
        milestoneIndex: Math.min(2, Math.max(0, Number(m?.milestoneIndex) || 0)),
        targetDate: addDaysISO(todayStr, offset),
        estimatedMinutes: Math.max(5, Math.min(30, Number(m?.estimatedMinutes) || 15)),
        status: 'pending',
        microSteps:
          Array.isArray(m?.microSteps) && m.microSteps.length > 0
            ? m.microSteps.slice(0, 3).map(String)
            : [
                `Open your workspace for "${baseTitle}"`,
                'Read or outline the first 2 lines',
                'Save your starter note',
              ],
        sizes: {
          fried: {
            title: m?.sizes?.fried?.title || baseTitle,
            action: m?.sizes?.fried?.action || 'Open your notes and spend 5 calm minutes.',
            minutes: Math.max(3, Math.min(10, Number(m?.sizes?.fried?.minutes) || 5)),
          },
          okay: {
            title: m?.sizes?.okay?.title || baseTitle,
            action: m?.sizes?.okay?.action || 'Complete one steady 15-minute block.',
            minutes: Math.max(10, Math.min(20, Number(m?.sizes?.okay?.minutes) || 15)),
          },
          lockedIn: {
            title: m?.sizes?.lockedIn?.title || baseTitle,
            action: m?.sizes?.lockedIn?.action || 'Focus for 25 minutes and wrap up one section.',
            minutes: Math.max(20, Math.min(30, Number(m?.sizes?.lockedIn?.minutes) || 25)),
          },
        },
      };
    };

    if (intent === 'new_goal') {
      const trackId = `track-${Date.now()}`;
      const trackTitle = parsed.trackTitle || (hasText ? message.trim().slice(0, 36) : 'Study Track');
      const rawMissions = Array.isArray(parsed.missions) ? parsed.missions : [];
      const missions = rawMissions.map((m: any, idx: number) =>
        normalizeMission(m, idx, trackId, trackTitle)
      );

      const lunaCount = missions.filter((m: any) => m.milestoneIndex === 0).length || Math.min(3, missions.length) || 3;
      const vegaCount = missions.filter((m: any) => m.milestoneIndex === 1).length || 2;

      const rawMilestones = Array.isArray(parsed.milestones) ? parsed.milestones : [];
      const milestones = [0, 1, 2].map((idx) => {
        const m = rawMilestones[idx] || {};
        return {
          index: idx,
          monthLabel: m.monthLabel || `Month ${idx + 1}`,
          planetName: ['Luna', 'Vega', 'Polaris'][idx],
          title: m.title || `${trackTitle} — Phase ${idx + 1}`,
          summary: m.summary || 'Break down and complete core steps gently.',
          targetSteps: idx === 0 ? lunaCount : idx === 1 ? vegaCount : 3,
          dueDate: addDaysISO(todayStr, Number(m.daysFromNow) || (idx + 1) * 30),
        };
      });

      return res.status(200).json({
        intent: 'new_goal',
        reply: parsed.reply || `Added "${trackTitle}" as a tracked goal card and scheduled your next tiny steps.`,
        track: {
          id: trackId,
          title: trackTitle,
          goalSummary: parsed.goalSummary || trackTitle,
          milestones,
          sourceType: hasImage && hasText ? 'prompt+image' : hasImage ? 'image' : 'prompt',
          createdAt: new Date().toISOString(),
        },
        missions,
      });
    }

    if (intent === 'add_event') {
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.eventDate) ? parsed.eventDate : todayStr;
      const validKind = ['exam', 'assignment', 'deadline'].includes(parsed.eventKind)
        ? parsed.eventKind
        : 'exam';

      return res.status(200).json({
        intent: 'add_event',
        reply:
          parsed.reply ||
          `Added "${parsed.eventTitle || 'Deadline'}" for ${validDate} and updated your timetable.`,
        event: {
          title: parsed.eventTitle || 'Upcoming exam or assignment',
          date: validDate,
          kind: validKind,
          summary: parsed.eventSummary || 'Timetable adjusted around this deadline.',
        },
      });
    }

    return res.status(200).json({
      intent: 'chat',
      reply: parsed.reply || 'I am right here with you. Let’s start with one 2-minute step.',
      shouldUpdateMission: Boolean(parsed.shouldUpdateMission),
      updatedTitle: parsed.updatedTitle || undefined,
      updatedAction: parsed.updatedAction || undefined,
      updatedMicroSteps: Array.isArray(parsed.updatedMicroSteps)
        ? parsed.updatedMicroSteps.slice(0, 3).map(String)
        : undefined,
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
