export type AppSection =
  | 'today'
  | 'goals'
  | 'assignments'
  | 'planner'
  | 'opportunities'
  | 'insights'
  | 'privacy'
  | 'profile';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  studyBio?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface SavedAccountPreview {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastUsedAt: string;
}

export type BrainWeather = 'fried' | 'okay' | 'lockedIn';

export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'missed' | 'skipped';

export type TaskSourceType = 'goal' | 'assignment' | 'opportunity' | 'custom';

export type BlockerReason = 'too_tired' | 'exam' | 'too_big' | 'forgot';

export type GoalStatus = 'active' | 'paused' | 'archived';

export type AssignmentKind = 'assignment' | 'exam';

export type AssignmentStatus = 'upcoming' | 'in_progress' | 'completed';

export type OpportunityCategory =
  | 'Internship'
  | 'Hackathon'
  | 'Course'
  | 'Scholarship'
  | 'Competition';

export type OpportunityStatus =
  | 'Interested'
  | 'To Apply'
  | 'Applied'
  | 'Registered'
  | 'Completed'
  | 'Expired';

export interface GoalMilestone {
  id: string;
  index: number; // 0 = Luna, 1 = Vega, 2 = Polaris
  monthLabel: string; // "Month 1", "Month 2", "Month 3"
  planetName: string; // "Luna", "Vega", "Polaris"
  title: string;
  summary: string;
  dueDate: string; // YYYY-MM-DD
}

export interface GoalWeeklyTarget {
  id: string;
  milestoneIndex: number;
  weekNumber: number;
  title: string;
}

export interface Goal {
  id: string;
  title: string;
  category: string;
  deadline: string; // YYYY-MM-DD
  status: GoalStatus;
  syllabus?: string;
  milestones: GoalMilestone[];
  weeklyTargets: GoalWeeklyTarget[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  kind: AssignmentKind;
  dueDate: string; // YYYY-MM-DD
  requirements: string[];
  notes: string;
  status: AssignmentStatus;
  sourceFileName?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategory;
  applicationDeadline: string; // YYYY-MM-DD
  eventDate?: string; // YYYY-MM-DD
  registrationLink?: string;
  eligibility?: string;
  requirements?: string;
  status: OpportunityStatus;
  reminderDaysBefore: number;
  createdAt: string;
}

export interface OrbitTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  status: TaskStatus;
  scheduledDate: string; // YYYY-MM-DD
  sourceType: TaskSourceType;
  sourceId?: string;
  milestoneIndex?: number;
  weeklyTargetId?: string;
  orderIndex: number;
  firstAction: string;
  microSteps?: string[];
  completedAt?: string;
  skippedAt?: string;
  postponeCount?: number;
  blockerReason?: BlockerReason;
  replanReviewed?: boolean;
  weatherWhenCompleted?: BrainWeather;
  examReduced?: boolean;
}

export interface WinNote {
  id: string;
  taskId: string;
  taskTitle: string;
  note: string;
  sourceType?: TaskSourceType;
  sourceId?: string;
  sourceTitle?: string;
  planetName?: string;
  nextPlanetName?: string;
  milestoneCompleted?: boolean;
  minutes: number;
  createdAt: string;
}

export type AssistantActionType =
  | 'none'
  | 'add_goal'
  | 'add_assignment'
  | 'add_opportunity'
  | 'rebalance_schedule'
  | 'limit_today_time'
  | 'breakdown_task';

export interface AssistantActionProposal {
  actionType: Exclude<AssistantActionType, 'none'>;
  confirmationSummary: string;
  actionPayload: {
    title?: string;
    subjectOrOrg?: string;
    category?: string;
    kind?: string;
    date?: string;
    minutesLimit?: number;
    targetTaskId?: string;
    subSteps?: string[];
    rescheduleNote?: string;
  };
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  hasAttachment?: boolean;
  attachmentName?: string;
  pendingConfirmation?: AssistantActionProposal;
  confirmationResolved?: 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface GitHubActivity {
  username: string;
  daysSinceLastCommit: number | null;
  lastCommitDate: string | null;
  languages: string[];
  recentRepoCount: number;
  fetchedAt: string;
}

export interface OrbitPreferences {
  brainWeather: BrainWeather;
  availableMinutesToday: number;
  reduceMotion: boolean;
  onePasteCaptureEnabled: boolean;
  voiceAssistantEnabled: boolean;
  githubUsername: string;
}

export interface OrbitState {
  goals: Goal[];
  assignments: Assignment[];
  opportunities: Opportunity[];
  tasks: OrbitTask[];
  wins: WinNote[];
  githubActivity: GitHubActivity | null;
  patternInsight: {
    sentence: string;
    generatedAt: string;
  } | null;
  preferences: OrbitPreferences;
  lastActiveDate: string;
}
