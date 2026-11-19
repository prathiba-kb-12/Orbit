import { Type } from '@google/genai';
import {
  GEMINI_FAST_MODEL,
  INSTANT_THINKING_CONFIG,
  getFriendlyError,
  getGeminiClient,
  type ApiRequest,
  type ApiResponse,
} from './_lib/gemini';
import { requireAuthenticatedUser } from './_lib/auth';

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(`${baseISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_WEEK_PHASES = [
  'Foundations & Core Setup',
  'Core Syntax & Building Blocks',
  'Guided Practice & Patterns',
  'Month 1 Checkpoint Review',
  'Intermediate Workflows & Data',
  'Practical Problem Solving',
  'Tools, Libraries & Integration',
  'Month 2 Mini-Build',
  'Real-World Scenarios',
  'Capstone Feature Building',
  'Testing, Polish & Edge Cases',
  'Final Capstone & Wrap-Up',
];

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireAuthenticatedUser(req, res);
  if (!caller) return;

  try {
    const { title, category, deadline, syllabus, currentLevel, today } = req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Please provide a goal title.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);
    const goalDeadline =
      typeof deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deadline)
        ? deadline
        : addDaysISO(todayStr, 90);

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: GEMINI_FAST_MODEL,
      contents: [
        `Break down this 3-month student goal into a complete, sequential 12-week roadmap.`,
        `Goal: ${title.trim()}`,
        `Category: ${category || 'study'}`,
        `Today: ${todayStr}`,
        `Deadline: ${goalDeadline}`,
        currentLevel ? `Current level: ${currentLevel}` : '',
        syllabus
          ? `Exact syllabus/topics provided (MUST distribute ALL of these topics logically across Weeks 1-12 without skipping any week):\n${syllabus}`
          : '',
        ``,
        `Strict Structure Rules:`,
        `1. Return EXACTLY 3 monthly milestones: index 0 (Month 1, Luna), index 1 (Month 2, Vega), index 2 (Month 3, Polaris).`,
        `2. Return EXACTLY 12 weeklyTargets numbered weekNumber 1 through 12:`,
        `   - Month 1 (milestoneIndex 0): Weeks 1, 2, 3, 4`,
        `   - Month 2 (milestoneIndex 1): Weeks 5, 6, 7, 8`,
        `   - Month 3 (milestoneIndex 2): Weeks 9, 10, 11, 12`,
        `3. Distribute the entire roadmap logically across ALL 12 weeks. EVERY single week (1..12) MUST have 1 to 2 concrete, small tasks (15-24 tasks total, 5-30 min each, weekNumber 1..12) with NO skipped weeks.`,
        `4. Each task must specify weekNumber (1..12), estimatedMinutes (5-30), priority (high/medium/low), and a tiny 2-minute physical firstAction.`,
      ]
        .filter(Boolean)
        .join('\n'),
      config: {
        thinkingConfig: INSTANT_THINKING_CONFIG,
        systemInstruction:
          'You are Orbit, a structured executive-function planner. Always produce 3 monthly milestones, all 12 weekly targets (1..12), and at least 1-2 logically ordered tasks in every single week from Week 1 to Week 12.',
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
                  daysFromNow: { type: Type.INTEGER },
                },
                required: ['index', 'monthLabel', 'planetName', 'title', 'summary', 'daysFromNow'],
              },
            },
            weeklyTargets: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  weekNumber: { type: Type.INTEGER },
                  milestoneIndex: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                },
                required: ['weekNumber', 'milestoneIndex', 'title'],
              },
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  weekNumber: { type: Type.INTEGER },
                  estimatedMinutes: { type: Type.INTEGER },
                  priority: { type: Type.STRING },
                  firstAction: { type: Type.STRING },
                },
                required: ['title', 'weekNumber', 'estimatedMinutes', 'priority', 'firstAction'],
              },
            },
          },
          required: ['milestones', 'weeklyTargets', 'tasks'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const goalId = `goal-${Date.now()}`;
    const goalTitle = title.trim();

    const rawMilestones = Array.isArray(parsed.milestones) ? parsed.milestones : [];
    const milestones = [0, 1, 2].map((idx) => {
      const m = rawMilestones.find((item: any) => Number(item?.index) === idx) || rawMilestones[idx] || {};
      return {
        id: `${goalId}-m-${idx}`,
        index: idx,
        monthLabel: `Month ${idx + 1}`,
        planetName: ['Luna', 'Vega', 'Polaris'][idx],
        title: m.title || `${goalTitle} — Month ${idx + 1}`,
        summary: m.summary || 'Complete weekly topics in sequence.',
        dueDate: addDaysISO(todayStr, Math.max(14, Number(m.daysFromNow) || (idx + 1) * 30)),
      };
    });

    const rawTargets = Array.isArray(parsed.weeklyTargets) ? parsed.weeklyTargets : [];
    const weeklyTargets = Array.from({ length: 12 }, (_, idx) => {
      const weekNumber = idx + 1;
      const milestoneIndex = Math.floor(idx / 4);
      const found =
        rawTargets.find((wt: any) => Number(wt?.weekNumber) === weekNumber) || rawTargets[idx];
      return {
        id: `${goalId}-wt-${weekNumber}`,
        milestoneIndex,
        weekNumber,
        title:
          (typeof found?.title === 'string' && found.title.trim()) ||
          `${milestones[milestoneIndex].title}: ${DEFAULT_WEEK_PHASES[idx]}`,
      };
    });

    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const tasksByWeek = new Map<number, any[]>();
    for (let w = 1; w <= 12; w++) {
      tasksByWeek.set(w, []);
    }

    rawTasks.forEach((t: any, idx: number) => {
      const wk = Math.min(
        12,
        Math.max(1, Number(t?.weekNumber) || ((idx % 12) + 1))
      );
      tasksByWeek.get(wk)!.push(t);
    });

    // Guarantee every week 1..12 has at least 1 concrete task
    const tasks: any[] = [];
    let orderCounter = 0;
    for (let w = 1; w <= 12; w++) {
      const wt = weeklyTargets[w - 1];
      const milestoneIndex = wt.milestoneIndex;
      const weekRawTasks = tasksByWeek.get(w) ?? [];
      const ensuredList =
        weekRawTasks.length > 0
          ? weekRawTasks
          : [
              {
                title: `Practice ${wt.title}`,
                description: `Core Week ${w} topic for ${goalTitle}`,
                estimatedMinutes: 15,
                priority: w <= 4 ? 'high' : 'medium',
                firstAction: `Open your notes for "${wt.title}" and outline 3 key points.`,
              },
            ];

      ensuredList.forEach((t: any, innerIdx: number) => {
        const dayOffset = (w - 1) * 7 + Math.min(5, innerIdx * 2);
        const taskTitle = (typeof t?.title === 'string' && t.title.trim()) || `Week ${w} practice`;
        tasks.push({
          id: `task-${Date.now()}-${orderCounter}`,
          title: taskTitle,
          description: t.description || '',
          category: ['career', 'study', 'project', 'personal'].includes(category)
            ? category
            : 'study',
          priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
          estimatedMinutes: Math.max(5, Math.min(30, Number(t.estimatedMinutes) || 15)),
          status: 'pending',
          scheduledDate: addDaysISO(todayStr, dayOffset),
          sourceType: 'goal',
          sourceId: goalId,
          milestoneIndex,
          weeklyTargetId: wt.id,
          orderIndex: orderCounter,
          firstAction:
            t.firstAction || `Open your workspace and start "${taskTitle}".`,
        });
        orderCounter += 1;
      });
    }

    return res.status(200).json({
      goal: {
        id: goalId,
        title: goalTitle,
        category: category || 'study',
        deadline: goalDeadline,
        status: 'active',
        milestones,
        weeklyTargets,
        createdAt: new Date().toISOString(),
      },
      tasks,
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
