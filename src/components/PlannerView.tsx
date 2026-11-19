import { useMemo, useState } from 'react';
import { CalendarDays, Check, Circle, RotateCcw, Sparkles } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Planner · Weekly &amp; Monthly
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
            Schedule &amp; Milestones
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Adjust dates, resize durations, or run a gentle recovery when days slip.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl bg-white/[0.06] border border-white/12 p-1">
            <button
              type="button"
              onClick={() => setMode('weekly')}
              className={`min-h-[38px] rounded-xl px-4 text-xs font-extrabold transition-colors ${
                mode === 'weekly'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setMode('monthly')}
              className={`min-h-[38px] rounded-xl px-4 text-xs font-extrabold transition-colors ${
                mode === 'monthly'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>

          <button
            type="button"
            onClick={onSimulateMissedDays}
            className="min-h-[40px] rounded-2xl bg-violet-400/15 hover:bg-violet-400/25 border border-violet-300/30 px-3.5 text-xs font-extrabold text-violet-100 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Simulate missed tasks</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-amber-400/12 border border-amber-300/30 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {replanMessage && (
        <div className="rounded-2xl bg-teal-400/12 border border-teal-300/30 px-4 py-3 text-sm text-teal-100">
          {replanMessage}
        </div>
      )}

      {/* Gentle Recovery Plan for Missed Tasks */}
      {missedTasks.length > 0 && (
        <section className="aurora-glass-card rounded-[26px] p-5 border border-violet-300/30 space-y-3">
          <div className="flex items-center gap-2 text-violet-200 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Gentle Recovery · {missedTasks.length} missed task(s)</span>
          </div>
          <p className="text-sm text-slate-200">
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
                className="min-h-[40px] rounded-xl bg-violet-400/18 hover:bg-violet-400/30 border border-violet-300/30 px-3.5 text-xs font-extrabold text-violet-100 disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {mode === 'weekly' ? (
        <div className="space-y-5">
          {/* Active Weekly Targets */}
          {state.goals.some((g) => g.status === 'active' && g.weeklyTargets.length > 0) && (
            <section className="aurora-glass-card rounded-[26px] p-5 space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
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
                      className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5"
                    >
                      <div className="text-[11px] font-bold text-amber-300 truncate">
                        {wt.goalTitle} · Week {wt.weekNumber}
                      </div>
                      <div className="text-sm font-bold text-slate-100 mt-0.5">{wt.title}</div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* 7-Day Task Columns/Rows */}
          <div className="space-y-4">
            {weekDays.map((day) => {
              const totalMin = day.dayTasks
                .filter((t) => t.status !== 'completed')
                .reduce((acc, t) => acc + t.estimatedMinutes, 0);

              return (
                <section key={day.date} className="aurora-glass-card rounded-[24px] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-amber-300" />
                      <h3 className="text-base font-extrabold text-slate-50">{day.label}</h3>
                      <span className="text-xs text-slate-400 font-mono-tabular">{day.date}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-300 font-mono-tabular">
                      {day.dayTasks.length} task{day.dayTasks.length === 1 ? '' : 's'} · {totalMin}m remaining
                    </span>
                  </div>

                  {day.dayTasks.length === 0 ? (
                    <p className="text-xs text-slate-400">Open breathing room — no tasks scheduled.</p>
                  ) : (
                    <div className="space-y-2">
                      {day.dayTasks.map((task) => {
                        const done = task.status === 'completed';
                        return (
                          <div
                            key={task.id}
                            className="rounded-2xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <button
                              type="button"
                              onClick={() => onToggleTaskDone(task)}
                              className="flex items-center gap-3 text-left flex-1 min-h-[36px]"
                            >
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  done
                                    ? 'bg-teal-400 border-teal-300 text-slate-950'
                                    : 'border-white/30 bg-white/5 text-transparent'
                                }`}
                              >
                                {done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                              </span>
                              <div>
                                <div
                                  className={`text-sm font-bold ${
                                    done ? 'line-through text-slate-400' : 'text-slate-100'
                                  }`}
                                >
                                  {task.title}
                                </div>
                                <div className="text-xs text-slate-400 capitalize">
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
                                className="min-h-[34px] rounded-xl bg-[#101638] border border-white/15 px-2.5 text-xs font-mono-tabular text-slate-100"
                              />
                              <select
                                value={task.estimatedMinutes}
                                onChange={(e) =>
                                  onUpdateTask(task.id, {
                                    estimatedMinutes: Number(e.target.value),
                                  })
                                }
                                aria-label="Duration minutes"
                                className="min-h-[34px] rounded-xl bg-[#101638] border border-white/15 px-2 text-xs font-bold text-slate-100"
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
                                className="min-h-[34px] rounded-xl bg-[#101638] border border-white/15 px-2 text-xs font-bold text-slate-100 capitalize"
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
          {/* Major Deadlines Timeline */}
          <section className="aurora-glass-card rounded-[28px] p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-slate-50">
              Major Deadlines (Assignments, Exams &amp; Opportunities)
            </h2>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming deadlines recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((d) => {
                  const days = daysBetweenISO(today, d.date);
                  return (
                    <div
                      key={d.id}
                      className="rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold uppercase text-amber-300">{d.kind}</div>
                        <div className="text-sm font-extrabold text-slate-100">{d.title}</div>
                      </div>
                      <div className="text-right font-mono-tabular">
                        <div className="text-sm font-extrabold text-slate-100">{d.date}</div>
                        <div className="text-xs text-slate-400">
                          {days >= 0 ? `in ${days}d` : `${Math.abs(days)}d ago`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Monthly Milestones across Goals (Luna, Vega, Polaris) */}
          <section className="aurora-glass-card rounded-[28px] p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-slate-50">
              Goal Monthly Milestones (Luna → Vega → Polaris)
            </h2>
            {state.goals.length === 0 ? (
              <p className="text-sm text-slate-400">Create a goal to see your monthly roadmap here.</p>
            ) : (
              <div className="space-y-5">
                {state.goals
                  .filter((g) => g.status !== 'archived')
                  .map((goal) => {
                    const stats = getGoalProgress(goal, state.tasks);
                    return (
                      <div
                        key={goal.id}
                        className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-400 capitalize">
                              {goal.category} · {goal.status} · Due {goal.deadline}
                            </div>
                            <h3 className="text-base font-extrabold text-slate-50">{goal.title}</h3>
                          </div>
                          <span className="text-base font-extrabold font-mono-tabular text-amber-300">
                            {stats.overallPercent}%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {stats.milestoneStats.map((m) => (
                            <div
                              key={m.id}
                              className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-extrabold">
                                <span className="text-teal-300">
                                  {m.planetName} · {m.monthLabel}
                                </span>
                                <span className="font-mono-tabular text-slate-200">{m.percent}%</span>
                              </div>
                              <div className="text-xs font-bold text-slate-100">{m.title}</div>
                              <div className="text-[11px] text-slate-400 font-mono-tabular">
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
