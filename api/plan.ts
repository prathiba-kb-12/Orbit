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
    const { goal, currentLevel, weeklyHours, syllabus, today } = req.body ?? {};
    if (!goal || typeof goal !== 'string' || !currentLevel || typeof currentLevel !== 'string') {
      return res.status(400).json({ error: 'Please share your 3-month goal and current level.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);
    const hours = Number(weeklyHours) || 8;
    const syllabusText = typeof syllabus === 'string' ? syllabus.trim() : '';

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        `Create a gentle, realistic 3-month Orbit plan for a neurodivergent student.`,
        `Today's date: ${todayStr}`,
        `3-month goal: ${goal.trim()}`,
        `Current level: ${currentLevel.trim()}`,
        `Weekly free hours: ${hours}`,
        syllabusText
          ? `USER-PROVIDED SYLLABUS / TOPICS (CRITICAL: Break THESE exact syllabus topics into small sequential tasks—do NOT invent unrelated generic roadmap topics!):\n"""\n${syllabusText}\n"""`
          : `No detailed syllabus pasted; break "${goal.trim()}" into concrete, practical beginner-friendly steps matching their current level.`,
        ``,
        `Requirements:`,
        `- Return exactly 3 monthly milestones: index 0 (Month 1, planetName "Luna"), index 1 (Month 2, planetName "Vega"), index 2 (Month 3, planetName "Polaris").`,
        `- Set targetSteps for Month 1 (Luna) to 4, Month 2 (Vega) to 4, Month 3 (Polaris) to 4.`,
        `- Return 4 weekly targets aligned with the user's syllabus/goal.`,
        `- Return 8 tiny daily missions: the first 4 missions MUST belong to milestoneIndex 0 (Luna) for days 0..3, and the next 4 missions belong to milestoneIndex 1 (Vega) for days 4..7 so when the user finishes Luna they smoothly advance to Vega!`,
        `- Every mission MUST include:`,
        `  - short title (max 7 words) referencing the exact syllabus topic if provided`,
        `  - 2-3 ultra-concrete 2-minute starter microSteps (e.g. "Open the notes file", "Write the heading for topic 1", "Read the first paragraph")`,
        `  - 3 Brain Weather variants for the SAME task: fried (~5 min), okay (~12-15 min), lockedIn (~25 min).`,
        `- Categorize each mission as "career", "study", or "project".`,
      ].join('\n'),
      config: {
        thinkingConfig: FAST_THINKING_CONFIG,
        systemInstruction:
          'You are Orbit, a warm executive-function copilot. Never invent random generic advice when the user gives a syllabus—break down their exact syllabus topics into tiny, concrete, physical tasks.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
                  targetSteps: { type: Type.INTEGER },
                  daysFromNow: { type: Type.INTEGER },
                },
                required: [
                  'index',
                  'monthLabel',
                  'planetName',
                  'title',
                  'summary',
                  'targetSteps',
                  'daysFromNow',
                ],
              },
            },
            weeklyTargets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  milestoneIndex: { type: Type.INTEGER },
                },
                required: ['title', 'milestoneIndex'],
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
                  microSteps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
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
                required: [
                  'dayOffset',
                  'title',
                  'category',
                  'milestoneIndex',
                  'estimatedMinutes',
                  'microSteps',
                  'sizes',
                ],
              },
            },
          },
          required: ['milestones', 'weeklyTargets', 'missions'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());

    const rawMissions = Array.isArray(parsed.missions) ? parsed.missions : [];
    const lunaCount = rawMissions.filter((m: any) => Number(m.milestoneIndex) === 0).length || 4;
    const vegaCount = rawMissions.filter((m: any) => Number(m.milestoneIndex) === 1).length || 4;

    const milestones = (parsed.milestones ?? []).slice(0, 3).map((m: any, idx: number) => ({
      index: idx,
      monthLabel: m.monthLabel || `Month ${idx + 1}`,
      planetName: ['Luna', 'Vega', 'Polaris'][idx] || m.planetName,
      title: m.title,
      summary: m.summary,
      targetSteps: idx === 0 ? lunaCount : idx === 1 ? vegaCount : Math.max(3, Number(m.targetSteps) || 4),
      dueDate: addDaysISO(todayStr, Number(m.daysFromNow) || (idx + 1) * 30),
    }));

    const weeklyTargets = (parsed.weeklyTargets ?? []).slice(0, 5).map((wt: any, idx: number) => ({
      id: `wt-${Date.now()}-${idx}`,
      title: wt.title,
      milestoneIndex: Math.min(2, Math.max(0, Number(wt.milestoneIndex) || 0)),
      done: false,
    }));

    const missions = rawMissions.map((mission: any, idx: number) => {
      const cat = ['career', 'study', 'project'].includes(mission.category)
        ? mission.category
        : 'study';
      const offset = Math.max(0, Math.min(14, Number(mission.dayOffset ?? idx)));
      const microSteps = Array.isArray(mission.microSteps)
        ? mission.microSteps.slice(0, 3).map((s: any) => String(s))
        : ['Open your workspace or notes', 'Spend 2 minutes on the first small piece'];

      return {
        id: `m-${Date.now()}-${idx}`,
        title: mission.title,
        category: cat,
        milestoneIndex: Math.min(2, Math.max(0, Number(mission.milestoneIndex) || 0)),
        targetDate: addDaysISO(todayStr, offset),
        estimatedMinutes: Math.max(5, Math.min(30, Number(mission.estimatedMinutes) || 15)),
        status: 'pending',
        microSteps,
        sizes: {
          fried: {
            title: mission.sizes?.fried?.title || mission.title,
            action: mission.sizes?.fried?.action || 'Open your workspace and jot down one rough line.',
            minutes: Math.max(3, Math.min(10, Number(mission.sizes?.fried?.minutes) || 5)),
          },
          okay: {
            title: mission.sizes?.okay?.title || mission.title,
            action: mission.sizes?.okay?.action || 'Work steadily on one small piece for 15 minutes.',
            minutes: Math.max(10, Math.min(20, Number(mission.sizes?.okay?.minutes) || 15)),
          },
          lockedIn: {
            title: mission.sizes?.lockedIn?.title || mission.title,
            action:
              mission.sizes?.lockedIn?.action ||
              'Complete a focused 25-minute block and save your progress.',
            minutes: Math.max(20, Math.min(30, Number(mission.sizes?.lockedIn?.minutes) || 25)),
          },
        },
      };
    });

    return res.status(200).json({ milestones, weeklyTargets, missions });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
