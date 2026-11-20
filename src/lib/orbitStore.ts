import type {
  Assignment,
  BrainWeather,
  Goal,
  Opportunity,
  OrbitState,
  OrbitTask,
} from '../types';

export const STORAGE_KEY = 'orbit_copilot_state_v2';
const LEGACY_STORAGE_KEY = 'orbit_copilot_state_v1';

export function getUserStorageKey(uid?: string): string {
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysISO(baseISO: string, days: number): string {
  const safeBase = /^\d{4}-\d{2}-\d{2}$/.test(baseISO) ? baseISO : getTodayISO();
  const d = new Date(`${safeBase}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetweenISO(fromISO: string, toISO: string): number {
  const safeFrom = /^\d{4}-\d{2}-\d{2}$/.test(fromISO) ? fromISO : getTodayISO();
  const safeTo = /^\d{4}-\d{2}-\d{2}$/.test(toISO) ? toISO : getTodayISO();
  const from = new Date(`${safeFrom}T00:00:00Z`).getTime();
  const to = new Date(`${safeTo}T00:00:00Z`).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function getWeatherMaxMinutes(weather: BrainWeather): number {
  if (weather === 'fried') return 5;
  if (weather === 'okay') return 15;
  return 25;
}

export function getInitialState(): OrbitState {
  return {
    goals: [],
    assignments: [],
    opportunities: [],
    tasks: [],
    wins: [],
    githubActivity: null,
    patternInsight: null,
    preferences: {
      brainWeather: 'okay',
      availableMinutesToday: 45,
      reduceMotion: false,
      onePasteCaptureEnabled: true,
      voiceAssistantEnabled: true,
      githubUsername: '',
    },
    lastActiveDate: getTodayISO(),
  };
}

export function normalizeTask(raw: Partial<OrbitTask>, index = 0): OrbitTask {
  const title = raw.title?.trim() || 'Small focus step';
  const status =
    raw.status && ['pending', 'in_progress', 'completed', 'missed', 'skipped'].includes(raw.status)
      ? raw.status
      : 'pending';
  return {
    id: raw.id || `task-${Date.now()}-${index}`,
    title,
    description: raw.description || '',
    category: raw.category || 'study',
    priority:
      raw.priority && ['high', 'medium', 'low'].includes(raw.priority)
        ? raw.priority
        : 'medium',
    estimatedMinutes: Math.max(2, Math.min(60, Number(raw.estimatedMinutes) || 15)),
    status,
    scheduledDate:
      raw.scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(raw.scheduledDate)
        ? raw.scheduledDate
        : getTodayISO(),
    sourceType:
      raw.sourceType && ['goal', 'assignment', 'opportunity', 'custom'].includes(raw.sourceType)
        ? raw.sourceType
        : 'custom',
    sourceId: raw.sourceId,
    milestoneIndex:
      typeof raw.milestoneIndex === 'number'
        ? Math.min(2, Math.max(0, raw.milestoneIndex))
        : undefined,
    weeklyTargetId: raw.weeklyTargetId,
    orderIndex: typeof raw.orderIndex === 'number' ? raw.orderIndex : index,
    firstAction:
      raw.firstAction?.trim() || `Open your workspace for "${title}" and write one short heading.`,
    microSteps: Array.isArray(raw.microSteps) ? raw.microSteps : undefined,
    completedAt: raw.completedAt,
    skippedAt: raw.skippedAt,
    postponeCount: typeof raw.postponeCount === 'number' ? raw.postponeCount : 0,
    blockerReason: raw.blockerReason,
    replanReviewed: raw.replanReviewed,
    weatherWhenCompleted: raw.weatherWhenCompleted,
    examReduced: raw.examReduced,
  };
}

function migrateLegacyV1State(rawV1: any): OrbitState {
  const base = getInitialState();
  const today = getTodayISO();

  const legacyTracks = Array.isArray(rawV1?.tracks) ? rawV1.tracks : [];
  const legacyMilestones = Array.isArray(rawV1?.milestones) ? rawV1.milestones : [];
  const legacyWeekly = Array.isArray(rawV1?.weeklyTargets) ? rawV1.weeklyTargets : [];
  const legacyMissions = Array.isArray(rawV1?.missions) ? rawV1.missions : [];
  const legacyEvents = Array.isArray(rawV1?.events) ? rawV1.events : [];
  const legacyInternships = Array.isArray(rawV1?.internships) ? rawV1.internships : [];
  const legacyWins = Array.isArray(rawV1?.wins) ? rawV1.wins : [];

  const goals: Goal[] = legacyTracks.map((t: any, idx: number) => {
    const ms = Array.isArray(t.milestones) && t.milestones.length > 0 ? t.milestones : legacyMilestones;
    const goalId = t.id || `goal-migrated-${idx}`;
    return {
      id: goalId,
      title: t.title || '3-Month Goal',
      category: 'study',
      deadline: ms[2]?.dueDate || addDaysISO(today, 90),
      status: 'active',
      syllabus: rawV1?.profile?.syllabus,
      milestones: [0, 1, 2].map((mIdx) => ({
        id: `${goalId}-m-${mIdx}`,
        index: mIdx,
        monthLabel: ms[mIdx]?.monthLabel || `Month ${mIdx + 1}`,
        planetName: ['Luna', 'Vega', 'Polaris'][mIdx],
        title: ms[mIdx]?.title || `Phase ${mIdx + 1}`,
        summary: ms[mIdx]?.summary || 'Core milestone steps.',
        dueDate: ms[mIdx]?.dueDate || addDaysISO(today, (mIdx + 1) * 30),
      })),
      weeklyTargets: legacyWeekly.map((wt: any, wIdx: number) => ({
        id: wt.id || `${goalId}-wt-${wIdx}`,
        milestoneIndex: Math.min(2, Math.max(0, Number(wt.milestoneIndex) || 0)),
        weekNumber: wIdx + 1,
        title: wt.title || `Week ${wIdx + 1} target`,
      })),
      createdAt: t.createdAt || new Date().toISOString(),
    };
  });

  if (goals.length === 0 && rawV1?.profile?.goal) {
    const goalId = 'goal-migrated-primary';
    goals.push({
      id: goalId,
      title: String(rawV1.profile.goal).slice(0, 60),
      category: 'study',
      deadline: addDaysISO(today, 90),
      status: 'active',
      syllabus: rawV1.profile.syllabus,
      milestones: [0, 1, 2].map((mIdx) => ({
        id: `${goalId}-m-${mIdx}`,
        index: mIdx,
        monthLabel: legacyMilestones[mIdx]?.monthLabel || `Month ${mIdx + 1}`,
        planetName: ['Luna', 'Vega', 'Polaris'][mIdx],
        title: legacyMilestones[mIdx]?.title || `Phase ${mIdx + 1}`,
        summary: legacyMilestones[mIdx]?.summary || 'Core milestone steps.',
        dueDate: legacyMilestones[mIdx]?.dueDate || addDaysISO(today, (mIdx + 1) * 30),
      })),
      weeklyTargets: legacyWeekly.map((wt: any, wIdx: number) => ({
        id: wt.id || `${goalId}-wt-${wIdx}`,
        milestoneIndex: Math.min(2, Math.max(0, Number(wt.milestoneIndex) || 0)),
        weekNumber: wIdx + 1,
        title: wt.title || `Week ${wIdx + 1} target`,
      })),
      createdAt: rawV1.profile.createdAt || new Date().toISOString(),
    });
  }

  const assignments: Assignment[] = legacyEvents.map((ev: any, idx: number) => ({
    id: ev.id || `assign-migrated-${idx}`,
    title: ev.title || 'Academic Deadline',
    subject: 'Coursework',
    kind: ev.kind === 'exam' ? 'exam' : 'assignment',
    dueDate: ev.date || addDaysISO(today, 7),
    requirements: ev.summary ? [ev.summary] : [],
    notes: ev.summary || '',
    status: 'upcoming',
    createdAt: ev.createdAt || new Date().toISOString(),
  }));

  const opportunities: Opportunity[] = legacyInternships.map((item: any, idx: number) => ({
    id: item.id || `opp-migrated-${idx}`,
    title: item.role || 'Opportunity',
    organization: item.company || 'Organization',
    category: 'Internship',
    applicationDeadline:
      item.deadline && /^\d{4}-\d{2}-\d{2}$/.test(item.deadline)
        ? item.deadline
        : addDaysISO(today, 14),
    status: item.status === 'Applied' ? 'Applied' : 'Interested',
    requirements: item.notes || '',
    reminderDaysBefore: 3,
    createdAt: item.updatedAt || new Date().toISOString(),
  }));

  const tasks: OrbitTask[] = legacyMissions.map((m: any, idx: number) =>
    normalizeTask(
      {
        id: m.id,
        title: m.title,
        description: m.sizes?.okay?.action || '',
        category: m.category || 'study',
        priority: m.examReduced ? 'low' : 'medium',
        estimatedMinutes: m.estimatedMinutes || 15,
        status: m.status === 'didnt_happen' ? 'missed' : m.status,
        scheduledDate: m.targetDate || today,
        sourceType: m.trackId || goals[0]?.id ? 'goal' : 'custom',
        sourceId: m.trackId || goals[0]?.id,
        milestoneIndex: typeof m.milestoneIndex === 'number' ? m.milestoneIndex : 0,
        orderIndex: idx,
        firstAction:
          m.firstPhysicalAction ||
          m.microSteps?.[0] ||
          `Open your workspace for "${m.title || 'this step'}".`,
        microSteps: m.microSteps,
        completedAt: m.completedAt,
        skippedAt: m.skippedAt,
        blockerReason: m.blockerReason,
        replanReviewed: m.replanReviewed,
        weatherWhenCompleted: m.weatherWhenCompleted,
        examReduced: m.examReduced,
      },
      idx
    )
  );

  const wins = legacyWins.map((w: any, idx: number) => ({
    id: w.id || `win-m-${idx}`,
    taskId: w.missionId || '',
    taskTitle: w.missionTitle || 'Completed step',
    note: w.note || 'Yayy! Step completed.',
    sourceTitle: w.trackTitle,
    planetName: w.planetName,
    nextPlanetName: w.nextPlanetName,
    milestoneCompleted: w.milestoneCompleted,
    minutes: Number(w.minutes) || 10,
    createdAt: w.createdAt || new Date().toISOString(),
  }));

  return reconcileDailyState({
    ...base,
    goals,
    assignments,
    opportunities,
    tasks,
    wins,
    githubActivity: rawV1?.githubActivity ?? null,
    patternInsight: rawV1?.patternInsight ?? null,
    preferences: {
      ...base.preferences,
      brainWeather: rawV1?.preferences?.brainWeather || 'okay',
      reduceMotion: Boolean(rawV1?.preferences?.reduceMotion),
      onePasteCaptureEnabled:
        typeof rawV1?.preferences?.onePasteCaptureEnabled === 'boolean'
          ? rawV1.preferences.onePasteCaptureEnabled
          : true,
      githubUsername: rawV1?.preferences?.githubUsername || '',
    },
    lastActiveDate: rawV1?.lastActiveDate || today,
  });
}

const DEFAULT_WEEK_LABELS = [
  'Core Foundations & Setup',
  'Key Concepts & Building Blocks',
  'Guided Practice Exercises',
  'Month 1 Review & Checkpoint',
  'Intermediate Techniques',
  'Applied Workflows & Patterns',
  'Real-Data Practice',
  'Month 2 Mini-Project',
  'Advanced Scenarios',
  'Capstone Implementation',
  'Testing & Refinement',
  'Final Polish & Showcase',
];

export function ensureTwelveWeekGoals(
  goals: Goal[],
  tasks: OrbitTask[]
): { goals: Goal[]; tasks: OrbitTask[] } {
  const today = getTodayISO();
  let nextTasks = [...tasks];

  const nextGoals = goals.map((goal) => {
    const safeMilestones = [0, 1, 2].map((mIdx) => {
      const existing = goal.milestones?.[mIdx];
      return {
        id: existing?.id || `${goal.id}-m-${mIdx}`,
        index: mIdx,
        monthLabel: `Month ${mIdx + 1}`,
        planetName: ['Luna', 'Vega', 'Polaris'][mIdx],
        title: existing?.title || `${goal.title} — Month ${mIdx + 1}`,
        summary: existing?.summary || 'Sequential weekly steps.',
        dueDate: existing?.dueDate || addDaysISO(today, (mIdx + 1) * 30),
      };
    });

    const existingTargets = Array.isArray(goal.weeklyTargets) ? goal.weeklyTargets : [];
    const safeWeeklyTargets = Array.from({ length: 12 }, (_, idx) => {
      const weekNumber = idx + 1;
      const milestoneIndex = Math.floor(idx / 4);
      const found =
        existingTargets.find((wt) => wt.weekNumber === weekNumber) ||
        (idx < existingTargets.length ? existingTargets[idx] : undefined);
      return {
        id: found?.id || `${goal.id}-wt-${weekNumber}`,
        milestoneIndex,
        weekNumber,
        title:
          found?.title?.trim() ||
          `${safeMilestones[milestoneIndex].title}: ${DEFAULT_WEEK_LABELS[idx]}`,
      };
    });

    const validTargetIds = new Set(safeWeeklyTargets.map((wt) => wt.id));
    const syllabusParts = (goal.syllabus || '')
      .split(/[\n→,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Ensure every existing goal task maps cleanly to one of the 12 weekly targets
    const goalTasks = nextTasks.filter(
      (t) => t.sourceType === 'goal' && t.sourceId === goal.id
    );

    if (goalTasks.length > 0) {
      let reassignCursor = 0;
      nextTasks = nextTasks.map((t) => {
        if (t.sourceType !== 'goal' || t.sourceId !== goal.id) return t;
        if (t.weeklyTargetId && validTargetIds.has(t.weeklyTargetId)) {
          const wt = safeWeeklyTargets.find((w) => w.id === t.weeklyTargetId)!;
          return { ...t, milestoneIndex: wt.milestoneIndex };
        }
        const mIdx = Math.min(2, Math.max(0, t.milestoneIndex ?? Math.floor(reassignCursor / 4)));
        const monthTargets = safeWeeklyTargets.filter((w) => w.milestoneIndex === mIdx);
        const picked = monthTargets[reassignCursor % 4] || safeWeeklyTargets[reassignCursor % 12];
        reassignCursor += 1;
        return {
          ...t,
          milestoneIndex: picked.milestoneIndex,
          weeklyTargetId: picked.id,
        };
      });
    }

    // Populate any week (1..12) that has 0 tasks so no week is skipped
    const maxOrder = nextTasks.reduce((m, t) => Math.max(m, t.orderIndex), 0);
    let addedCount = 0;
    safeWeeklyTargets.forEach((wt, idx) => {
      const hasTaskInWeek = nextTasks.some(
        (t) => t.sourceType === 'goal' && t.sourceId === goal.id && t.weeklyTargetId === wt.id
      );
      if (!hasTaskInWeek) {
        const topic =
          syllabusParts[idx] ||
          wt.title ||
          `${goal.title} — Week ${wt.weekNumber}`;
        addedCount += 1;
        nextTasks.push(
          normalizeTask(
            {
              id: `${goal.id}-w${wt.weekNumber}-t-${addedCount}`,
              title: topic.startsWith('Week ') ? topic : `Complete ${topic}`,
              description: `Week ${wt.weekNumber} step for ${goal.title}`,
              category: goal.category || 'study',
              priority: wt.weekNumber <= 4 ? 'high' : 'medium',
              estimatedMinutes: 15,
              status: 'pending',
              scheduledDate: addDaysISO(today, (wt.weekNumber - 1) * 7),
              sourceType: 'goal',
              sourceId: goal.id,
              milestoneIndex: wt.milestoneIndex,
              weeklyTargetId: wt.id,
              orderIndex: maxOrder + addedCount,
              firstAction: `Open your notes for "${topic}" and write 3 bullet points.`,
            },
            maxOrder + addedCount
          )
        );
      }
    });

    return {
      ...goal,
      milestones: safeMilestones,
      weeklyTargets: safeWeeklyTargets,
    };
  });

  return { goals: nextGoals, tasks: nextTasks };
}

export function pruneOrphanedWins(state: OrbitState): OrbitState {
  const validTaskIds = new Set(state.tasks.map((t) => t.id));
  const validGoalIds = new Set(state.goals.map((g) => g.id));
  const validAssignIds = new Set(state.assignments.map((a) => a.id));
  const validOppIds = new Set(state.opportunities.map((o) => o.id));
  const validGoalTitles = new Set(state.goals.map((g) => g.title));

  const cleanedWins = state.wins.filter((w) => {
    if (w.taskId && !validTaskIds.has(w.taskId)) return false;
    if (w.sourceType === 'goal' && w.sourceId && !validGoalIds.has(w.sourceId)) return false;
    if (w.sourceType === 'assignment' && w.sourceId && !validAssignIds.has(w.sourceId)) return false;
    if (w.sourceType === 'opportunity' && w.sourceId && !validOppIds.has(w.sourceId)) return false;
    if (w.sourceTitle && !w.sourceId && state.goals.length > 0 && !validGoalTitles.has(w.sourceTitle)) {
      return false;
    }
    if (!w.taskId && state.tasks.length === 0) return false;
    return true;
  });

  if (cleanedWins.length === state.wins.length) return state;
  return { ...state, wins: cleanedWins };
}

export function sanitizeAndDeduplicateState(state: OrbitState): OrbitState {
  const seenGoalIds = new Set<string>();
  const keptGoals: Goal[] = [];
  const migratedAssignmentIds = new Map<string, string>();
  const migratedAssignments: Assignment[] = [];

  for (const g of state.goals) {
    if (!g?.id || seenGoalIds.has(g.id)) continue;
    seenGoalIds.add(g.id);

    // Move any misrouted "work" category item out of Goals into Work (Assignments)
    if (String(g.category || '').toLowerCase() === 'work') {
      const assignId = `assign-migrated-${g.id}`;
      migratedAssignmentIds.set(g.id, assignId);
      migratedAssignments.push({
        id: assignId,
        title: g.title,
        subject: 'Work',
        kind: /\b(exam|midterm|final|quiz|test)\b/i.test(g.title) ? 'exam' : 'assignment',
        dueDate: g.deadline || getTodayISO(),
        requirements: [],
        notes: 'Moved to Work',
        status: 'upcoming',
        createdAt: g.createdAt || new Date().toISOString(),
      });
    } else {
      keptGoals.push(g);
    }
  }

  // Re-link tasks that belonged to moved work goals -> sourceType: 'assignment'
  const seenTaskIds = new Set<string>();
  const dedupedTasks: OrbitTask[] = [];
  for (const t of state.tasks) {
    if (!t?.id || seenTaskIds.has(t.id)) continue;
    seenTaskIds.add(t.id);
    if (t.sourceType === 'goal' && t.sourceId && migratedAssignmentIds.has(t.sourceId)) {
      dedupedTasks.push({
        ...t,
        sourceType: 'assignment',
        sourceId: migratedAssignmentIds.get(t.sourceId),
        category: 'work',
        milestoneIndex: undefined,
        weeklyTargetId: undefined,
      });
    } else {
      dedupedTasks.push(t);
    }
  }

  // Deduplicate assignments by id and normalized (title + dueDate)
  const seenAssignIds = new Set<string>();
  const seenAssignKeys = new Set<string>();
  const dedupedAssignments: Assignment[] = [];
  for (const a of [...state.assignments, ...migratedAssignments]) {
    if (!a?.id || seenAssignIds.has(a.id)) continue;
    const key = `${a.title.trim().toLowerCase()}::${a.dueDate}`;
    if (seenAssignKeys.has(key)) continue;
    seenAssignIds.add(a.id);
    seenAssignKeys.add(key);
    dedupedAssignments.push(a);
  }

  // Deduplicate opportunities by id
  const seenOppIds = new Set<string>();
  const dedupedOpps = state.opportunities.filter((o) => {
    if (!o?.id || seenOppIds.has(o.id)) return false;
    seenOppIds.add(o.id);
    return true;
  });

  // Update migrated win sourceIds if any work goal moved to assignment
  const updatedWins = state.wins.map((w) => {
    if (w.sourceId && migratedAssignmentIds.has(w.sourceId)) {
      return {
        ...w,
        sourceType: 'assignment' as const,
        sourceId: migratedAssignmentIds.get(w.sourceId),
      };
    }
    return w;
  });

  return {
    ...state,
    goals: keptGoals,
    assignments: dedupedAssignments,
    opportunities: dedupedOpps,
    tasks: dedupedTasks,
    wins: updatedWins,
  };
}

export function hydrateOrbitState(parsed: Partial<OrbitState>): OrbitState {
  const base = getInitialState();
  const rawGoals = Array.isArray(parsed.goals) ? parsed.goals : [];
  const rawTasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.map((t, idx) => normalizeTask(t, idx))
    : [];
  const merged: OrbitState = {
    ...base,
    ...parsed,
    goals: rawGoals,
    assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
    tasks: rawTasks,
    wins: Array.isArray(parsed.wins) ? parsed.wins : [],
    preferences: {
      ...base.preferences,
      ...(parsed.preferences || {}),
    },
  };
  const sanitized = sanitizeAndDeduplicateState(merged);
  const normalized = ensureTwelveWeekGoals(sanitized.goals, sanitized.tasks);
  return pruneOrphanedWins(
    reconcileDailyState({
      ...sanitized,
      goals: normalized.goals,
      tasks: normalized.tasks,
    })
  );
}

export function loadOrbitState(uid?: string): OrbitState {
  try {
    if (uid) {
      const rawUser = localStorage.getItem(getUserStorageKey(uid));
      if (rawUser) {
        return hydrateOrbitState(JSON.parse(rawUser) as Partial<OrbitState>);
      }
      return getInitialState();
    }

    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      return hydrateOrbitState(JSON.parse(rawV2) as Partial<OrbitState>);
    }

    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const migrated = sanitizeAndDeduplicateState(migrateLegacyV1State(JSON.parse(rawV1)));
      const normalized = ensureTwelveWeekGoals(migrated.goals, migrated.tasks);
      return pruneOrphanedWins({
        ...migrated,
        goals: normalized.goals,
        tasks: normalized.tasks,
      });
    }

    return getInitialState();
  } catch {
    return getInitialState();
  }
}

export function saveOrbitState(state: OrbitState, uid?: string): void {
  try {
    localStorage.setItem(getUserStorageKey(uid), JSON.stringify(state));
  } catch {
    // Ignore storage quota issues gracefully
  }
}

export function clearOrbitState(uid?: string): OrbitState {
  try {
    if (uid) {
      localStorage.removeItem(getUserStorageKey(uid));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage issues
  }
  return getInitialState();
}

export function isDateInExamWeek(dateISO: string, assignments: Assignment[]): boolean {
  return assignments.some((a) => {
    if (a.status === 'completed') return false;
    const diff = daysBetweenISO(dateISO, a.dueDate);
    return diff >= 0 && diff <= 7;
  });
}

export function reconcileDailyState(state: OrbitState): OrbitState {
  const today = getTodayISO();
  let changed = state.lastActiveDate !== today;

  const updatedTasks = state.tasks.map((raw, idx) => {
    let t = normalizeTask(raw, idx);

    // Past-due pending or in_progress tasks gently transition to 'missed' (never red, no guilt)
    if ((t.status === 'pending' || t.status === 'in_progress') && t.scheduledDate < today) {
      changed = true;
      t = {
        ...t,
        status: 'missed',
        replanReviewed: false,
      };
    }

    // Gentle exam-week reduction for career goal tasks
    if (
      t.status === 'pending' &&
      t.sourceType === 'goal' &&
      t.category === 'career' &&
      isDateInExamWeek(t.scheduledDate, state.assignments) &&
      !t.examReduced
    ) {
      changed = true;
      t = {
        ...t,
        examReduced: true,
        estimatedMinutes: Math.min(10, t.estimatedMinutes),
      };
    }

    return t;
  });

  // Update opportunity expiration statuses gently
  const updatedOpps = state.opportunities.map((opp) => {
    if (
      (opp.status === 'Interested' || opp.status === 'To Apply') &&
      opp.applicationDeadline < today
    ) {
      changed = true;
      return { ...opp, status: 'Expired' as const };
    }
    return opp;
  });

  if (!changed) return state;

  return {
    ...state,
    tasks: updatedTasks,
    opportunities: updatedOpps,
    lastActiveDate: today,
  };
}

/**
 * Rebalances daily/weekly tasks when a new assignment or exam drops.
 * Never deletes important tasks or overloads any single day.
 */
export function rebalanceScheduleForEvent(
  state: OrbitState,
  dueDate: string,
  titleKeywords: string[]
): OrbitState {
  const today = getTodayISO();
  const daysUntil = Math.max(0, daysBetweenISO(today, dueDate));
  const keywords = titleKeywords.map((k) => k.toLowerCase()).filter((w) => w.length >= 4);

  const updatedTasks = state.tasks.map((t) => {
    if (t.status !== 'pending' && t.status !== 'in_progress') return t;

    const text = `${t.title} ${t.description}`.toLowerCase();
    const matchesKeyword = keywords.some((kw) => text.includes(kw));

    // Pull related study/assignment tasks earlier if needed
    if ((t.sourceType === 'assignment' || matchesKeyword) && daysUntil <= 7 && t.scheduledDate > dueDate) {
      return {
        ...t,
        scheduledDate: addDaysISO(today, Math.min(1, daysUntil)),
        priority: 'high' as const,
      };
    }

    // Gently nudge non-urgent career/personal tasks by +2 days during tight exam crunch
    if (
      daysUntil <= 4 &&
      t.sourceType === 'goal' &&
      t.scheduledDate >= today &&
      t.scheduledDate <= dueDate &&
      t.priority !== 'high'
    ) {
      return {
        ...t,
        scheduledDate: addDaysISO(t.scheduledDate, 2),
        examReduced: true,
        estimatedMinutes: Math.min(10, t.estimatedMinutes),
      };
    }

    return t;
  });

  return {
    ...state,
    tasks: updatedTasks,
  };
}

export function getGoalProgress(goal: Goal, allTasks: OrbitTask[]) {
  const goalTasks = allTasks
    .filter((t) => t.sourceType === 'goal' && t.sourceId === goal.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const completedCount = goalTasks.filter((t) => t.status === 'completed').length;
  const totalCount = goalTasks.length;
  const overallPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const sortedTargets = [...goal.weeklyTargets].sort((a, b) => a.weekNumber - b.weekNumber);

  const weeklyStats = sortedTargets.map((wt) => {
    const wtTasks = goalTasks.filter((t) => t.weeklyTargetId === wt.id);
    const done = wtTasks.filter((t) => t.status === 'completed').length;
    const total = wtTasks.length;
    return {
      ...wt,
      tasks: wtTasks,
      completed: done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      isComplete: total > 0 && done === total,
    };
  });

  const milestoneStats = goal.milestones.map((m) => {
    const mWeeks = weeklyStats.filter((wt) => wt.milestoneIndex === m.index);
    const mTasks = goalTasks.filter((t) => (t.milestoneIndex ?? 0) === m.index);
    const done = mTasks.filter((t) => t.status === 'completed').length;
    const total = mTasks.length;
    const completedWeeks = mWeeks.filter((w) => w.isComplete).length;
    return {
      ...m,
      weeks: mWeeks,
      completedWeeks,
      totalWeeks: mWeeks.length,
      completed: done,
      total,
      percent: total > 0 ? Math.round((done / total) * 100) : 0,
      isComplete: total > 0 && done === total,
    };
  });

  const currentMilestone =
    milestoneStats.find((m) => m.completed < m.total || m.total === 0) ||
    milestoneStats[milestoneStats.length - 1] ||
    null;

  return {
    tasks: goalTasks,
    completedCount,
    totalCount,
    overallPercent,
    milestoneStats,
    weeklyStats,
    currentMilestone,
  };
}

export function getAssignmentProgress(assignment: Assignment, allTasks: OrbitTask[]) {
  const tasks = allTasks
    .filter((t) => t.sourceType === 'assignment' && t.sourceId === assignment.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { tasks, completed, total, percent };
}

export function getAdaptedMinutes(task: OrbitTask, weather: BrainWeather): number {
  const cap = getWeatherMaxMinutes(weather);
  return Math.min(task.estimatedMinutes, cap);
}

/**
 * Builds a calm, manageable Today queue honoring active goals, urgent deadlines,
 * approaching opportunity reminders, Brain Weather, and available time today.
 */
export function getTodayQueue(state: OrbitState): {
  tasks: OrbitTask[];
  totalAdaptedMinutes: number;
  pausedGoalCount: number;
} {
  const today = getTodayISO();
  const weather = state.preferences.brainWeather;
  const maxTotalMinutes = Math.max(15, state.preferences.availableMinutesToday || 45);
  const activeGoalIds = new Set(
    state.goals.filter((g) => g.status === 'active').map((g) => g.id)
  );
  const pausedGoalCount = state.goals.filter((g) => g.status === 'paused').length;

  const candidates = state.tasks.filter((t) => {
    if (t.status !== 'pending' && t.status !== 'in_progress') return false;
    if (t.sourceType === 'goal' && t.sourceId && !activeGoalIds.has(t.sourceId)) {
      return false; // Exclude paused/archived goals
    }
    return t.scheduledDate <= addDaysISO(today, 2);
  });

  const assignmentMap = new Map(state.assignments.map((a) => [a.id, a]));
  const oppMap = new Map(state.opportunities.map((o) => [o.id, o]));

  const scored = candidates.map((t) => {
    let score = 0;
    if (t.status === 'in_progress') score += 100;
    if (t.scheduledDate <= today) score += 45;
    if (t.priority === 'high') score += 30;
    else if (t.priority === 'medium') score += 15;

    if (t.sourceType === 'assignment' && t.sourceId) {
      const a = assignmentMap.get(t.sourceId);
      if (a) {
        const d = daysBetweenISO(today, a.dueDate);
        if (d <= 2) score += 50;
        else if (d <= 5) score += 28;
      }
    }

    if (t.sourceType === 'opportunity' && t.sourceId) {
      const o = oppMap.get(t.sourceId);
      if (o) {
        const d = daysBetweenISO(today, o.applicationDeadline);
        if (d <= (o.reminderDaysBefore || 3)) score += 42;
      }
    }

    if (weather === 'fried' && t.estimatedMinutes <= 10) {
      score += 14;
    }

    return { task: t, score };
  });

  scored.sort((a, b) => b.score - a.score || a.task.orderIndex - b.task.orderIndex);

  const selected: OrbitTask[] = [];
  let runningMinutes = 0;
  for (const item of scored) {
    const adapted = getAdaptedMinutes(item.task, weather);
    if (selected.length === 0 || runningMinutes + adapted <= maxTotalMinutes) {
      selected.push(item.task);
      runningMinutes += adapted;
    }
    if (selected.length >= 6) break;
  }

  return {
    tasks: selected,
    totalAdaptedMinutes: runningMinutes,
    pausedGoalCount,
  };
}

export function getUnreviewedMissedTasks(state: OrbitState): OrbitTask[] {
  return state.tasks.filter((t) => t.status === 'missed' && !t.replanReviewed);
}

export function getInstantUnstickFallback(
  task: OrbitTask,
  weather: BrainWeather
): { firstPhysicalAction: string; microSteps: string[] } {
  const adaptedMin = getAdaptedMinutes(task, weather);
  const steps =
    Array.isArray(task.microSteps) && task.microSteps.length > 0
      ? task.microSteps
      : [
          task.firstAction || `Open your workspace for "${task.title}"`,
          `Work calmly for ${Math.min(2, adaptedMin)} minutes on one tiny piece`,
          'Save your spot — zero pressure to finish everything now',
        ];
  return {
    firstPhysicalAction: task.firstAction || steps[0],
    microSteps: steps,
  };
}

export interface InsightsMetrics {
  totalCompleted: number;
  totalMissed: number;
  totalSkipped: number;
  weeklyCompletedCount: number;
  completedByDay: Array<{ dayLabel: string; date: string; count: number }>;
  productiveTimePeriod: string;
  completedByHourBucket: {
    morning: number;
    afternoon: number;
    evening: number;
    after9pm: number;
  };
  skippedByHourBucket: {
    morning: number;
    afternoon: number;
    evening: number;
    after9pm: number;
  };
  commonObstacles: Array<{ reason: string; label: string; count: number }>;
  frequentlyPostponed: OrbitTask[];
  topSkipWindow: string;
}

function getHourBucket(iso?: string): 'morning' | 'afternoon' | 'evening' | 'after9pm' {
  if (!iso) return 'afternoon';
  const h = new Date(iso).getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'after9pm';
}

export function computeInsightsMetrics(state: OrbitState): InsightsMetrics {
  const today = getTodayISO();
  const completed = state.tasks.filter((t) => t.status === 'completed');
  const missed = state.tasks.filter((t) => t.status === 'missed');
  const skipped = state.tasks.filter((t) => t.status === 'skipped');

  const completedByHourBucket = { morning: 0, afternoon: 0, evening: 0, after9pm: 0 };
  const skippedByHourBucket = { morning: 0, afternoon: 0, evening: 0, after9pm: 0 };

  for (const t of completed) {
    completedByHourBucket[getHourBucket(t.completedAt)] += 1;
  }
  for (const t of skipped) {
    skippedByHourBucket[getHourBucket(t.skippedAt)] += 1;
  }

  const bucketNames = {
    morning: 'Morning (before 12 PM)',
    afternoon: 'Afternoon (12–5 PM)',
    evening: 'Evening (5–9 PM)',
    after9pm: 'Late night (after 9 PM)',
  };

  let productiveTimePeriod = 'Still learning your rhythm';
  let maxDone = 0;
  for (const [k, v] of Object.entries(completedByHourBucket)) {
    if (v > maxDone) {
      maxDone = v;
      productiveTimePeriod = bucketNames[k as keyof typeof bucketNames];
    }
  }

  let topSkipWindow = 'none yet';
  let maxSkips = 0;
  for (const [k, v] of Object.entries(skippedByHourBucket)) {
    if (v > maxSkips) {
      maxSkips = v;
      topSkipWindow = bucketNames[k as keyof typeof bucketNames];
    }
  }

  // Last 7 days bar chart data
  const completedByDay: Array<{ dayLabel: string; date: string; count: number }> = [];
  let weeklyCompletedCount = 0;
  for (let i = 6; i >= 0; i--) {
    const d = addDaysISO(today, -i);
    const label = new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short' });
    const count = completed.filter(
      (t) => (t.completedAt ? t.completedAt.slice(0, 10) : t.scheduledDate) === d
    ).length;
    weeklyCompletedCount += count;
    completedByDay.push({ dayLabel: label, date: d, count });
  }

  const obstacleCounts: Record<string, number> = {};
  for (const t of state.tasks) {
    if (t.blockerReason) {
      obstacleCounts[t.blockerReason] = (obstacleCounts[t.blockerReason] || 0) + 1;
    }
  }
  const obstacleLabels: Record<string, string> = {
    too_big: 'Task felt too big',
    too_tired: 'Low energy / tired',
    exam: 'Exam or assignment crunch',
    forgot: 'Lost track or forgot',
  };
  const commonObstacles = Object.entries(obstacleCounts)
    .map(([reason, count]) => ({
      reason,
      label: obstacleLabels[reason] || reason,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const frequentlyPostponed = state.tasks
    .filter((t) => (t.postponeCount || 0) >= 1 || t.status === 'missed' || t.status === 'skipped')
    .sort((a, b) => (b.postponeCount || 0) - (a.postponeCount || 0))
    .slice(0, 5);

  return {
    totalCompleted: completed.length,
    totalMissed: missed.length,
    totalSkipped: skipped.length,
    weeklyCompletedCount,
    completedByDay,
    productiveTimePeriod,
    completedByHourBucket,
    skippedByHourBucket,
    commonObstacles,
    frequentlyPostponed,
    topSkipWindow,
  };
}

export function createSimulatedMissedDaysState(state: OrbitState): OrbitState {
  const today = getTodayISO();
  const yesterday = addDaysISO(today, -1);
  const twoDaysAgo = addDaysISO(today, -2);

  const safeTasks = Array.isArray(state.tasks) ? state.tasks.map((t, i) => normalizeTask(t, i)) : [];
  const pending = safeTasks.filter((t) => t.status === 'pending');
  const nextTasks = [...safeTasks];

  if (pending.length >= 2) {
    const firstId = pending[0].id;
    const secondId = pending[1].id;
    for (let i = 0; i < nextTasks.length; i++) {
      if (nextTasks[i].id === firstId) {
        nextTasks[i] = {
          ...nextTasks[i],
          scheduledDate: twoDaysAgo,
          status: 'missed',
          replanReviewed: false,
          postponeCount: (nextTasks[i].postponeCount || 0) + 1,
        };
      } else if (nextTasks[i].id === secondId) {
        nextTasks[i] = {
          ...nextTasks[i],
          scheduledDate: yesterday,
          status: 'missed',
          replanReviewed: false,
          postponeCount: (nextTasks[i].postponeCount || 0) + 1,
        };
      }
    }
  } else {
    const activeGoal = state.goals.find((g) => g.status === 'active');
    nextTasks.unshift(
      normalizeTask({
        id: `demo-missed-1-${Date.now()}`,
        title: activeGoal
          ? `Draft next step for ${activeGoal.title.slice(0, 28)}`
          : 'Review lecture summary notes',
        description: 'Gentle starter step carried over from two days ago.',
        category: activeGoal?.category || 'study',
        priority: 'medium',
        estimatedMinutes: 15,
        status: 'missed',
        scheduledDate: twoDaysAgo,
        sourceType: activeGoal ? 'goal' : 'custom',
        sourceId: activeGoal?.id,
        milestoneIndex: 0,
        replanReviewed: false,
        postponeCount: 1,
        firstAction: 'Open your notes app and type one heading.',
      }),
      normalizeTask({
        id: `demo-missed-2-${Date.now() + 1}`,
        title: 'Outline 2 key practice questions',
        description: 'Tiny step carried over from yesterday.',
        category: 'study',
        priority: 'medium',
        estimatedMinutes: 10,
        status: 'missed',
        scheduledDate: yesterday,
        sourceType: activeGoal ? 'goal' : 'custom',
        sourceId: activeGoal?.id,
        milestoneIndex: 0,
        replanReviewed: false,
        postponeCount: 1,
        firstAction: 'Read the first question prompt quietly.',
      })
    );
  }

  return {
    ...state,
    tasks: nextTasks,
  };
}
