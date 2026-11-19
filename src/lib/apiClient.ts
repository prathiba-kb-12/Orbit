import type {
  Assignment,
  AssignmentKind,
  AssistantActionProposal,
  AssistantMessage,
  BlockerReason,
  BrainWeather,
  GitHubActivity,
  Goal,
  Opportunity,
  OpportunityCategory,
  OrbitTask,
} from '../types';
import type { InsightsMetrics } from './orbitStore';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.error || 'Orbit could not reach the assistant right now. Please try again shortly.'
    );
  }
  return data as T;
}

export async function createGoalBreakdown(params: {
  title: string;
  category: string;
  deadline: string;
  syllabus?: string;
  currentLevel?: string;
  today: string;
}): Promise<{
  goal: Goal;
  tasks: OrbitTask[];
}> {
  return postJson('/api/goal-breakdown', params);
}

export async function extractAssignmentPlan(params: {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  today: string;
}): Promise<{
  title: string;
  subject: string;
  kind: AssignmentKind;
  dueDate: string;
  requirements: string[];
  tasks: Array<{
    title: string;
    estimatedMinutes: number;
    priority: 'high' | 'medium' | 'low';
    firstAction: string;
  }>;
}> {
  return postJson('/api/assignment-extract', params);
}

export async function extractOpportunityDetails(params: {
  text?: string;
  fileBase64?: string;
  mimeType?: string;
  today: string;
}): Promise<{
  title: string;
  organization: string;
  category: OpportunityCategory;
  applicationDeadline: string;
  eventDate?: string;
  registrationLink?: string;
  eligibility?: string;
  requirements?: string;
  prepTasks: Array<{
    title: string;
    estimatedMinutes: number;
    firstAction: string;
  }>;
}> {
  return postJson('/api/opportunity-extract', params);
}

export async function sendAssistantCommand(params: {
  message?: string;
  fileBase64?: string;
  mimeType?: string;
  history: AssistantMessage[];
  context: {
    activeSection: string;
    brainWeather: BrainWeather;
    availableMinutesToday: number;
    goals: Array<{ id: string; title: string; status: string; deadline: string }>;
    upcomingAssignments: Array<{ id: string; title: string; dueDate: string; kind: string }>;
    opportunities: Array<{ id: string; title: string; status: string; applicationDeadline: string }>;
    todayTasks: Array<{ id: string; title: string; estimatedMinutes: number; status: string }>;
  };
  today: string;
}): Promise<{
  reply: string;
  actionType: 'none' | AssistantActionProposal['actionType'];
  requiresConfirmation: boolean;
  confirmationSummary?: string;
  actionPayload?: AssistantActionProposal['actionPayload'];
}> {
  return postJson('/api/assistant-command', params);
}

export async function unstickTask(params: {
  missionTitle: string;
  action: string;
  brainWeather: BrainWeather;
  syllabus?: string;
}): Promise<{ firstPhysicalAction: string; microSteps: string[] }> {
  return postJson('/api/unstick', params);
}

export async function replanMissedTasks(params: {
  reason: BlockerReason;
  missedTasks: OrbitTask[];
  activeEvents: Assignment[];
  today: string;
}): Promise<{ encouragement: string; adjustedTasks: OrbitTask[] }> {
  return postJson('/api/replan', params);
}

export async function fetchPatternInsight(params: {
  stats: InsightsMetrics;
}): Promise<{ sentence: string }> {
  return postJson('/api/insights', params);
}

export async function generateWinNote(params: {
  missionTitle: string;
  minutes: number;
  milestoneTitle: string;
  planetName?: string;
  nextPlanetName?: string;
  completedCount: number;
  targetSteps: number;
  milestoneCompleted?: boolean;
}): Promise<{ note: string }> {
  return postJson('/api/win-note', params);
}

export async function fetchGitHubActivity(username: string): Promise<GitHubActivity> {
  const res = await fetch(`/api/github?username=${encodeURIComponent(username.trim())}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Could not look up that GitHub handle right now.');
  }
  return data as GitHubActivity;
}

export type { Opportunity };
