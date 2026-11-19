import { useMemo, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  Check,
  Pause,
  Play,
  Archive,
  Trash2,
  Edit3,
  Sparkles,
  Circle,
} from 'lucide-react';
import type { Goal, GoalStatus, OrbitState, OrbitTask } from '../types';
import { addDaysISO, getGoalProgress, getTodayISO } from '../lib/orbitStore';

interface GoalsViewProps {
  state: OrbitState;
  onCreateGoalAI: (input: {
    title: string;
    category: string;
    deadline: string;
    syllabus?: string;
    currentLevel?: string;
  }) => Promise<void>;
  onUpdateGoal: (goalId: string, patch: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleTaskDone: (task: OrbitTask) => void;
  onAddGoalTask: (goalId: string, milestoneIndex: number, weeklyTargetId: string | undefined, title: string, minutes: number) => void;
  onDeleteTask: (taskId: string) => void;
  loading: boolean;
  error: string | null;
}

const PLANET_ACCENTS = [
  'text-teal-300 border-teal-300/30 bg-teal-400/10',
  'text-amber-300 border-amber-300/30 bg-amber-400/10',
  'text-violet-300 border-violet-300/30 bg-violet-400/10',
];

export function GoalsView({
  state,
  onCreateGoalAI,
  onUpdateGoal,
  onDeleteGoal,
  onToggleTaskDone,
  onAddGoalTask,
  onDeleteTask,
  loading,
  error,
}: GoalsViewProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | GoalStatus>('all');

  // Create form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('study');
  const [deadline, setDeadline] = useState(() => addDaysISO(getTodayISO(), 90));
  const [currentLevel, setCurrentLevel] = useState('');
  const [syllabus, setSyllabus] = useState('');

  // Edit title modal inline
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  // Quick add task inside goal detail
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskWeekNumber, setNewTaskWeekNumber] = useState(1);
  const [newTaskMinutes, setNewTaskMinutes] = useState(15);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedGoal = useMemo(
    () => state.goals.find((g) => g.id === selectedGoalId) ?? null,
    [state.goals, selectedGoalId]
  );

  const filteredGoals = useMemo(
    () =>
      state.goals.filter(
        (g) =>
          String(g.category || '').toLowerCase() !== 'work' &&
          (statusFilter === 'all' ? g.status !== 'archived' : g.status === statusFilter)
      ),
    [state.goals, statusFilter]
  );

  if (selectedGoal) {
    const progress = getGoalProgress(selectedGoal, state.tasks);
    const isEditing = editingGoalId === selectedGoal.id;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedGoalId(null);
              setEditingGoalId(null);
              setConfirmDeleteId(null);
            }}
            className="min-h-[44px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 px-4 text-sm font-extrabold text-slate-100 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Goals</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingGoalId(selectedGoal.id);
                setEditTitle(selectedGoal.title);
                setEditDeadline(selectedGoal.deadline);
              }}
              className="min-h-[40px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 px-3.5 text-xs font-extrabold text-slate-200 flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateGoal(selectedGoal.id, {
                  status: selectedGoal.status === 'paused' ? 'active' : 'paused',
                })
              }
              className="min-h-[40px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 px-3.5 text-xs font-extrabold text-slate-200 flex items-center gap-1.5"
            >
              {selectedGoal.status === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateGoal(selectedGoal.id, {
                  status: selectedGoal.status === 'archived' ? 'active' : 'archived',
                })
              }
              className="min-h-[40px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 px-3.5 text-xs font-extrabold text-slate-200 flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{selectedGoal.status === 'archived' ? 'Unarchive' : 'Archive'}</span>
            </button>
            {confirmDeleteId === selectedGoal.id ? (
              <button
                type="button"
                onClick={() => {
                  onDeleteGoal(selectedGoal.id);
                  setSelectedGoalId(null);
                }}
                className="min-h-[40px] rounded-2xl bg-amber-400 text-slate-950 px-3.5 text-xs font-extrabold"
              >
                Confirm Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(selectedGoal.id)}
                className="min-h-[40px] rounded-2xl bg-white/[0.05] hover:bg-amber-400/20 border border-white/12 px-3.5 text-xs font-bold text-slate-300 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Goal Summary Header */}
        <section className="aurora-glass-card rounded-[28px] p-6 space-y-4">
          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editTitle.trim()) return;
                onUpdateGoal(selectedGoal.id, {
                  title: editTitle.trim(),
                  deadline: editDeadline,
                });
                setEditingGoalId(null);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl bg-white/10 border border-white/20 px-4 text-lg font-extrabold text-white"
              />
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="min-h-[40px] rounded-xl bg-white/10 border border-white/20 px-3 text-sm text-white"
                />
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs px-4"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGoalId(null)}
                  className="min-h-[40px] rounded-xl bg-white/10 text-slate-200 font-bold text-xs px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-xs font-bold text-amber-300">
                {selectedGoal.category.toUpperCase()} · {selectedGoal.status} · Due {selectedGoal.deadline}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
                {selectedGoal.title}
              </h1>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-slate-300">
                Overall Progress ({progress.completedCount} of {progress.totalCount} steps)
              </span>
              <span className="font-mono-tabular text-amber-300">{progress.overallPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-300 via-amber-300 to-violet-300 transition-all duration-300"
                style={{ width: `${progress.overallPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* Monthly Milestones (3 Months x 4 Weeks = 12 Weeks Total) */}
        <section className="space-y-5">
          {progress.milestoneStats.map((m, idx) => {
            const tone = PLANET_ACCENTS[idx % PLANET_ACCENTS.length];

            return (
              <div key={m.id} className="aurora-glass-card rounded-[28px] p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                      <span className={tone.split(' ')[0]}>{m.planetName}</span> · {m.monthLabel} · Target{' '}
                      {m.dueDate}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-50 mt-0.5">{m.title}</h2>
                    <p className="text-sm text-slate-300 mt-0.5">{m.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-extrabold font-mono-tabular text-slate-50">
                      {m.percent}%
                    </div>
                    <div className="text-xs text-slate-400 font-mono-tabular">
                      {m.completed}/{m.total} tasks · {m.completedWeeks}/{m.totalWeeks} weeks
                    </div>
                  </div>
                </div>

                {/* Monthly Progress Bar */}
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-300 via-amber-300 to-violet-300 transition-all duration-300"
                    style={{ width: `${m.percent}%` }}
                  />
                </div>

                {/* 4 Weekly Sections inside this Month */}
                <div className="space-y-3">
                  {m.weeks.map((wt) => (
                    <div
                      key={wt.id}
                      className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                        wt.isComplete
                          ? 'bg-teal-400/[0.06] border-teal-300/30'
                          : 'bg-white/[0.04] border-white/10'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <span>Week {wt.weekNumber}</span>
                            {wt.isComplete && (
                              <span className="text-teal-300 inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Week complete</span>
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-extrabold text-slate-100 mt-0.5">
                            {wt.title}
                          </h3>
                        </div>
                        <div className="text-xs font-extrabold font-mono-tabular text-teal-300 shrink-0">
                          {wt.completed}/{wt.total} · {wt.percent}%
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-300 transition-all duration-300"
                          style={{ width: `${wt.percent}%` }}
                        />
                      </div>

                      {/* Tasks inside this Week */}
                      <div className="space-y-2">
                        {wt.tasks.map((t) => {
                          const done = t.status === 'completed';
                          return (
                            <div
                              key={t.id}
                              className="rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                            >
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={done}
                                onClick={() => onToggleTaskDone(t)}
                                className="flex items-center gap-3 text-left flex-1 min-h-[36px]"
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                    done
                                      ? 'bg-teal-400 border-teal-300 text-slate-950'
                                      : 'border-white/30 bg-white/5 text-transparent'
                                  }`}
                                >
                                  {done ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Circle className="w-3 h-3" />
                                  )}
                                </span>
                                <div>
                                  <div
                                    className={`text-sm font-bold ${
                                      done ? 'line-through text-slate-400' : 'text-slate-100'
                                    }`}
                                  >
                                    {t.title}
                                  </div>
                                  <div className="text-xs text-slate-400 font-mono-tabular">
                                    {t.estimatedMinutes}m · {t.scheduledDate}
                                  </div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteTask(t.id)}
                                aria-label={`Delete ${t.title}`}
                                className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Add Task to Goal */}
        <section className="aurora-glass-card rounded-[24px] p-5">
          <h3 className="text-sm font-extrabold text-slate-100 mb-3">Add Step to Goal</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskTitle.trim()) return;
              const pickedTarget = progress.weeklyStats.find(
                (wt) => wt.weekNumber === newTaskWeekNumber
              );
              const targetMilestone = pickedTarget
                ? pickedTarget.milestoneIndex
                : Math.floor((newTaskWeekNumber - 1) / 4);
              onAddGoalTask(
                selectedGoal.id,
                targetMilestone,
                pickedTarget?.id,
                newTaskTitle.trim(),
                newTaskMinutes
              );
              setNewTaskTitle('');
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g., Practice CSV reader script..."
              className="flex-1 min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100"
            />
            <select
              value={newTaskWeekNumber}
              onChange={(e) => setNewTaskWeekNumber(Number(e.target.value))}
              aria-label="Target week"
              className="min-h-[44px] rounded-2xl bg-[#101638] border border-white/12 px-3 text-sm font-bold text-slate-100"
            >
              {progress.weeklyStats.map((wt) => (
                <option key={wt.id} value={wt.weekNumber}>
                  Month {wt.milestoneIndex + 1} · Week {wt.weekNumber}
                </option>
              ))}
            </select>
            <select
              value={newTaskMinutes}
              onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
              className="min-h-[44px] rounded-2xl bg-[#101638] border border-white/12 px-3 text-sm font-bold text-slate-100"
            >
              <option value={10}>10m</option>
              <option value={15}>15m</option>
              <option value={25}>25m</option>
            </select>
            <button
              type="submit"
              className="min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-4 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Goals · Long-Term Progress
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
            Your Active Orbits
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Each goal breaks into Luna, Vega, and Polaris milestones. Completing tasks in Today updates these automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="min-h-[46px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-5 py-2.5 flex items-center justify-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Close Form' : 'New Goal'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-amber-400/12 border border-amber-300/30 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {/* Create New Goal Form */}
      {showCreateForm && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            await onCreateGoalAI({
              title: title.trim(),
              category,
              deadline,
              syllabus: syllabus.trim() || undefined,
              currentLevel: currentLevel.trim() || undefined,
            });
            setTitle('');
            setSyllabus('');
            setCurrentLevel('');
            setShowCreateForm(false);
          }}
          className="aurora-glass-card rounded-[28px] p-6 space-y-4 border border-amber-300/30"
        >
          <div className="flex items-center gap-2 text-amber-300 text-sm font-extrabold">
            <Sparkles className="w-4 h-4" />
            <span>AI Goal Breakdown (Luna → Vega → Polaris)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">Goal title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Python Automation, Data Structures Mastery, Portfolio Project"
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl bg-[#101638] border border-white/12 px-3 text-sm font-bold text-slate-100"
              >
                <option value="study">Study</option>
                <option value="career">Career</option>
                <option value="project">Project</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Target deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Current level (optional)
              </label>
              <input
                type="text"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                placeholder="e.g., Know basic syntax, want real scripts"
                className="w-full min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Syllabus or roadmap topics (optional — Orbit follows your topics in order)
            </label>
            <textarea
              rows={3}
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="e.g., Foundations → File handling → CSV → API requests → Mini-project"
              className="w-full rounded-2xl bg-white/[0.06] border border-white/12 p-3.5 text-sm text-slate-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="min-h-[46px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-6 py-2.5 disabled:opacity-60"
            >
              {loading ? 'Breaking down into steps...' : 'Create Goal & Milestones'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="min-h-[46px] rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-sm px-5 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'active', 'paused', 'archived'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`min-h-[38px] rounded-xl px-3.5 text-xs font-extrabold capitalize transition-colors ${
              statusFilter === status
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/[0.06] text-slate-300 hover:text-white'
            }`}
          >
            {status === 'all' ? 'Active & Paused' : status}
          </button>
        ))}
      </div>

      {/* Goal Cards Grid */}
      {filteredGoals.length === 0 ? (
        <div className="aurora-glass-card rounded-[28px] p-8 text-center">
          <h2 className="text-xl font-extrabold text-slate-50">No goals in this view yet</h2>
          <p className="text-sm text-slate-300 mt-1">
            Tap &ldquo;New Goal&rdquo; above or ask Orbit Assistant to break down a syllabus or 3-month track.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => {
            const stats = getGoalProgress(goal, state.tasks);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedGoalId(goal.id)}
                className="aurora-glass-card rounded-[26px] p-5 text-left hover:border-amber-300/35 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-300">
                      <span className="capitalize text-amber-300">{goal.category}</span>
                      {' · '}
                      <span className="capitalize">{goal.status}</span>
                      {' · '}
                      <span className="font-mono-tabular">Due {goal.deadline}</span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-50 mt-1">{goal.title}</h2>
                  </div>
                  <span className="text-xl font-extrabold font-mono-tabular text-amber-300">
                    {stats.overallPercent}%
                  </span>
                </div>

                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-300 via-amber-300 to-violet-300"
                    style={{ width: `${stats.overallPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>
                    Current:{' '}
                    <strong className="text-slate-100">
                      {stats.currentMilestone
                        ? `${stats.currentMilestone.planetName} — ${stats.currentMilestone.title}`
                        : 'Luna'}
                    </strong>
                  </span>
                  <span className="font-mono-tabular">
                    {stats.completedCount}/{stats.totalCount} steps
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
