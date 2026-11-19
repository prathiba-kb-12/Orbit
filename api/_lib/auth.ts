import fs from 'fs';
import path from 'path';
import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { ApiRequest, ApiResponse } from './gemini';

let cachedProjectId: string | null = null;

function resolveFirebaseProjectId(): string {
  if (cachedProjectId) return cachedProjectId;

  const envId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;

  if (envId && envId.trim()) {
    cachedProjectId = envId.trim();
    return cachedProjectId;
  }

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (
        typeof parsed?.projectId === 'string' &&
        parsed.projectId.trim() &&
        parsed.projectId !== 'remixed-project-id'
      ) {
        const pid: string = parsed.projectId.trim();
        cachedProjectId = pid;
        return pid;
      }
    }
  } catch {
    // Fall through to error check below
  }

  throw new Error('Firebase project configuration is missing on the server.');
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  const projectId = resolveFirebaseProjectId();
  return initializeApp({ projectId });
}

export interface AuthenticatedCaller {
  uid: string;
  email: string | null;
}

export async function requireAuthenticatedUser(
  req: ApiRequest,
  res: ApiResponse
): Promise<AuthenticatedCaller | null> {
  const rawHeader = req.headers?.authorization || req.headers?.Authorization;
  const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Please sign in to your Orbit account before using AI or synced actions.',
    });
    return null;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    res.status(401).json({
      error: 'Please sign in to your Orbit account before using AI or synced actions.',
    });
    return null;
  }

  try {
    const app = getAdminApp();
    const decoded = await getAuth(app).verifyIdToken(idToken);
    if (!decoded?.uid) {
      res.status(401).json({
        error: 'Your Orbit session could not be verified. Please sign in again.',
      });
      return null;
    }
    return {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email : null,
    };
  } catch {
    res.status(401).json({
      error: 'Your Orbit session expired or is invalid. Please sign in again.',
    });
    return null;
  }
}
