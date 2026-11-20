import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface ApiRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
  query?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: any) => void;
  setHeader?: (name: string, value: string) => void;
}

export const GEMINI_MODEL = 'gemini-4-hydrogen';
export const GEMINI_FAST_MODEL = 'gemini-3.1-flash-lite';
export const FAST_THINKING_CONFIG = { thinkingLevel: ThinkingLevel.LOW };
export const INSTANT_THINKING_CONFIG = { thinkingLevel: ThinkingLevel.MINIMAL };

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'Orbit needs a Gemini API key in environment settings (GEMINI_API_KEY) before AI features can run.'
    );
    (err as any).statusCode = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function getFriendlyError(error: unknown): { status: number; message: string } {
  const statusCode =
    typeof (error as any)?.statusCode === 'number'
      ? (error as any).statusCode
      : typeof (error as any)?.status === 'number'
        ? (error as any).status
        : 500;

  const rawMsg = error instanceof Error ? error.message : String(error ?? 'Unknown error');

  if (statusCode === 503 || rawMsg.includes('GEMINI_API_KEY')) {
    return {
      status: 503,
      message:
        'Orbit cannot connect to Gemini yet because GEMINI_API_KEY is not configured in Secrets or environment variables.',
    };
  }
  if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Orbit is taking a quick breather because the AI quota is busy right now. Please try again in a few moments.',
    };
  }
  if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message:
        'The configured Gemini API key could not be verified. Please double-check GEMINI_API_KEY in Secrets.',
    };
  }

  return {
    status: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    message:
      'Orbit hit a gentle hiccup reaching the AI helper. Nothing you entered was lost — please try again.',
  };
}
