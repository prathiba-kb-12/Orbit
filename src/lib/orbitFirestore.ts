import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { getInitialState, getTodayISO, hydrateOrbitState } from './orbitStore';
import type {
  Assignment,
  Goal,
  Opportunity,
  OrbitState,
  OrbitTask,
  UserProfile,
  WinNote,
} from '../types';

function sanitizeDocId(rawId: string, fallbackPrefix: string): string {
  const cleaned = String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 120);
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

function pickUserWorkspaceDoc(
  uid: string,
  profile: Partial<UserProfile>,
  state: OrbitState,
  createdAtFallback?: string
) {
  const basePrefs = getInitialState().preferences;
  const prefs = {
    brainWeather: state.preferences?.brainWeather || basePrefs.brainWeather,
    availableMinutesToday: Math.max(
      5,
      Math.min(240, Number(state.preferences?.availableMinutesToday) || basePrefs.availableMinutesToday)
    ),
    reduceMotion: Boolean(state.preferences?.reduceMotion),
    onePasteCaptureEnabled:
      state.preferences?.onePasteCaptureEnabled ?? basePrefs.onePasteCaptureEnabled,
    voiceAssistantEnabled:
      state.preferences?.voiceAssistantEnabled ?? basePrefs.voiceAssistantEnabled,
    githubUsername: String(state.preferences?.githubUsername || '').slice(0, 60),
  };

  return stripUndefined({
    uid,
    displayName: (profile.displayName || 'Orbit Student').trim().slice(0, 100) || 'Orbit Student',
    email: (profile.email || 'student@orbit.app').trim().slice(0, 200),
    photoURL: profile.photoURL ? String(profile.photoURL).slice(0, 65000) : undefined,
    studyBio: profile.studyBio ? String(profile.studyBio).slice(0, 300) : undefined,
    lastActiveDate: /^\d{4}-\d{2}-\d{2}$/.test(state.lastActiveDate)
      ? state.lastActiveDate
      : getTodayISO(),
    preferences: prefs,
    patternInsight: state.patternInsight
      ? {
          sentence: String(state.patternInsight.sentence || '').slice(0, 600),
          generatedAt: String(state.patternInsight.generatedAt || new Date().toISOString()).slice(0, 40),
        }
      : null,
    githubActivity: state.githubActivity
      ? {
          username: String(state.githubActivity.username || '').slice(0, 60),
          daysSinceLastCommit: state.githubActivity.daysSinceLastCommit ?? null,
          lastCommitDate: state.githubActivity.lastCommitDate ?? null,
          languages: Array.isArray(state.githubActivity.languages)
            ? state.githubActivity.languages.slice(0, 10)
            : [],
          recentRepoCount: Number(state.githubActivity.recentRepoCount) || 0,
          fetchedAt: String(state.githubActivity.fetchedAt || new Date().toISOString()).slice(0, 40),
        }
      : null,
    createdAt: String(profile.createdAt || createdAtFallback || new Date().toISOString()).slice(0, 40),
    syncedAt: serverTimestamp(),
  });
}

function serializeGoal(uid: string, g: Goal) {
  const id = sanitizeDocId(g.id, 'goal');
  return stripUndefined({
    uid,
    id,
    title: String(g.title || '3-Month Goal').slice(0, 200),
    category: String(g.category || 'study').slice(0, 60),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(g.deadline) ? g.deadline : getTodayISO(),
    status: ['active', 'paused', 'archived'].includes(g.status) ? g.status : 'active',
    syllabus: g.syllabus ? String(g.syllabus).slice(0, 12000) : undefined,
    milestones: Array.isArray(g.milestones) && g.milestones.length > 0 ? g.milestones.slice(0, 3) : [{ id: `${id}-m-0`, index: 0, monthLabel: 'Month 1', planetName: 'Luna', title: 'Month 1', summary: 'Foundations', dueDate: getTodayISO() }],
    weeklyTargets: Array.isArray(g.weeklyTargets) && g.weeklyTargets.length > 0 ? g.weeklyTargets.slice(0, 16) : [{ id: `${id}-wt-1`, milestoneIndex: 0, weekNumber: 1, title: 'Week 1' }],
    createdAt: String(g.createdAt || new Date().toISOString()).slice(0, 40),
    syncedAt: serverTimestamp(),
  });
}

function serializeAssignment(uid: string, a: Assignment) {
  const id = sanitizeDocId(a.id, 'assign');
  return stripUndefined({
    uid,
    id,
    title: String(a.title || 'Work Task').slice(0, 200),
    subject: String(a.subject || 'Work').slice(0, 120),
    kind: a.kind === 'exam' ? 'exam' : 'assignment',
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : getTodayISO(),
    requirements: Array.isArray(a.requirements) ? a.requirements.slice(0, 30).map((r) => String(r)) : [],
    notes: String(a.notes || '').slice(0, 6000),
    status: ['upcoming', 'in_progress', 'completed'].includes(a.status) ? a.status : 'upcoming',
    sourceFileName: a.sourceFileName ? String(a.sourceFileName).slice(0, 200) : undefined,
    createdAt: String(a.createdAt || new Date().toISOString()).slice(0, 40),
    syncedAt: serverTimestamp(),
  });
}

function serializeOpportunity(uid: string, o: Opportunity) {
  const id = sanitizeDocId(o.id, 'opp');
  const validCats = ['Internship', 'Hackathon', 'Course', 'Scholarship', 'Competition'];
  const validStatuses = ['Interested', 'To Apply', 'Applied', 'Registered', 'Completed', 'Expired'];
  return stripUndefined({
    uid,
    id,
    title: String(o.title || 'Opportunity').slice(0, 200),
    organization: String(o.organization || '').slice(0, 140),
    category: validCats.includes(o.category) ? o.category : 'Internship',
    applicationDeadline: /^\d{4}-\d{2}-\d{2}$/.test(o.applicationDeadline)
      ? o.applicationDeadline
      : getTodayISO(),
    eventDate: o.eventDate ? String(o.eventDate).slice(0, 20) : undefined,
    registrationLink: o.registrationLink ? String(o.registrationLink).slice(0, 1000) : undefined,
    eligibility: o.eligibility ? String(o.eligibility).slice(0, 1000) : undefined,
    requirements: o.requirements ? String(o.requirements).slice(0, 2000) : undefined,
    status: validStatuses.includes(o.status) ? o.status : 'Interested',
    reminderDaysBefore: Math.max(0, Math.min(60, Number(o.reminderDaysBefore) || 3)),
    createdAt: String(o.createdAt || new Date().toISOString()).slice(0, 40),
    syncedAt: serverTimestamp(),
  });
}

function serializeTask(uid: string, t: OrbitTask) {
  const id = sanitizeDocId(t.id, 'task');
  return stripUndefined({
    uid,
    id,
    title: String(t.title || 'Small step').slice(0, 240),
    description: String(t.description || '').slice(0, 2000),
    category: String(t.category || 'study').slice(0, 60),
    priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
    estimatedMinutes: Math.max(1, Math.min(180, Number(t.estimatedMinutes) || 15)),
    status: ['pending', 'in_progress', 'completed', 'missed', 'skipped'].includes(t.status)
      ? t.status
      : 'pending',
    scheduledDate: /^\d{4}-\d{2}-\d{2}$/.test(t.scheduledDate) ? t.scheduledDate : getTodayISO(),
    sourceType: ['goal', 'assignment', 'opportunity', 'custom'].includes(t.sourceType)
      ? t.sourceType
      : 'custom',
    sourceId: t.sourceId ? String(t.sourceId).slice(0, 128) : undefined,
    milestoneIndex: typeof t.milestoneIndex === 'number' ? t.milestoneIndex : undefined,
    weeklyTargetId: t.weeklyTargetId ? String(t.weeklyTargetId).slice(0, 128) : undefined,
    orderIndex: Number(t.orderIndex) || 0,
    firstAction: String(t.firstAction || '').slice(0, 400),
    microSteps: Array.isArray(t.microSteps)
      ? t.microSteps.slice(0, 10).map((s) => String(s))
      : undefined,
    completedAt: t.completedAt ? String(t.completedAt).slice(0, 40) : undefined,
    skippedAt: t.skippedAt ? String(t.skippedAt).slice(0, 40) : undefined,
    postponeCount: typeof t.postponeCount === 'number' ? t.postponeCount : undefined,
    blockerReason: t.blockerReason ? String(t.blockerReason).slice(0, 40) : undefined,
    replanReviewed: typeof t.replanReviewed === 'boolean' ? t.replanReviewed : undefined,
    weatherWhenCompleted: t.weatherWhenCompleted
      ? String(t.weatherWhenCompleted).slice(0, 30)
      : undefined,
    examReduced: typeof t.examReduced === 'boolean' ? t.examReduced : undefined,
    syncedAt: serverTimestamp(),
  });
}

function serializeWin(uid: string, w: WinNote) {
  const id = sanitizeDocId(w.id, 'win');
  return stripUndefined({
    uid,
    id,
    taskId: String(w.taskId || id).slice(0, 128),
    taskTitle: String(w.taskTitle || 'Completed step').slice(0, 240),
    note: String(w.note || 'Yayy!').slice(0, 600),
    sourceType: w.sourceType ? String(w.sourceType).slice(0, 40) : undefined,
    sourceId: w.sourceId ? String(w.sourceId).slice(0, 128) : undefined,
    sourceTitle: w.sourceTitle ? String(w.sourceTitle).slice(0, 200) : undefined,
    planetName: w.planetName ? String(w.planetName).slice(0, 40) : undefined,
    nextPlanetName: w.nextPlanetName ? String(w.nextPlanetName).slice(0, 40) : undefined,
    milestoneCompleted:
      typeof w.milestoneCompleted === 'boolean' ? w.milestoneCompleted : undefined,
    minutes: Math.max(0, Math.min(480, Number(w.minutes) || 0)),
    createdAt: String(w.createdAt || new Date().toISOString()).slice(0, 40),
    syncedAt: serverTimestamp(),
  });
}

class BatchQueue {
  private batches: WriteBatch[] = [];
  private currentBatch: WriteBatch = writeBatch(db);
  private count = 0;

  addSet(ref: ReturnType<typeof doc>, data: Record<string, any>) {
    this.ensureCapacity();
    this.currentBatch.set(ref, data);
    this.count += 1;
  }

  addDelete(ref: ReturnType<typeof doc>) {
    this.ensureCapacity();
    this.currentBatch.delete(ref);
    this.count += 1;
  }

  private ensureCapacity() {
    if (this.count >= 400) {
      this.batches.push(this.currentBatch);
      this.currentBatch = writeBatch(db);
      this.count = 0;
    }
  }

  async commitAll(pathContext: string) {
    if (this.count > 0) {
      this.batches.push(this.currentBatch);
    }
    for (const batch of this.batches) {
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, pathContext);
      }
    }
  }
}

export async function ensureUserWorkspaceDoc(
  user: User,
  overrides?: { displayName?: string; photoURL?: string; studyBio?: string }
): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const nowIso = new Date().toISOString();
    if (snap.exists()) {
      const data = snap.data();
      const nextDisplayName =
        overrides?.displayName ?? data.displayName ?? user.displayName ?? user.email?.split('@')[0] ?? 'Orbit Student';
      const nextPhotoURL =
        overrides?.photoURL !== undefined
          ? overrides.photoURL
          : (data.photoURL ?? user.photoURL ?? undefined);
      const nextStudyBio =
        overrides?.studyBio !== undefined ? overrides.studyBio : data.studyBio;

      if (overrides) {
        const updated = stripUndefined({
          uid: user.uid,
          displayName: String(nextDisplayName).trim().slice(0, 100) || 'Orbit Student',
          email: user.email || data.email || 'student@orbit.app',
          photoURL: nextPhotoURL ? String(nextPhotoURL).slice(0, 65000) : undefined,
          studyBio: nextStudyBio ? String(nextStudyBio).slice(0, 300) : undefined,
          lastActiveDate: data.lastActiveDate || getTodayISO(),
          preferences: data.preferences || getInitialState().preferences,
          patternInsight: data.patternInsight ?? null,
          githubActivity: data.githubActivity ?? null,
          createdAt: data.createdAt || nowIso,
          syncedAt: serverTimestamp(),
        });
        await setDoc(userRef, updated);
      }

      return {
        uid: user.uid,
        displayName: String(nextDisplayName),
        email: user.email || String(data.email || ''),
        photoURL: nextPhotoURL || undefined,
        studyBio: nextStudyBio || undefined,
        emailVerified: user.emailVerified,
        createdAt: String(data.createdAt || user.metadata.creationTime || nowIso),
      };
    }

    const initial = getInitialState();
    const displayName =
      overrides?.displayName ||
      user.displayName ||
      user.email?.split('@')[0] ||
      'Orbit Student';
    const createdAt = user.metadata.creationTime || nowIso;
    const payload = pickUserWorkspaceDoc(
      user.uid,
      {
        displayName,
        email: user.email || 'student@orbit.app',
        photoURL: overrides?.photoURL || user.photoURL || undefined,
        studyBio: overrides?.studyBio,
        createdAt,
      },
      initial,
      createdAt
    );

    await setDoc(userRef, payload);

    return {
      uid: user.uid,
      displayName,
      email: user.email || '',
      photoURL: overrides?.photoURL || user.photoURL || undefined,
      studyBio: overrides?.studyBio,
      emailVerified: user.emailVerified,
      createdAt,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export async function fetchUserWorkspace(uid: string): Promise<{
  profilePartial: Partial<UserProfile>;
  state: OrbitState;
  isEmptyInCloud: boolean;
}> {
  const basePath = `users/${uid}`;
  try {
    const [userSnap, goalsSnap, assignSnap, oppSnap, tasksSnap, winsSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDocs(collection(db, 'users', uid, 'goals')),
      getDocs(collection(db, 'users', uid, 'assignments')),
      getDocs(collection(db, 'users', uid, 'opportunities')),
      getDocs(collection(db, 'users', uid, 'tasks')),
      getDocs(collection(db, 'users', uid, 'wins')),
    ]);

    const userData = userSnap.exists() ? userSnap.data() : {};
    const goals = goalsSnap.docs.map((d) => d.data() as Goal);
    const assignments = assignSnap.docs.map((d) => d.data() as Assignment);
    const opportunities = oppSnap.docs.map((d) => d.data() as Opportunity);
    const tasks = tasksSnap.docs.map((d) => d.data() as OrbitTask);
    const wins = winsSnap.docs.map((d) => d.data() as WinNote);

    const hydrated = hydrateOrbitState({
      goals,
      assignments,
      opportunities,
      tasks,
      wins,
      preferences: userData.preferences,
      patternInsight: userData.patternInsight ?? null,
      githubActivity: userData.githubActivity ?? null,
      lastActiveDate: userData.lastActiveDate || getTodayISO(),
    });

    const isEmptyInCloud =
      goals.length === 0 &&
      assignments.length === 0 &&
      opportunities.length === 0 &&
      tasks.length === 0 &&
      wins.length === 0;

    return {
      profilePartial: {
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL,
        studyBio: userData.studyBio,
        createdAt: userData.createdAt,
      },
      state: hydrated,
      isEmptyInCloud,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, basePath);
  }
}

function stableComparable(val: unknown): string {
  return JSON.stringify(val);
}

export async function syncOrbitStateDiff(
  uid: string,
  profile: UserProfile,
  prevState: OrbitState | null,
  nextState: OrbitState
): Promise<void> {
  const queue = new BatchQueue();

  const shouldWriteUserDoc =
    !prevState ||
    stableComparable(prevState.preferences) !== stableComparable(nextState.preferences) ||
    stableComparable(prevState.patternInsight) !== stableComparable(nextState.patternInsight) ||
    stableComparable(prevState.githubActivity) !== stableComparable(nextState.githubActivity) ||
    prevState.lastActiveDate !== nextState.lastActiveDate;

  if (shouldWriteUserDoc) {
    queue.addSet(
      doc(db, 'users', uid),
      pickUserWorkspaceDoc(uid, profile, nextState, profile.createdAt)
    );
  }

  const syncCollection = <T extends { id: string }>(
    subName: string,
    prevItems: T[],
    nextItems: T[],
    serializer: (uid: string, item: T) => Record<string, any>
  ) => {
    const prevMap = new Map(prevItems.map((item) => [sanitizeDocId(item.id, subName), item]));
    const nextMap = new Map(nextItems.map((item) => [sanitizeDocId(item.id, subName), item]));

    for (const [docId, item] of nextMap.entries()) {
      const prev = prevMap.get(docId);
      if (!prev || stableComparable(prev) !== stableComparable(item)) {
        queue.addSet(doc(db, 'users', uid, subName, docId), serializer(uid, item));
      }
    }

    for (const docId of prevMap.keys()) {
      if (!nextMap.has(docId)) {
        queue.addDelete(doc(db, 'users', uid, subName, docId));
      }
    }
  };

  syncCollection('goals', prevState?.goals || [], nextState.goals, serializeGoal);
  syncCollection('assignments', prevState?.assignments || [], nextState.assignments, serializeAssignment);
  syncCollection(
    'opportunities',
    prevState?.opportunities || [],
    nextState.opportunities,
    serializeOpportunity
  );
  syncCollection('tasks', prevState?.tasks || [], nextState.tasks, serializeTask);
  syncCollection('wins', prevState?.wins || [], nextState.wins, serializeWin);

  await queue.commitAll(`users/${uid}`);
}

export async function clearCloudWorkspaceItems(uid: string): Promise<void> {
  const subcollections = ['goals', 'assignments', 'opportunities', 'tasks', 'wins'];
  const queue = new BatchQueue();

  try {
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, 'users', uid, sub));
      for (const d of snap.docs) {
        queue.addDelete(d.ref);
      }
    }
    await queue.commitAll(`users/${uid}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }
}

export async function deleteEntireUserWorkspace(uid: string): Promise<void> {
  await clearCloudWorkspaceItems(uid);
  const userRef = doc(db, 'users', uid);
  const queue = new BatchQueue();
  queue.addDelete(userRef);
  await queue.commitAll(`users/${uid}`);
}
