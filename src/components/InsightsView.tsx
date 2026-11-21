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
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <p className="text-xs font-medium text-[#D6A04A]">Insights · Gentle Patterns</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F3F4F6] mt-1">
          Progress &amp; Rhythms
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Supportive observations built from your local logs — zero streaks, zero comparisons, zero warnings.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-[#D6A04A]/10 border border-[#D6A04A]/35 px-4 py-3 text-sm text-[#F5DEB3]">
          {error}
        </div>
      )}

      {/* Pattern Card */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#D6A04A] text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Pattern Observation</span>
          </div>
          <button
            type="button"
            disabled={patternLoading}
            onClick={onRefreshPattern}
            className="min-h-[36px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2E3442] px-3.5 text-xs font-medium text-[#F3F4F6] flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${patternLoading ? 'animate-spin' : ''}`} />
            <span>{patternLoading ? 'Reading rhythms...' : 'Refresh Observation'}</span>
          </button>
        </div>

        <p className="text-base font-medium text-[#F3F4F6] leading-relaxed">
          {state.patternInsight?.sentence ||
            'Orbit learns gently as you complete or adjust tasks — click Refresh Observation anytime for a calm pattern note.'}
        </p>
      </section>

      {/* Core Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5">
          <div className="text-xs font-medium text-[#9CA3AF]">Completed Tasks</div>
          <div className="text-3xl font-semibold font-mono-tabular text-teal-300 mt-1">
            {metrics.totalCompleted}
          </div>
          <div className="text-xs text-[#9CA3AF] mt-1">
            {metrics.weeklyCompletedCount} finished in the last 7 days
          </div>
        </div>

        <div className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5">
          <div className="text-xs font-medium text-[#9CA3AF] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#D6A04A]" />
            <span>Most Productive Period</span>
          </div>
          <div className="text-base font-semibold text-[#F3F4F6] mt-2">
            {metrics.productiveTimePeriod}
          </div>
          <div className="text-xs text-[#9CA3AF] mt-1">
            Skipped most: {metrics.topSkipWindow}
          </div>
        </div>

        <div className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5">
          <div className="text-xs font-medium text-[#9CA3AF]">Active Goals</div>
          <div className="text-3xl font-semibold font-mono-tabular text-[#D6A04A] mt-1">
            {state.goals.filter((g) => g.status === 'active').length}
          </div>
          <div className="text-xs text-[#9CA3AF] mt-1">
            {state.wins.length} win note{state.wins.length === 1 ? '' : 's'} logged
          </div>
        </div>
      </div>

      {/* Weekly Pattern Bar Chart + Goal Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#F3F4F6]">Weekly Completion Rhythm</h2>
          <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
            {metrics.completedByDay.map((d) => {
              const pct = Math.round((d.count / maxDayCount) * 100);
              return (
                <div key={d.date} className="flex flex-col items-center justify-end h-full gap-1.5">
                  <span className="text-[11px] font-mono-tabular text-[#9CA3AF]">{d.count}</span>
                  <div className="w-full max-w-[28px] flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-[#D6A04A]/85 transition-all"
                      style={{ height: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[#9CA3AF]">{d.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#F3F4F6]">Goal Progress</h2>
          {state.goals.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">No goals created yet.</p>
          ) : (
            <div className="space-y-3">
              {state.goals
                .filter((g) => g.status !== 'archived')
                .map((g) => {
                  const prog = getGoalProgress(g, state.tasks);
                  return (
                    <div key={g.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-[#F3F4F6] truncate pr-2">{g.title}</span>
                        <span className="font-mono-tabular text-[#D6A04A]">
                          {prog.overallPercent}% ({prog.completedCount}/{prog.totalCount})
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#262B36] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#D6A04A]"
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
        <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F4F6]">
            <AlertCircle className="w-4 h-4 text-[#D6A04A]" />
            <span>Common Obstacles</span>
          </div>
          {metrics.commonObstacles.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">
              No blocker patterns logged yet. When you use Guilt-Free Restart, Orbit notes what got in the way here.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.commonObstacles.map((ob) => (
                <div
                  key={ob.reason}
                  className="rounded-xl bg-[#14171D] border border-[#242934] px-3.5 py-2.5 flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-[#F3F4F6]">{ob.label}</span>
                  <span className="font-mono-tabular text-xs font-medium text-[#D6A04A]">
                    {ob.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[#F3F4F6]">
            Frequently Postponed or Missed Tasks
          </h2>
          {metrics.frequentlyPostponed.length === 0 ? (
            <p className="text-sm text-[#9CA3AF]">Nothing repeatedly postponed right now.</p>
          ) : (
            <div className="space-y-2">
              {metrics.frequentlyPostponed.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl bg-[#14171D] border border-[#242934] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-medium text-[#F3F4F6] truncate">{t.title}</span>
                  <span className="text-[#9CA3AF] font-mono-tabular shrink-0">
                    {t.postponeCount ? `moved ${t.postponeCount}x` : t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Win Notes */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F4F6]">
          <Award className="w-4 h-4 text-[#D6A04A]" />
          <span>My Wins</span>
        </div>
        {state.wins.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">
            Finish any step in Today and your personal celebration notes will collect here.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {state.wins.slice(0, 8).map((w) => (
              <div
                key={w.id}
                className="rounded-xl bg-[#14171D] border border-[#242934] p-4 space-y-1 flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="text-xs font-medium text-teal-300 font-mono-tabular">
                    {w.minutes}m · {new Date(w.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-semibold text-[#F3F4F6]">{w.taskTitle}</div>
                  <p className="text-xs text-[#9CA3AF]">{w.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteWin(w.id)}
                  aria-label={`Remove win ${w.taskTitle}`}
                  className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-[#222630] flex items-center justify-center text-[#6B7280] hover:text-[#F3F4F6] shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Optional GitHub Practice Activity */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#F3F4F6]">
          <Github className="w-4 h-4 text-[#9CA3AF]" />
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
            className="flex-1 min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
          />
          <button
            type="submit"
            disabled={githubLoading || !ghInput.trim()}
            className="min-h-[40px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2E3442] px-4 text-xs font-medium text-[#F3F4F6] disabled:opacity-50"
          >
            {githubLoading ? 'Fetching...' : 'Check Public Activity'}
          </button>
        </form>
        {state.githubActivity && (
          <div className="text-xs text-[#9CA3AF] pt-1">
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
