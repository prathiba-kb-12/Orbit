import { useMemo, useState } from 'react';
import { CalendarDays, Check, RotateCcw, Sparkles } from 'lucide-react';
import type { BlockerReason, OrbitState, OrbitTask, TaskPriority } from '../types';
import {
  addDaysISO,
  daysBetweenISO,
  getGoalProgress,
  getTodayISO,
  getUnreviewedMissedTasks,
} from '../lib/orbitStore';

interface PlannerViewProps {
  state: OrbitState;
  onUpdateTask: (taskId: string, patch: Partial<OrbitTask>) => void;
  onToggleTaskDone: (task: OrbitTask) => void;
  onSimulateMissedDays: () => void;
  onReplanMissed: (reason: BlockerReason, missed: OrbitTask[]) => Promise<void>;
  replanLoading: boolean;
  replanMessage: string | null;
  error: string | null;
}

export function PlannerView({
  state,
  onUpdateTask,
  onToggleTaskDone,
  onSimulateMissedDays,
  onReplanMissed,
  replanLoading,
  replanMessage,
  error,
}: PlannerViewProps) {
  const [mode, setMode] = useState<'weekly' | 'monthly'>('weekly');
  const today = getTodayISO();
  const missedTasks = useMemo(() => getUnreviewedMissedTasks(state), [state]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDaysISO(today, i);
      const label =
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tomorrow'
            : new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
      const dayTasks = state.tasks
        .filter((t) => t.scheduledDate === date && t.status !== 'skipped')
        .sort((a, b) => a.orderIndex - b.orderIndex);
      return { date, label, dayTasks };
    });
  }, [state.tasks, today]);

  const upcomingDeadlines = useMemo(() => {
    const items: Array<{ id: string; title: string; date: string; kind: string }> = [
      ...state.assignments.map((a) => ({
        id: a.id,
        title: `${a.title} (${a.subject})`,
        date: a.dueDate,
        kind: a.kind,
      })),
      ...state.opportunities
        .filter((o) => o.status !== 'Expired' && o.status !== 'Completed')
        .map((o) => ({
          id: o.id,
          title: `${o.title} — ${o.organization}`,
          date: o.applicationDeadline,
          kind: o.category,
        })),
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [state.assignments, state.opportunities]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#D6A04A]">Planner · Weekly &amp; Monthly</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F3F4F6] mt-1">
            Schedule &amp; Milestones
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Adjust dates, resize durations, or run a gentle recovery when days slip.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-[#1A1D24] border border-[#262B36] p-1">
            <button
              type="button"
              onClick={() => setMode('weekly')}
              className={`min-h-[34px] rounded-lg px-3.5 text-xs font-medium transition-colors ${
                mode === 'weekly'
                  ? 'bg-[#D6A04A] text-[#111318] font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setMode('monthly')}
              className={`min-h-[34px] rounded-lg px-3.5 text-xs font-medium transition-colors ${
                mode === 'monthly'
                  ? 'bg-[#D6A04A] text-[#111318] font-semibold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              Monthly
            </button>
          </div>

          <button
            type="button"
            onClick={onSimulateMissedDays}
            className="min-h-[38px] rounded-xl bg-[#1A1D24] hover:bg-[#222630] border border-[#262B36] px-3.5 text-xs font-medium text-[#E5E7EB] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#D6A04A]" />
            <span>Simulate missed tasks</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[#D6A04A]/10 border border-[#D6A04A]/35 px-4 py-3 text-sm text-[#F5DEB3]">
          {error}
        </div>
      )}

      {replanMessage && (
        <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 px-4 py-3 text-sm text-teal-200">
          {replanMessage}
        </div>
      )}

      {/* Gentle Recovery Plan for Missed Tasks */}
      {missedTasks.length > 0 && (
        <section className="bg-[#1A1D24] border border-[#2E3442] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#D6A04A] text-xs font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Gentle Recovery · {missedTasks.length} missed task(s)</span>
          </div>
          <p className="text-sm text-[#E5E7EB]">
            Pick how Orbit should reshape your missed tasks without overloading today:
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'too_big', label: 'Split smaller (5–10m)' },
                { id: 'too_tired', label: 'Spread gently over 3 days' },
                { id: 'exam', label: 'Prioritize exam/assignment' },
                { id: 'forgot', label: 'Move cleanly to today' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={replanLoading}
                onClick={() => onReplanMissed(opt.id, missedTasks)}
                className="min-h-[38px] rounded-xl bg-[#14171D] hover:bg-[#222630] border border-[#262B36] px-3.5 text-xs font-medium text-[#F3F4F6] disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'weekly' ? (
        <div className="space-y-4">
          {state.goals.some((g) => g.status === 'active' && g.weeklyTargets.length > 0) && (
            <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
                Weekly Targets
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {state.goals
                  .filter((g) => g.status === 'active')
                  .flatMap((g) =>
                    g.weeklyTargets.slice(0, 3).map((wt) => ({
                      ...wt,
                      goalTitle: g.title,
                    }))
                  )
                  .map((wt) => (
                    <div
                      key={wt.id}
                      className="rounded-xl bg-[#14171D] border border-[#242934] p-3.5"
                    >
                      <div className="text-xs font-medium text-[#D6A04A] truncate">
                        {wt.goalTitle} · Week {wt.weekNumber}
                      </div>
                      <div className="text-sm font-medium text-[#F3F4F6] mt-0.5">{wt.title}</div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* 7-Day Task Rows */}
          <div className="space-y-3.5">
            {weekDays.map((day) => {
              const totalMin = day.dayTasks
                .filter((t) => t.status !== 'completed')
                .reduce((acc, t) => acc + t.estimatedMinutes, 0);

              return (
                <section
                  key={day.date}
                  className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#D6A04A]" />
                      <h3 className="text-base font-semibold text-[#F3F4F6]">{day.label}</h3>
                      <span className="text-xs text-[#6B7280] font-mono-tabular">{day.date}</span>
                    </div>
                    <span className="text-xs text-[#9CA3AF] font-mono-tabular">
                      {day.dayTasks.length} task{day.dayTasks.length === 1 ? '' : 's'} · {totalMin}m remaining
                    </span>
                  </div>

                  {day.dayTasks.length === 0 ? (
                    <p className="text-xs text-[#6B7280]">
                      Open breathing room — no tasks scheduled.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {day.dayTasks.map((task) => {
                        const done = task.status === 'completed';
                        return (
                          <div
                            key={task.id}
                            className="rounded-xl bg-[#14171D] border border-[#242934] px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <button
                              type="button"
                              onClick={() => onToggleTaskDone(task)}
                              className="flex items-center gap-3 text-left flex-1 min-h-[34px]"
                            >
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  done
                                    ? 'bg-teal-400 border-teal-400 text-[#111318]'
                                    : 'border-[#3B4252] bg-[#1A1D24] text-transparent'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <div
                                  className={`text-sm font-medium ${
                                    done ? 'line-through text-[#6B7280]' : 'text-[#F3F4F6]'
                                  }`}
                                >
                                  {task.title}
                                </div>
                                <div className="text-xs text-[#9CA3AF] capitalize">
                                  {task.sourceType} · {task.category}
                                </div>
                              </div>
                            </button>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <input
                                type="date"
                                value={task.scheduledDate}
                                onChange={(e) =>
                                  onUpdateTask(task.id, {
                                    scheduledDate: e.target.value,
                                    postponeCount:
                                      e.target.value > task.scheduledDate
                                        ? (task.postponeCount || 0) + 1
                                        : task.postponeCount,
                                  })
                                }
                                aria-label="Reschedule date"
                                className="min-h-[32px] rounded-lg bg-[#1A1D24] border border-[#2E3442] px-2.5 text-xs font-mono-tabular text-[#F3F4F6]"
                              />
                              <select
                                value={task.estimatedMinutes}
                                onChange={(e) =>
                                  onUpdateTask(task.id, {
                                    estimatedMinutes: Number(e.target.value),
                                  })
                                }
                                aria-label="Duration minutes"
                                className="min-h-[32px] rounded-lg bg-[#1A1D24] border border-[#2E3442] px-2 text-xs font-medium text-[#F3F4F6]"
                              >
                                <option value={5}>5m</option>
                                <option value={10}>10m</option>
                                <option value={15}>15m</option>
                                <option value={25}>25m</option>
                                <option value={30}>30m</option>
                              </select>
                              <select
                                value={task.priority}
                                onChange={(e) =>
                                  onUpdateTask(task.id, {
                                    priority: e.target.value as TaskPriority,
                                  })
                                }
                                aria-label="Priority"
                                className="min-h-[32px] rounded-lg bg-[#1A1D24] border border-[#2E3442] px-2 text-xs font-medium text-[#F3F4F6] capitalize"
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        /* Monthly View */
        <div className="space-y-6">
          <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Major Deadlines (Assignments, Exams &amp; Opportunities)
            </h2>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-[#9CA3AF]">No upcoming deadlines recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((d) => {
                  const days = daysBetweenISO(today, d.date);
                  return (
                    <div
                      key={d.id}
                      className="rounded-xl bg-[#14171D] border border-[#242934] px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-medium uppercase text-[#D6A04A]">{d.kind}</div>
                        <div className="text-sm font-medium text-[#F3F4F6]">{d.title}</div>
                      </div>
                      <div className="text-right font-mono-tabular">
                        <div className="text-sm font-medium text-[#F3F4F6]">{d.date}</div>
                        <div className="text-xs text-[#9CA3AF]">
                          {days >= 0 ? `in ${days}d` : `${Math.abs(days)}d ago`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              Goal Monthly Milestones (Luna → Vega → Polaris)
            </h2>
            {state.goals.length === 0 ? (
              <p className="text-sm text-[#9CA3AF]">
                Create a goal to see your monthly roadmap here.
              </p>
            ) : (
              <div className="space-y-4">
                {state.goals
                  .filter((g) => g.status !== 'archived')
                  .map((goal) => {
                    const stats = getGoalProgress(goal, state.tasks);
                    return (
                      <div
                        key={goal.id}
                        className="rounded-xl bg-[#14171D] border border-[#242934] p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs text-[#9CA3AF] capitalize">
                              {goal.category} · {goal.status} · Due {goal.deadline}
                            </div>
                            <h3 className="text-base font-semibold text-[#F3F4F6]">{goal.title}</h3>
                          </div>
                          <span className="text-base font-semibold font-mono-tabular text-[#D6A04A]">
                            {stats.overallPercent}%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {stats.milestoneStats.map((m) => (
                            <div
                              key={m.id}
                              className="rounded-xl bg-[#1A1D24] border border-[#262B36] p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-[#D6A04A]">
                                  {m.planetName} · {m.monthLabel}
                                </span>
                                <span className="font-mono-tabular text-[#E5E7EB]">
                                  {m.percent}%
                                </span>
                              </div>
                              <div className="text-xs font-medium text-[#F3F4F6]">{m.title}</div>
                              <div className="text-[11px] text-[#9CA3AF] font-mono-tabular">
                                Target {m.dueDate} · {m.completed}/{m.total} steps
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
