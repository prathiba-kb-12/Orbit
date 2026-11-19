import { useMemo, useState } from 'react';
import { Sparkles, RefreshCw, Github, Award, Clock, AlertCircle, Trash2 } from 'lucide-react';
import type { OrbitState } from '../types';
import { computeInsightsMetrics, getGoalProgress } from '../lib/orbitStore';

interface InsightsViewProps {
  state: OrbitState;
  onRefreshPattern: () => Promise<void>;
  onLookupGitHub: (username: string) => Promise<void>;
  onDeleteWin: (winId: string) => void;
  patternLoading: boolean;
  githubLoading: boolean;
  error: string | null;
}

export function InsightsView({
  state,
  onRefreshPattern,
  onLookupGitHub,
  onDeleteWin,
  patternLoading,
  githubLoading,
  error,
}: InsightsViewProps) {
  const metrics = useMemo(() => computeInsightsMetrics(state), [state]);
  const [ghInput, setGhInput] = useState(state.preferences.githubUsername || '');

  const maxDayCount = Math.max(1, ...metrics.completedByDay.map((d) => d.count));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
          Insights · Gentle Patterns
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
          Progress &amp; Rhythms
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Supportive observations built from your local logs — zero streaks, zero comparisons, zero warnings.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-amber-400/12 border border-amber-300/30 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {/* Pattern Card (AI Gentle Observation) */}
      <section className="aurora-glass-card rounded-[28px] p-6 border border-amber-300/25 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300 text-sm font-extrabold">
            <Sparkles className="w-4 h-4" />
            <span>Pattern Card</span>
          </div>
          <button
            type="button"
            disabled={patternLoading}
            onClick={onRefreshPattern}
            className="min-h-[40px] rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 px-3.5 text-xs font-extrabold text-slate-100 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${patternLoading ? 'animate-spin' : ''}`} />
            <span>{patternLoading ? 'Reading rhythms...' : 'Refresh Observation'}</span>
          </button>
        </div>

        <p className="text-base sm:text-lg font-bold text-slate-50 leading-relaxed">
          {state.patternInsight?.sentence ||
            'Orbit learns gently as you complete or adjust tasks — tap Refresh Observation anytime for a calm pattern note.'}
        </p>
      </section>

      {/* Core Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="aurora-glass-card rounded-[24px] p-5">
          <div className="text-xs font-bold text-slate-400">Completed Tasks</div>
          <div className="text-3xl font-extrabold font-mono-tabular text-teal-300 mt-1">
            {metrics.totalCompleted}
          </div>
          <div className="text-xs text-slate-300 mt-1">
            {metrics.weeklyCompletedCount} finished in the last 7 days
          </div>
        </div>

        <div className="aurora-glass-card rounded-[24px] p-5">
          <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Most Productive Period</span>
          </div>
          <div className="text-lg font-extrabold text-slate-50 mt-2">
            {metrics.productiveTimePeriod}
          </div>
          <div className="text-xs text-slate-300 mt-1">
            Skipped most: {metrics.topSkipWindow}
          </div>
        </div>

        <div className="aurora-glass-card rounded-[24px] p-5">
          <div className="text-xs font-bold text-slate-400">Active Goals</div>
          <div className="text-3xl font-extrabold font-mono-tabular text-violet-300 mt-1">
            {state.goals.filter((g) => g.status === 'active').length}
          </div>
          <div className="text-xs text-slate-300 mt-1">
            {state.wins.length} win note{state.wins.length === 1 ? '' : 's'} logged
          </div>
        </div>
      </div>

      {/* Weekly Pattern Bar Chart + Goal Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="aurora-glass-card rounded-[26px] p-5 space-y-4">
          <h2 className="text-base font-extrabold text-slate-50">Weekly Completion Rhythm</h2>
          <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
            {metrics.completedByDay.map((d) => {
              const pct = Math.round((d.count / maxDayCount) * 100);
              return (
                <div key={d.date} className="flex flex-col items-center justify-end h-full gap-1.5">
                  <span className="text-[11px] font-mono-tabular text-slate-300">{d.count}</span>
                  <div className="w-full max-w-[32px] flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-teal-400/70 to-amber-300/90 transition-all"
                      style={{ height: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">{d.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="aurora-glass-card rounded-[26px] p-5 space-y-4">
          <h2 className="text-base font-extrabold text-slate-50">Goal Progress</h2>
          {state.goals.length === 0 ? (
            <p className="text-sm text-slate-400">No goals created yet.</p>
          ) : (
            <div className="space-y-3">
              {state.goals
                .filter((g) => g.status !== 'archived')
                .map((g) => {
                  const prog = getGoalProgress(g, state.tasks);
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-100 truncate pr-2">{g.title}</span>
                        <span className="font-mono-tabular text-amber-300">
                          {prog.overallPercent}% ({prog.completedCount}/{prog.totalCount})
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-300 to-violet-300"
                          style={{ width: `${prog.overallPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>

      {/* Common Obstacles & Frequently Postponed Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="aurora-glass-card rounded-[26px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-violet-200">
            <AlertCircle className="w-4 h-4" />
            <span>Common Obstacles</span>
          </div>
          {metrics.commonObstacles.length === 0 ? (
            <p className="text-sm text-slate-400">
              No blocker patterns logged yet. When you use Guilt-Free Restart, Orbit notes what got in the way here.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.commonObstacles.map((ob) => (
                <div
                  key={ob.reason}
                  className="rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 flex items-center justify-between text-sm"
                >
                  <span className="font-bold text-slate-100">{ob.label}</span>
                  <span className="font-mono-tabular text-xs font-extrabold text-violet-200">
                    {ob.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="aurora-glass-card rounded-[26px] p-5 space-y-3">
          <h2 className="text-sm font-extrabold text-slate-200">
            Frequently Postponed or Missed Tasks
          </h2>
          {metrics.frequentlyPostponed.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nothing repeatedly postponed right now.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.frequentlyPostponed.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-bold text-slate-100 truncate">{t.title}</span>
                  <span className="text-slate-400 font-mono-tabular shrink-0">
                    {t.postponeCount ? `moved ${t.postponeCount}x` : t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Win Notes */}
      <section className="aurora-glass-card rounded-[26px] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
          <Award className="w-4 h-4" />
          <span>My Wins</span>
        </div>
        {state.wins.length === 0 ? (
          <p className="text-sm text-slate-400">
            Finish any step in Today and your personal celebration notes will collect here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.wins.slice(0, 8).map((w) => (
              <div
                key={w.id}
                className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-1 flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-teal-300 font-mono-tabular">
                    {w.minutes}m · {new Date(w.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-extrabold text-slate-50">{w.taskTitle}</div>
                  <p className="text-xs text-slate-300">{w.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteWin(w.id)}
                  aria-label={`Remove win ${w.taskTitle}`}
                  className="min-h-[34px] min-w-[34px] rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Optional GitHub Practice Activity */}
      <section className="aurora-glass-card rounded-[26px] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-200">
          <Github className="w-4 h-4" />
          <span>Optional Practice Activity (GitHub Public API)</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!ghInput.trim()) return;
            onLookupGitHub(ghInput.trim());
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={ghInput}
            onChange={(e) => setGhInput(e.target.value)}
            placeholder="GitHub username (e.g., octocat)"
            className="flex-1 min-h-[42px] rounded-xl bg-white/[0.06] border border-white/12 px-3.5 text-sm text-slate-100"
          />
          <button
            type="submit"
            disabled={githubLoading || !ghInput.trim()}
            className="min-h-[42px] rounded-xl bg-white/12 hover:bg-white/20 px-4 text-xs font-extrabold text-slate-100 disabled:opacity-50"
          >
            {githubLoading ? 'Fetching...' : 'Check Public Activity'}
          </button>
        </form>
        {state.githubActivity && (
          <div className="text-xs text-slate-300 pt-1">
            @{state.githubActivity.username} ·{' '}
            {state.githubActivity.daysSinceLastCommit !== null
              ? `${state.githubActivity.daysSinceLastCommit} days since last public push`
              : 'No recent public commits found'}{' '}
            · Languages:{' '}
            {state.githubActivity.languages.length > 0
              ? state.githubActivity.languages.join(', ')
              : 'None listed'}
          </div>
        )}
      </section>
    </div>
  );
}
