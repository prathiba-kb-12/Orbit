import { useEffect, useState } from 'react';
import type {
  AppSection,
  Assignment,
  AssistantActionProposal,
  AssistantMessage,
  BlockerReason,
  BrainWeather,
  Goal,
  Opportunity,
  OpportunityCategory,
  OrbitState,
  OrbitTask,
  WinNote,
} from './types';
import {
  addDaysISO,
  clearOrbitState,
  computeInsightsMetrics,
  createSimulatedMissedDaysState,
  ensureTwelveWeekGoals,
  getGoalProgress,
  getInstantUnstickFallback,
  getTodayISO,
  getTodayQueue,
  getUnreviewedMissedTasks,
  loadOrbitState,
  normalizeTask,
  rebalanceScheduleForEvent,
  saveOrbitState,
} from './lib/orbitStore';
import {
  createGoalBreakdown,
  extractAssignmentPlan,
  extractOpportunityDetails,
  fetchGitHubActivity,
  fetchPatternInsight,
  generateWinNote,
  replanMissedTasks,
  sendAssistantCommand,
  unstickTask,
} from './lib/apiClient';
import { CosmosBackdrop } from './components/CosmosBackdrop';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavShell } from './components/NavShell';
import { TodayView } from './components/TodayView';
import { GoalsView } from './components/GoalsView';
import { AssignmentsView } from './components/AssignmentsView';
import { PlannerView } from './components/PlannerView';
import { OpportunitiesView } from './components/OpportunitiesView';
import { InsightsView } from './components/InsightsView';
import { PrivacyView } from './components/PrivacyView';
import { AssistantDrawer } from './components/AssistantDrawer';

export default function App() {
  const [state, setState] = useState<OrbitState>(() => loadOrbitState());
  const [activeSection, setActiveSection] = useState<AppSection>('today');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);

  // Loading & error states
  const [goalLoading, setGoalLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [unstickLoading, setUnstickLoading] = useState(false);
  const [replanLoading, setReplanLoading] = useState(false);
  const [patternLoading, setPatternLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [latestWin, setLatestWin] = useState<WinNote | null>(null);
  const [replanMessage, setReplanMessage] = useState<string | null>(null);

  useEffect(() => {
    saveOrbitState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', state.preferences.reduceMotion);
  }, [state.preferences.reduceMotion]);

  const weather = state.preferences.brainWeather;
  const missedCount = getUnreviewedMissedTasks(state).length;

  const handleCompleteTask = async (task: OrbitTask, minutesSpent: number) => {
    setError(null);
    const nowIso = new Date().toISOString();

    const parentGoal =
      task.sourceType === 'goal' && task.sourceId
        ? state.goals.find((g) => g.id === task.sourceId)
        : undefined;
    const mIdx = task.milestoneIndex ?? 0;
    const milestone = parentGoal?.milestones[mIdx];
    const nextMilestone = parentGoal?.milestones[mIdx + 1];

    const siblingMilestoneTasks = parentGoal
      ? state.tasks.filter(
          (t) =>
            t.sourceType === 'goal' &&
            t.sourceId === parentGoal.id &&
            (t.milestoneIndex ?? 0) === mIdx
        )
      : [];
    const completedSoFar =
      siblingMilestoneTasks.filter((t) => t.status === 'completed' || t.id === task.id).length || 1;
    const targetSteps = Math.max(1, siblingMilestoneTasks.length);
    const milestoneCompleted = Boolean(parentGoal && completedSoFar >= targetSteps);

    const instantNote = milestoneCompleted && milestone
      ? `Yayy! You finished every step of ${milestone.planetName} (${task.title}) — moving toward ${nextMilestone?.planetName || 'your next milestone'}.`
      : `Yayy! You finished "${task.title}" (${minutesSpent}m).`;

    const winId = `win-${Date.now()}`;
    const instantWin: WinNote = {
      id: winId,
      taskId: task.id,
      taskTitle: task.title,
      note: instantNote,
      sourceType: task.sourceType,
      sourceId: task.sourceId,
      sourceTitle: parentGoal?.title,
      planetName: milestone?.planetName || 'Luna',
      nextPlanetName: nextMilestone?.planetName,
      milestoneCompleted,
      minutes: minutesSpent,
      createdAt: nowIso,
    };

    // 0ms optimistic state update across Today, Goals, Assignments, Planner & Wins
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: 'completed',
              completedAt: nowIso,
              weatherWhenCompleted: weather,
            }
          : t
      ),
      wins: [instantWin, ...prev.wins],
    }));
    setLatestWin(instantWin);
    setReplanMessage(null);

    // Optional AI refinement in background
    try {
      const res = await generateWinNote({
        missionTitle: task.title,
        minutes: minutesSpent,
        milestoneTitle: milestone?.title || parentGoal?.title || 'Today',
        planetName: milestone?.planetName || 'Luna',
        nextPlanetName: nextMilestone?.planetName,
        completedCount: completedSoFar,
        targetSteps,
        milestoneCompleted,
      });
      setLatestWin((prev) => (prev && prev.id === winId ? { ...prev, note: res.note } : prev));
      setState((prev) => ({
        ...prev,
        wins: prev.wins.map((w) => (w.id === winId ? { ...w, note: res.note } : w)),
      }));
    } catch {
      // Instant celebration already displayed
    }
  };

  const handleToggleTaskDone = (task: OrbitTask) => {
    if (task.status === 'completed') {
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === task.id ? { ...t, status: 'pending', completedAt: undefined } : t
        ),
        wins: prev.wins.filter((w) => w.taskId !== task.id),
      }));
      setLatestWin((prev) => (prev?.taskId === task.id ? null : prev));
    } else {
      void handleCompleteTask(task, task.estimatedMinutes);
    }
  };

  const handleSkipTask = (task: OrbitTask) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: 'skipped',
              skippedAt: new Date().toISOString(),
              postponeCount: (t.postponeCount || 0) + 1,
            }
          : t
      ),
    }));
  };

  const handleUnstickTask = async (task: OrbitTask) => {
    setError(null);
    const instant = getInstantUnstickFallback(task, weather);
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === task.id
          ? {
              ...t,
              firstAction: t.firstAction || instant.firstPhysicalAction,
              microSteps: t.microSteps && t.microSteps.length > 0 ? t.microSteps : instant.microSteps,
            }
          : t
      ),
    }));

    setUnstickLoading(true);
    try {
      const parentGoal =
        task.sourceType === 'goal' && task.sourceId
          ? state.goals.find((g) => g.id === task.sourceId)
          : undefined;
      const { firstPhysicalAction, microSteps } = await unstickTask({
        missionTitle: task.title,
        action: task.description || task.title,
        brainWeather: weather,
        syllabus: parentGoal?.syllabus,
      });
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                firstAction: firstPhysicalAction,
                microSteps: microSteps.length > 0 ? microSteps : t.microSteps,
              }
            : t
        ),
      }));
    } catch {
      // Instant cue already shown
    } finally {
      setUnstickLoading(false);
    }
  };

  const handleReplanMissed = async (reason: BlockerReason, missed: OrbitTask[]) => {
    setError(null);
    setReplanLoading(true);
    try {
      const today = getTodayISO();
      const { encouragement, adjustedTasks } = await replanMissedTasks({
        reason,
        missedTasks: missed,
        activeEvents: state.assignments.filter((a) => a.status !== 'completed'),
        today,
      });

      const missedIds = new Set(missed.map((m) => m.id));
      const normalized = (Array.isArray(adjustedTasks) ? adjustedTasks : []).map((t, idx) =>
        normalizeTask(t, idx)
      );

      setState((prev) => ({
        ...prev,
        tasks: [
          ...normalized,
          ...prev.tasks.map((t) =>
            missedIds.has(t.id)
              ? { ...t, replanReviewed: true, blockerReason: reason }
              : t
          ),
        ],
      }));
      setReplanMessage(encouragement);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rebalance missed tasks right now.');
    } finally {
      setReplanLoading(false);
    }
  };

  const handleCreateGoalAI = async (input: {
    title: string;
    category: string;
    deadline: string;
    syllabus?: string;
    currentLevel?: string;
  }) => {
    setError(null);
    setGoalLoading(true);
    try {
      const today = getTodayISO();
      const safeCategory =
        String(input.category || '').toLowerCase() === 'work' ? 'study' : input.category || 'study';
      const res = await createGoalBreakdown({ ...input, category: safeCategory, today });
      const rawGoal: Goal = {
        ...res.goal,
        category: safeCategory,
        syllabus: input.syllabus,
      };
      const rawTasks = (Array.isArray(res.tasks) ? res.tasks : []).map((t, i) =>
        normalizeTask(t, i)
      );
      const ensured = ensureTwelveWeekGoals([rawGoal], rawTasks);
      const newGoal = ensured.goals[0];
      const newTasks = ensured.tasks;

      setState((prev) => {
        const exists = prev.goals.some(
          (g) =>
            g.title.trim().toLowerCase() === newGoal.title.trim().toLowerCase() &&
            g.deadline === newGoal.deadline
        );
        if (exists) return prev;
        return {
          ...prev,
          goals: [newGoal, ...prev.goals],
          tasks: [...prev.tasks, ...newTasks],
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not break down that goal right now.');
      throw err;
    } finally {
      setGoalLoading(false);
    }
  };

  const handleExtractAssignment = async (payload: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => {
    setError(null);
    setAssignmentLoading(true);
    try {
      const today = getTodayISO();
      const extracted = await extractAssignmentPlan({ ...payload, today });
      const assignmentId = `assign-${Date.now()}`;
      const newAssignment: Assignment = {
        id: assignmentId,
        title: extracted.title,
        subject: extracted.subject,
        kind: extracted.kind,
        dueDate: extracted.dueDate,
        requirements: extracted.requirements,
        notes: payload.text || '',
        status: 'upcoming',
        sourceFileName: payload.fileName,
        createdAt: new Date().toISOString(),
      };

      const newTasks: OrbitTask[] = extracted.tasks.map((t, idx) =>
        normalizeTask(
          {
            id: `${assignmentId}-t-${idx}`,
            title: t.title,
            description: `${extracted.subject} · ${extracted.title}`,
            category: 'study',
            priority: t.priority,
            estimatedMinutes: t.estimatedMinutes,
            status: 'pending',
            scheduledDate: addDaysISO(today, Math.min(idx, 4)),
            sourceType: 'assignment',
            sourceId: assignmentId,
            orderIndex: idx,
            firstAction: t.firstAction,
          },
          idx
        )
      );

      setState((prev) => {
        const exists = prev.assignments.some(
          (a) =>
            a.title.trim().toLowerCase() === newAssignment.title.trim().toLowerCase() &&
            a.dueDate === newAssignment.dueDate
        );
        if (exists) return prev;
        const withItems: OrbitState = {
          ...prev,
          assignments: [newAssignment, ...prev.assignments],
          tasks: [...newTasks, ...prev.tasks],
        };
        return rebalanceScheduleForEvent(
          withItems,
          extracted.dueDate,
          extracted.title.split(/\s+/)
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not extract that assignment right now.');
      throw err;
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleExtractOpportunity = async (payload: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
  }) => {
    setError(null);
    setOpportunityLoading(true);
    try {
      return await extractOpportunityDetails({ ...payload, today: getTodayISO() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not extract opportunity details.');
      throw err;
    } finally {
      setOpportunityLoading(false);
    }
  };

  const handleSaveOpportunity = (draft: {
    title: string;
    organization: string;
    category: OpportunityCategory;
    applicationDeadline: string;
    eventDate?: string;
    registrationLink?: string;
    eligibility?: string;
    requirements?: string;
    reminderDaysBefore: number;
    prepTasks: Array<{
      title: string;
      estimatedMinutes: number;
      firstAction: string;
      selected: boolean;
    }>;
  }) => {
    const oppId = `opp-${Date.now()}`;
    const today = getTodayISO();
    const newOpp: Opportunity = {
      id: oppId,
      title: draft.title.trim(),
      organization: draft.organization.trim() || 'Organization',
      category: draft.category,
      applicationDeadline: draft.applicationDeadline,
      eventDate: draft.eventDate || undefined,
      registrationLink: draft.registrationLink || undefined,
      eligibility: draft.eligibility || undefined,
      requirements: draft.requirements || undefined,
      status: 'To Apply',
      reminderDaysBefore: draft.reminderDaysBefore,
      createdAt: new Date().toISOString(),
    };

    const prepTasks: OrbitTask[] = draft.prepTasks
      .filter((pt) => pt.selected)
      .map((pt, idx) =>
        normalizeTask(
          {
            id: `${oppId}-prep-${idx}`,
            title: `${draft.title}: ${pt.title}`,
            description: `Prep for ${draft.organization} (deadline ${draft.applicationDeadline})`,
            category: 'career',
            priority: 'medium',
            estimatedMinutes: pt.estimatedMinutes,
            status: 'pending',
            scheduledDate: addDaysISO(today, idx),
            sourceType: 'opportunity',
            sourceId: oppId,
            orderIndex: idx,
            firstAction: pt.firstAction,
          },
          idx
        )
      );

    setState((prev) => ({
      ...prev,
      opportunities: [newOpp, ...prev.opportunities],
      tasks: [...prepTasks, ...prev.tasks],
    }));
  };

  const handleSendAssistantMessage = async (payload: {
    message?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => {
    setError(null);
    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: payload.message || `Attached ${payload.fileName || 'file'}`,
      hasAttachment: Boolean(payload.fileBase64),
      attachmentName: payload.fileName,
      createdAt: new Date().toISOString(),
    };
    const nextHistory = [...assistantMessages, userMsg];
    setAssistantMessages(nextHistory);
    setAssistantLoading(true);

    try {
      const todayQueue = getTodayQueue(state);
      const res = await sendAssistantCommand({
        message: payload.message,
        fileBase64: payload.fileBase64,
        mimeType: payload.mimeType,
        history: nextHistory,
        context: {
          activeSection,
          brainWeather: weather,
          availableMinutesToday: state.preferences.availableMinutesToday,
          goals: state.goals.map((g) => ({
            id: g.id,
            title: g.title,
            status: g.status,
            deadline: g.deadline,
          })),
          upcomingAssignments: state.assignments.map((a) => ({
            id: a.id,
            title: a.title,
            dueDate: a.dueDate,
            kind: a.kind,
          })),
          opportunities: state.opportunities.map((o) => ({
            id: o.id,
            title: o.title,
            status: o.status,
            applicationDeadline: o.applicationDeadline,
          })),
          todayTasks: todayQueue.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            estimatedMinutes: t.estimatedMinutes,
            status: t.status,
          })),
        },
        today: getTodayISO(),
      });

      const botMsg: AssistantMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        pendingConfirmation:
          res.requiresConfirmation && res.actionType !== 'none'
            ? {
                actionType: res.actionType,
                confirmationSummary: res.confirmationSummary || res.reply,
                actionPayload: res.actionPayload || {},
              }
            : undefined,
        createdAt: new Date().toISOString(),
      };
      setAssistantMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assistant could not respond right now.';
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          text: msg,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleConfirmProposal = async (messageId: string, proposal: AssistantActionProposal) => {
    const { actionType, actionPayload } = proposal;
    const today = getTodayISO();

    const catLower = String(actionPayload.category || '').toLowerCase();
    const kindLower = String(actionPayload.kind || '').toLowerCase();
    const isWorkCategory =
      ['work', 'assignment', 'exam', 'homework', 'coursework'].includes(catLower) ||
      kindLower === 'exam' ||
      kindLower === 'assignment';

    if (actionType === 'limit_today_time') {
      const mins = Math.max(15, Math.min(90, Number(actionPayload.minutesLimit) || 30));
      setState((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, availableMinutesToday: mins },
      }));
    } else if (actionType === 'add_assignment' || (isWorkCategory && (actionType === 'add_goal' || actionType === 'breakdown_task'))) {
      const dueDate = actionPayload.date || addDaysISO(today, 5);
      const title = actionPayload.title || 'Work Task';
      const assignId = `assign-${Date.now()}`;
      const newAssign: Assignment = {
        id: assignId,
        title,
        subject: actionPayload.subjectOrOrg || (isWorkCategory ? 'Work' : 'Coursework'),
        kind: kindLower === 'exam' ? 'exam' : 'assignment',
        dueDate,
        requirements: actionPayload.subSteps || [],
        notes: 'Added via Orbit Assistant',
        status: 'upcoming',
        createdAt: new Date().toISOString(),
      };
      const steps =
        actionPayload.subSteps && actionPayload.subSteps.length > 0
          ? actionPayload.subSteps
          : [`Start ${title}`, `Complete core work on ${title}`, `Review & finalize ${title}`];

      const newTasks = steps.map((st, idx) =>
        normalizeTask(
          {
            id: `${assignId}-t-${idx}`,
            title: st,
            description: title,
            category: 'work',
            priority: 'high',
            estimatedMinutes: 15,
            status: 'pending',
            scheduledDate: addDaysISO(today, Math.min(idx, 2)),
            sourceType: 'assignment',
            sourceId: assignId,
            orderIndex: idx,
          },
          idx
        )
      );

      setState((prev) => {
        const exists = prev.assignments.some(
          (a) =>
            a.title.trim().toLowerCase() === newAssign.title.trim().toLowerCase() &&
            a.dueDate === newAssign.dueDate
        );
        if (exists) return prev;
        return rebalanceScheduleForEvent(
          {
            ...prev,
            assignments: [newAssign, ...prev.assignments],
            tasks: [...newTasks, ...prev.tasks],
          },
          dueDate,
          title.split(/\s+/)
        );
      });
    } else if (actionType === 'add_goal') {
      await handleCreateGoalAI({
        title: actionPayload.title || 'New Goal',
        category: actionPayload.category || 'study',
        deadline: actionPayload.date || addDaysISO(today, 90),
      });
    } else if (actionType === 'add_opportunity') {
      const oppId = `opp-${Date.now()}`;
      const newOpp: Opportunity = {
        id: oppId,
        title: actionPayload.title || 'New Opportunity',
        organization: actionPayload.subjectOrOrg || 'Organization',
        category: 'Internship',
        applicationDeadline: actionPayload.date || addDaysISO(today, 10),
        status: 'To Apply',
        reminderDaysBefore: 3,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        opportunities: [newOpp, ...prev.opportunities],
      }));
    } else if (actionType === 'rebalance_schedule') {
      setState((prev) => {
        const updated = prev.tasks.map((t, idx) => {
          if (t.status === 'missed') {
            return {
              ...t,
              status: 'pending' as const,
              scheduledDate: addDaysISO(today, idx % 3),
              estimatedMinutes: Math.min(15, t.estimatedMinutes),
              replanReviewed: true,
            };
          }
          return t;
        });
        return { ...prev, tasks: updated };
      });
      setReplanMessage(
        actionPayload.rescheduleNote || 'Rescheduled gently across the next 3 days without overloading today.'
      );
    } else if (actionType === 'breakdown_task') {
      const steps =
        actionPayload.subSteps && actionPayload.subSteps.length > 0
          ? actionPayload.subSteps
          : [
              `Open workspace for ${actionPayload.title || 'task'}`,
              'Complete the smallest 10-minute starter piece',
            ];
      const newTasks = steps.map((st, idx) =>
        normalizeTask(
          {
            id: `sub-${Date.now()}-${idx}`,
            title: st,
            description: actionPayload.title || '',
            category: actionPayload.category || 'study',
            priority: 'medium',
            estimatedMinutes: 10,
            status: 'pending',
            scheduledDate: addDaysISO(today, idx > 1 ? 1 : 0),
            sourceType: 'custom',
            orderIndex: idx,
          },
          idx
        )
      );
      setState((prev) => ({
        ...prev,
        tasks: [...newTasks, ...prev.tasks],
      }));
    }

    setAssistantMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, confirmationResolved: 'confirmed' } : m))
    );
  };

  return (
    <ErrorBoundary onReset={() => setActiveSection('today')}>
      <div className="relative min-h-dvh text-slate-100">
        <CosmosBackdrop weather={weather} reduceMotion={state.preferences.reduceMotion} />

        <NavShell
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setError(null);
            setActiveSection(sec);
          }}
          weather={weather}
          onOpenAssistant={() => setAssistantOpen(true)}
          missedCount={missedCount}
        />

        <main className="relative z-10 lg:pl-64 pb-24 lg:pb-10">
          {activeSection === 'today' && (
            <TodayView
              state={state}
              onChangeWeather={(w: BrainWeather) =>
                setState((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, brainWeather: w },
                }))
              }
              onChangeAvailableMinutes={(mins) =>
                setState((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, availableMinutesToday: mins },
                }))
              }
              onCompleteTask={handleCompleteTask}
              onSkipTask={handleSkipTask}
              onUnstickTask={handleUnstickTask}
              onReplanMissed={handleReplanMissed}
              onAddQuickTask={(title, minutes) =>
                setState((prev) => ({
                  ...prev,
                  tasks: [
                    normalizeTask({
                      id: `quick-${Date.now()}`,
                      title,
                      estimatedMinutes: minutes,
                      priority: 'medium',
                      category: 'study',
                      scheduledDate: getTodayISO(),
                      sourceType: 'custom',
                      orderIndex: 0,
                    }),
                    ...prev.tasks,
                  ],
                }))
              }
              onGoToGoals={() => setActiveSection('goals')}
              onOpenAssistant={() => setAssistantOpen(true)}
              unstickLoading={unstickLoading}
              replanLoading={replanLoading}
              latestWin={latestWin}
              replanMessage={replanMessage}
              onDismissWin={() => setLatestWin(null)}
              error={error}
            />
          )}

          {activeSection === 'goals' && (
            <GoalsView
              state={state}
              onCreateGoalAI={handleCreateGoalAI}
              onUpdateGoal={(goalId, patch) =>
                setState((prev) => ({
                  ...prev,
                  goals: prev.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
                }))
              }
              onDeleteGoal={(goalId) => {
                const deletedGoal = state.goals.find((g) => g.id === goalId);
                const deletedTaskIds = new Set(
                  state.tasks
                    .filter((t) => t.sourceType === 'goal' && t.sourceId === goalId)
                    .map((t) => t.id)
                );
                setState((prev) => ({
                  ...prev,
                  goals: prev.goals.filter((g) => g.id !== goalId),
                  tasks: prev.tasks.filter(
                    (t) => !(t.sourceType === 'goal' && t.sourceId === goalId)
                  ),
                  wins: prev.wins.filter(
                    (w) =>
                      w.sourceId !== goalId &&
                      !deletedTaskIds.has(w.taskId) &&
                      !(deletedGoal && w.sourceTitle === deletedGoal.title)
                  ),
                }));
                setLatestWin((prev) =>
                  prev &&
                  (prev.sourceId === goalId ||
                    deletedTaskIds.has(prev.taskId) ||
                    (deletedGoal && prev.sourceTitle === deletedGoal.title))
                    ? null
                    : prev
                );
              }}
              onToggleTaskDone={handleToggleTaskDone}
              onAddGoalTask={(goalId, milestoneIndex, weeklyTargetId, title, minutes) =>
                setState((prev) => {
                  const goal = prev.goals.find((g) => g.id === goalId);
                  const existingCount = goal
                    ? getGoalProgress(goal, prev.tasks).totalCount
                    : prev.tasks.length;
                  return {
                    ...prev,
                    tasks: [
                      ...prev.tasks,
                      normalizeTask(
                        {
                          id: `goal-t-${Date.now()}`,
                          title,
                          category: goal?.category || 'study',
                          estimatedMinutes: minutes,
                          scheduledDate: getTodayISO(),
                          sourceType: 'goal',
                          sourceId: goalId,
                          milestoneIndex,
                          weeklyTargetId,
                          orderIndex: existingCount,
                        },
                        existingCount
                      ),
                    ],
                  };
                })
              }
              onDeleteTask={(taskId) => {
                setState((prev) => ({
                  ...prev,
                  tasks: prev.tasks.filter((t) => t.id !== taskId),
                  wins: prev.wins.filter((w) => w.taskId !== taskId),
                }));
                setLatestWin((prev) => (prev?.taskId === taskId ? null : prev));
              }}
              loading={goalLoading}
              error={error}
            />
          )}

          {activeSection === 'assignments' && (
            <AssignmentsView
              state={state}
              onExtractAssignment={handleExtractAssignment}
              onToggleTaskDone={handleToggleTaskDone}
              onUpdateTask={(taskId, patch) =>
                setState((prev) => ({
                  ...prev,
                  tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
                }))
              }
              onMoveTaskOrder={(assignmentId, taskId, direction) =>
                setState((prev) => {
                  const assignTasks = prev.tasks
                    .filter((t) => t.sourceType === 'assignment' && t.sourceId === assignmentId)
                    .sort((a, b) => a.orderIndex - b.orderIndex);
                  const idx = assignTasks.findIndex((t) => t.id === taskId);
                  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
                  if (idx < 0 || swapIdx < 0 || swapIdx >= assignTasks.length) return prev;
                  const a = assignTasks[idx];
                  const b = assignTasks[swapIdx];
                  const orderMap = new Map<string, number>();
                  assignTasks.forEach((t, i) => orderMap.set(t.id, i));
                  orderMap.set(a.id, swapIdx);
                  orderMap.set(b.id, idx);
                  return {
                    ...prev,
                    tasks: prev.tasks.map((t) =>
                      orderMap.has(t.id) ? { ...t, orderIndex: orderMap.get(t.id)! } : t
                    ),
                  };
                })
              }
              onAddTaskToAssignment={(assignmentId, title, minutes) =>
                setState((prev) => {
                  const count = prev.tasks.filter(
                    (t) => t.sourceType === 'assignment' && t.sourceId === assignmentId
                  ).length;
                  return {
                    ...prev,
                    tasks: [
                      ...prev.tasks,
                      normalizeTask({
                        id: `assign-t-${Date.now()}`,
                        title,
                        category: 'study',
                        estimatedMinutes: minutes,
                        scheduledDate: getTodayISO(),
                        sourceType: 'assignment',
                        sourceId: assignmentId,
                        orderIndex: count,
                      }),
                    ],
                  };
                })
              }
              onDeleteTask={(taskId) => {
                setState((prev) => ({
                  ...prev,
                  tasks: prev.tasks.filter((t) => t.id !== taskId),
                  wins: prev.wins.filter((w) => w.taskId !== taskId),
                }));
                setLatestWin((prev) => (prev?.taskId === taskId ? null : prev));
              }}
              onDeleteAssignment={(assignmentId) => {
                const deletedTaskIds = new Set(
                  state.tasks
                    .filter((t) => t.sourceType === 'assignment' && t.sourceId === assignmentId)
                    .map((t) => t.id)
                );
                setState((prev) => ({
                  ...prev,
                  assignments: prev.assignments.filter((a) => a.id !== assignmentId),
                  tasks: prev.tasks.filter(
                    (t) => !(t.sourceType === 'assignment' && t.sourceId === assignmentId)
                  ),
                  wins: prev.wins.filter(
                    (w) => w.sourceId !== assignmentId && !deletedTaskIds.has(w.taskId)
                  ),
                }));
                setLatestWin((prev) =>
                  prev && (prev.sourceId === assignmentId || deletedTaskIds.has(prev.taskId))
                    ? null
                    : prev
                );
              }}
              loading={assignmentLoading}
              error={error}
            />
          )}

          {activeSection === 'planner' && (
            <PlannerView
              state={state}
              onUpdateTask={(taskId, patch) =>
                setState((prev) => ({
                  ...prev,
                  tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
                }))
              }
              onToggleTaskDone={handleToggleTaskDone}
              onSimulateMissedDays={() => {
                setError(null);
                setReplanMessage(null);
                setState((prev) => createSimulatedMissedDaysState(prev));
              }}
              onReplanMissed={handleReplanMissed}
              replanLoading={replanLoading}
              replanMessage={replanMessage}
              error={error}
            />
          )}

          {activeSection === 'opportunities' && (
            <OpportunitiesView
              state={state}
              onExtractOpportunity={handleExtractOpportunity}
              onSaveOpportunity={handleSaveOpportunity}
              onUpdateOpportunity={(id, patch) =>
                setState((prev) => ({
                  ...prev,
                  opportunities: prev.opportunities.map((o) =>
                    o.id === id ? { ...o, ...patch } : o
                  ),
                }))
              }
              onDeleteOpportunity={(id) => {
                const deletedTaskIds = new Set(
                  state.tasks
                    .filter((t) => t.sourceType === 'opportunity' && t.sourceId === id)
                    .map((t) => t.id)
                );
                setState((prev) => ({
                  ...prev,
                  opportunities: prev.opportunities.filter((o) => o.id !== id),
                  tasks: prev.tasks.filter(
                    (t) => !(t.sourceType === 'opportunity' && t.sourceId === id)
                  ),
                  wins: prev.wins.filter(
                    (w) => w.sourceId !== id && !deletedTaskIds.has(w.taskId)
                  ),
                }));
                setLatestWin((prev) =>
                  prev && (prev.sourceId === id || deletedTaskIds.has(prev.taskId))
                    ? null
                    : prev
                );
              }}
              onAddPrepTaskToToday={(opp) =>
                setState((prev) => ({
                  ...prev,
                  tasks: [
                    normalizeTask({
                      id: `opp-prep-${Date.now()}`,
                      title: `Prepare & review ${opp.title} (${opp.organization})`,
                      description: `Deadline ${opp.applicationDeadline}`,
                      category: 'career',
                      priority: 'high',
                      estimatedMinutes: 15,
                      scheduledDate: getTodayISO(),
                      sourceType: 'opportunity',
                      sourceId: opp.id,
                      firstAction: `Open the application link/notes for ${opp.title}.`,
                    }),
                    ...prev.tasks,
                  ],
                }))
              }
              loading={opportunityLoading}
              error={error}
            />
          )}

          {activeSection === 'insights' && (
            <InsightsView
              state={state}
              onRefreshPattern={async () => {
                setError(null);
                setPatternLoading(true);
                try {
                  const stats = computeInsightsMetrics(state);
                  const { sentence } = await fetchPatternInsight({ stats });
                  setState((prev) => ({
                    ...prev,
                    patternInsight: { sentence, generatedAt: new Date().toISOString() },
                  }));
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'Could not refresh observation right now.'
                  );
                } finally {
                  setPatternLoading(false);
                }
              }}
              onLookupGitHub={async (username) => {
                setError(null);
                setGithubLoading(true);
                try {
                  const activity = await fetchGitHubActivity(username);
                  setState((prev) => ({
                    ...prev,
                    githubActivity: activity,
                    preferences: { ...prev.preferences, githubUsername: username },
                  }));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not reach GitHub.');
                } finally {
                  setGithubLoading(false);
                }
              }}
              onDeleteWin={(winId) => {
                setState((prev) => ({
                  ...prev,
                  wins: prev.wins.filter((w) => w.id !== winId),
                }));
                setLatestWin((prev) => (prev?.id === winId ? null : prev));
              }}
              patternLoading={patternLoading}
              githubLoading={githubLoading}
              error={error}
            />
          )}

          {activeSection === 'privacy' && (
            <PrivacyView
              state={state}
              onToggleReduceMotion={(enabled) =>
                setState((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, reduceMotion: enabled },
                }))
              }
              onToggleOnePasteCapture={(enabled) =>
                setState((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, onePasteCaptureEnabled: enabled },
                }))
              }
              onToggleVoiceAssistant={(enabled) =>
                setState((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, voiceAssistantEnabled: enabled },
                }))
              }
              onDeleteAllData={() => {
                setState(clearOrbitState());
                setAssistantMessages([]);
                setLatestWin(null);
                setReplanMessage(null);
                setError(null);
                setActiveSection('today');
              }}
            />
          )}
        </main>

        <AssistantDrawer
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          messages={assistantMessages}
          loading={assistantLoading}
          voiceEnabled={state.preferences.voiceAssistantEnabled}
          onSendMessage={handleSendAssistantMessage}
          onConfirmProposal={handleConfirmProposal}
          onCancelProposal={(messageId) =>
            setAssistantMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, confirmationResolved: 'cancelled' } : m
              )
            )
          }
        />
      </div>
    </ErrorBoundary>
  );
}
