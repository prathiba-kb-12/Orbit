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
  onAddGoalTask: (
    goalId: string,
    milestoneIndex: number,
    weeklyTargetId: string | undefined,
    title: string,
    minutes: number
  ) => void;
  onDeleteTask: (taskId: string) => void;
  loading: boolean;
  error: string | null;
}

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

  // Edit title inline
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
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedGoalId(null);
              setEditingGoalId(null);
              setConfirmDeleteId(null);
            }}
            className="min-h-[40px] rounded-xl bg-[#1A1D24] hover:bg-[#222630] border border-[#262B36] px-3.5 text-sm font-medium text-[#F3F4F6] flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#9CA3AF]" />
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
              className="min-h-[38px] rounded-xl bg-[#1A1D24] hover:bg-[#222630] border border-[#262B36] px-3 text-xs font-medium text-[#E5E7EB] flex items-center gap-1.5"
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
              className="min-h-[38px] rounded-xl bg-[#1A1D24] hover:bg-[#222630] border border-[#262B36] px-3 text-xs font-medium text-[#E5E7EB] flex items-center gap-1.5"
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
              className="min-h-[38px] rounded-xl bg-[#1A1D24] hover:bg-[#222630] border border-[#262B36] px-3 text-xs font-medium text-[#E5E7EB] flex items-center gap-1.5"
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
                className="min-h-[38px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] px-3.5 text-xs font-semibold"
              >
                Confirm Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(selectedGoal.id)}
                className="min-h-[38px] rounded-xl bg-[#1A1D24] hover:bg-[#222630] border border-[#262B36] px-3 text-xs font-medium text-[#9CA3AF] hover:text-[#F3F4F6] flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Goal Summary Header */}
        <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 space-y-4">
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
                className="w-full min-h-[42px] rounded-xl bg-[#14171D] border border-[#2E3442] px-4 text-base font-semibold text-[#F3F4F6] focus:outline-none focus:border-[#D6A04A]"
              />
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="min-h-[38px] rounded-xl bg-[#14171D] border border-[#2E3442] px-3 text-sm text-[#F3F4F6]"
                />
                <button
                  type="submit"
                  className="min-h-[38px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-xs px-4"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingGoalId(null)}
                  className="min-h-[38px] rounded-xl bg-[#222630] text-[#E5E7EB] font-medium text-xs px-4"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-xs text-[#9CA3AF] capitalize">
                <span className="text-[#D6A04A] font-medium">{selectedGoal.category}</span>
                {' · '}
                <span>{selectedGoal.status}</span>
                {' · '}
                <span className="font-mono-tabular">Due {selectedGoal.deadline}</span>
              </p>
              <h1 className="text-2xl font-semibold text-[#F3F4F6] mt-1">
                {selectedGoal.title}
              </h1>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#9CA3AF]">
                Overall Progress ({progress.completedCount} of {progress.totalCount} steps)
              </span>
              <span className="font-mono-tabular text-[#D6A04A]">{progress.overallPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#262B36] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D6A04A] transition-all duration-300"
                style={{ width: `${progress.overallPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* Monthly Milestones (3 Months x 4 Weeks = 12 Weeks Total) */}
        <section className="space-y-5">
          {progress.milestoneStats.map((m) => (
            <div key={m.id} className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="text-xs text-[#9CA3AF]">
                    <span className="text-[#D6A04A] font-medium">{m.planetName}</span>
                    {' · '}
                    <span>{m.monthLabel}</span>
                    {' · '}
                    <span className="font-mono-tabular">Target {m.dueDate}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#F3F4F6] mt-0.5">{m.title}</h2>
                  <p className="text-sm text-[#9CA3AF] mt-0.5">{m.summary}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-semibold font-mono-tabular text-[#F3F4F6]">
                    {m.percent}%
                  </div>
                  <div className="text-xs text-[#9CA3AF] font-mono-tabular">
                    {m.completed}/{m.total} tasks · {m.completedWeeks}/{m.totalWeeks} weeks
                  </div>
                </div>
              </div>

              {/* Monthly Progress Bar */}
              <div className="h-1.5 rounded-full bg-[#262B36] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#D6A04A] transition-all duration-300"
                  style={{ width: `${m.percent}%` }}
                />
              </div>

              {/* 4 Weekly Sections inside this Month */}
              <div className="space-y-3">
                {m.weeks.map((wt) => (
                  <div
                    key={wt.id}
                    className={`rounded-xl border p-4 space-y-3 transition-colors ${
                      wt.isComplete
                        ? 'bg-teal-500/[0.05] border-teal-500/30'
                        : 'bg-[#14171D] border-[#242934]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs text-[#9CA3AF] flex items-center gap-2">
                          <span>Week {wt.weekNumber}</span>
                          {wt.isComplete && (
                            <span className="text-teal-300 inline-flex items-center gap-1 font-medium">
                              <Check className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-[#F3F4F6] mt-0.5">
                          {wt.title}
                        </h3>
                      </div>
                      <div className="text-xs font-medium font-mono-tabular text-[#9CA3AF] shrink-0">
                        {wt.completed}/{wt.total} · {wt.percent}%
                      </div>
                    </div>

                    <div className="h-1 rounded-full bg-[#262B36] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-400 transition-all duration-300"
                        style={{ width: `${wt.percent}%` }}
                      />
                    </div>

                    {/* Tasks inside this Week */}
                    <div className="space-y-1.5">
                      {wt.tasks.map((t) => {
                        const done = t.status === 'completed';
                        return (
                          <div
                            key={t.id}
                            className="rounded-xl bg-[#1A1D24] border border-[#262B36] hover:border-[#323846] px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors"
                          >
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={done}
                              onClick={() => onToggleTaskDone(t)}
                              className="flex items-center gap-3 text-left flex-1 min-h-[34px]"
                            >
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  done
                                    ? 'bg-teal-400 border-teal-400 text-[#111318]'
                                    : 'border-[#3B4252] bg-[#14171D] text-transparent'
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
                                  {t.title}
                                </div>
                                <div className="text-xs text-[#9CA3AF] font-mono-tabular">
                                  {t.estimatedMinutes}m · {t.scheduledDate}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteTask(t.id)}
                              aria-label={`Delete ${t.title}`}
                              className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-[#242934] flex items-center justify-center text-[#6B7280] hover:text-[#F3F4F6]"
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
          ))}
        </section>

        {/* Add Task to Goal */}
        <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-[#F3F4F6] mb-3">Add Step to Goal</h3>
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
              className="flex-1 min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
            />
            <select
              value={newTaskWeekNumber}
              onChange={(e) => setNewTaskWeekNumber(Number(e.target.value))}
              aria-label="Target week"
              className="min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3 text-xs font-medium text-[#F3F4F6]"
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
              className="min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3 text-xs font-medium text-[#F3F4F6]"
            >
              <option value={10}>10m</option>
              <option value={15}>15m</option>
              <option value={25}>25m</option>
            </select>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-4 flex items-center justify-center gap-1.5"
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
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#D6A04A]">Goals · 12-week roadmaps</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F3F4F6] mt-1">
            Long-Term Goals
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Each goal breaks into 3 monthly milestones across 12 weeks. Completing tasks updates progress automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="min-h-[42px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-4 py-2 flex items-center justify-center gap-1.5 self-start transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Close Form' : 'New Goal'}</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-[#D6A04A]/10 border border-[#D6A04A]/35 px-4 py-3 text-sm text-[#F5DEB3]">
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
          className="bg-[#1A1D24] border border-[#D6A04A]/40 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-[#D6A04A] text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>AI Goal Breakdown (Luna → Vega → Polaris)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1">Goal title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Python Automation, Data Structures Mastery, Portfolio Project"
                className="w-full min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3 text-sm font-medium text-[#F3F4F6]"
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
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                Target deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3.5 text-sm text-[#F3F4F6]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                Current level (optional)
              </label>
              <input
                type="text"
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                placeholder="e.g., Know basic syntax, want real scripts"
                className="w-full min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
              Syllabus or roadmap topics (optional — Orbit follows your topics in order)
            </label>
            <textarea
              rows={3}
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="e.g., Foundations → File handling → CSV → API requests → Mini-project"
              className="w-full rounded-xl bg-[#14171D] border border-[#262B36] p-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="min-h-[42px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-5 py-2 disabled:opacity-60"
            >
              {loading ? 'Breaking down into steps...' : 'Create Goal & Milestones'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="min-h-[42px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] text-[#E5E7EB] font-medium text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'active', 'paused', 'archived'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`min-h-[34px] rounded-xl px-3.5 text-xs font-medium capitalize transition-colors ${
              statusFilter === status
                ? 'bg-[#D6A04A] text-[#111318] font-semibold'
                : 'bg-[#1A1D24] border border-[#262B36] text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            {status === 'all' ? 'Active & Paused' : status}
          </button>
        ))}
      </div>

      {/* Goal Cards Grid */}
      {filteredGoals.length === 0 ? (
        <div className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold text-[#F3F4F6]">No goals in this view yet</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Click &ldquo;New Goal&rdquo; above or ask Orbit Assistant to break down a 3-month track.
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
                className="bg-[#1A1D24] border border-[#262B36] hover:border-[#D6A04A]/50 rounded-2xl p-5 text-left transition-colors space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#9CA3AF]">
                      <span className="capitalize text-[#D6A04A] font-medium">
                        {goal.category}
                      </span>
                      {' · '}
                      <span className="capitalize">{goal.status}</span>
                      {' · '}
                      <span className="font-mono-tabular">Due {goal.deadline}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#F3F4F6] mt-1">{goal.title}</h2>
                  </div>
                  <span className="text-lg font-semibold font-mono-tabular text-[#D6A04A]">
                    {stats.overallPercent}%
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-[#262B36] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D6A04A] transition-all duration-300"
                    style={{ width: `${stats.overallPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
                  <span className="truncate pr-2">
                    Current:{' '}
                    <span className="font-medium text-[#E5E7EB]">
                      {stats.currentMilestone
                        ? `${stats.currentMilestone.planetName} — ${stats.currentMilestone.title}`
                        : 'Luna'}
                    </span>
                  </span>
                  <span className="font-mono-tabular shrink-0">
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
