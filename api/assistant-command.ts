import { Type } from '@google/genai';
import {
  GEMINI_FAST_MODEL,
  INSTANT_THINKING_CONFIG,
  getFriendlyError,
  getGeminiClient,
  type ApiRequest,
  type ApiResponse,
} from '../lib/gemini';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      message,
      fileBase64,
      mimeType,
      history,
      context,
      today,
    } = req.body ?? {};

    const hasText = typeof message === 'string' && message.trim().length > 0;
    const hasFile = typeof fileBase64 === 'string' && fileBase64.length > 0;

    if (!hasText && !hasFile) {
      return res.status(400).json({ error: 'Type, speak, or attach a file to ask Orbit.' });
    }

    const todayStr =
      typeof today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);

    const ai = getGeminiClient();

    const recentChat = Array.isArray(history)
      ? history
          .slice(-4)
          .map((h: any) => `${h.role === 'user' ? 'Student' : 'Orbit'}: ${h.text}`)
          .join('\n')
      : '';

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
        `You are Orbit, an intelligent, calm executive-function personal assistant for a neurodivergent student.`,
        `Today's date: ${todayStr}`,
        `Student Context: ${JSON.stringify(context ?? {})}`,
        recentChat ? `Recent conversation:\n${recentChat}` : '',
        hasText ? `Student command/question: "${message.trim()}"` : 'Student attached a file/image.',
        ``,
        `Capabilities & Rules:`,
        `- Route strictly by item type:`,
        `  * WORK ITEMS (exams, assignments, homework, labs, quizzes, work tasks, coursework, reports, short-term project tasks, or anything in the "work" category) -> MUST use actionType: "add_assignment" with category: "work", kind: "exam" or "assignment", and 1-4 actionable subSteps. NEVER use "add_goal" for these.`,
        `  * OPPORTUNITIES (internships, hackathons, scholarships, fellowships, competitions) -> actionType: "add_opportunity".`,
        `  * LONG-TERM GOALS ONLY (explicit multi-month / 3-month learning tracks or "new goal", e.g., "Create a 3-month goal to learn Python") -> actionType: "add_goal".`,
        `  * "I couldn't finish yesterday's tasks" or "I have too many things to do" -> actionType: "rebalance_schedule".`,
        `  * "I have only 30 minutes today" -> actionType: "limit_today_time".`,
        `  * "Break my existing task into smaller steps" -> actionType: "breakdown_task".`,
        `  * General questions -> actionType: "none".`,
        `- Whenever your response proposes a state change (anything other than "none"), set requiresConfirmation=true and provide a clear 1-sentence confirmationSummary + structured actionPayload so the student can confirm before significant changes occur.`,
        `- Keep reply warm, concise (1-3 sentences), never shaming.`,
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
          'You are Orbit, a warm personal assistant. Strictly route all Work items (exams, assignments, homework, labs, work projects) to add_assignment with category="work", and ONLY explicit long-term multi-month goals to add_goal.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            actionType: {
              type: Type.STRING,
              description:
                'none, add_goal, add_assignment, add_opportunity, rebalance_schedule, limit_today_time, or breakdown_task',
            },
            requiresConfirmation: { type: Type.BOOLEAN },
            confirmationSummary: { type: Type.STRING },
            actionPayload: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subjectOrOrg: { type: Type.STRING },
                category: { type: Type.STRING },
                kind: { type: Type.STRING },
                date: { type: Type.STRING },
                minutesLimit: { type: Type.INTEGER },
                targetTaskId: { type: Type.STRING },
                subSteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                rescheduleNote: { type: Type.STRING },
              },
            },
          },
          required: ['reply', 'actionType', 'requiresConfirmation'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    let actionType = parsed.actionType || 'none';
    const payload = parsed.actionPayload ? { ...parsed.actionPayload } : undefined;
    const msgLower = (hasText ? message : '').toLowerCase();
    const catLower = String(payload?.category || '').toLowerCase();
    const kindLower = String(payload?.kind || '').toLowerCase();
    const isExplicitLongTermGoal = /\b(3[- ]month|long[- ]term|goal)\b/.test(msgLower) && !/\bwork\b/.test(msgLower);
    const mentionsWorkItem =
      catLower === 'work' ||
      kindLower === 'exam' ||
      kindLower === 'assignment' ||
      /\b(work|assignment|exam|midterm|final|quiz|homework|lab|submission|coursework|report)\b/.test(msgLower) ||
      (/\bproject\b/.test(msgLower) && !isExplicitLongTermGoal);

    if (
      mentionsWorkItem &&
      !isExplicitLongTermGoal &&
      (actionType === 'add_goal' || actionType === 'breakdown_task')
    ) {
      actionType = 'add_assignment';
      if (payload) {
        payload.category = 'work';
        if (!payload.kind) {
          payload.kind = /\b(exam|midterm|final|quiz|test)\b/.test(msgLower) ? 'exam' : 'assignment';
        }
      }
    }

    return res.status(200).json({
      reply: parsed.reply || 'I am right here with you. Let’s take this one step at a time.',
      actionType,
      requiresConfirmation: Boolean(parsed.requiresConfirmation && actionType !== 'none'),
      confirmationSummary: parsed.confirmationSummary || undefined,
      actionPayload: payload,
    });
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
