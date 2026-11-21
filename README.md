# Orbit

> **"Other apps punish you when you fall behind. Orbit makes the restart small."**

Orbit is an AI executive-function personal assistant designed for neurodivergent students, Orbit replaces red overdue warnings, broken streaks, and cluttered lists with a clear 7-section workspace, a 2-minute starter ring, and a context-aware AI assistant.

---

## Sections & Features

1. **Today — Daily Action Centre**: Prioritized daily queue adapted by **Brain Weather** (*Fried* 5m / *Okay* 15m / *Locked-in* 25m) and **Available Time** today. Includes the **2-minute starter timer** (only in Today) that starts with the smallest first physical action and lets you continue for 15/25 minutes, pause, or finish—never forcing completion—plus **I'm stuck** and **Guilt-Free Restart**.
2. **Goals — Central Progress Tracking**: Multiple independent Goal cards with dedicated detail pages organized into **Monthly Milestones** (*Luna → Vega → Polaris*), **Weekly Targets**, and **Individual Checkbox Tasks** (with strikethrough and auto-synced progress across the app). Supports create (with AI syllabus breakdown), edit, pause, resume, archive, and delete.
3. **Assignments — Academic Workspace**: Upload PDFs, images, documents, or screenshots (or paste text) to extract assignment/exam details and break work into editable, reorderable steps while gently rebalancing your schedule.
4. **Planner — Weekly & Monthly Views**: Toggle between **Weekly** (daily schedule, rescheduling, duration/priority editing, gentle missed-task recovery) and **Monthly** (Luna/Vega/Polaris milestones and major deadlines).
5. **Opportunities — External Deadline Tracker**: Dedicated tracker for internships, hackathons, courses, scholarships, and competitions with **One-Paste Capture**, an **editable confirmation preview before saving**, customizable reminder windows, and status tracking (`Interested`, `To Apply`, `Applied`, `Registered`, `Completed`, `Expired`).
6. **Insights — Gentle Patterns**: Pattern Card observations, weekly completion rhythm, goal progress, productive time periods, common obstacles, frequently postponed tasks, Win Notes, and optional GitHub practice activity—with zero streaks or leaderboards.
7. **Privacy — Data Controls & Comfort**: Local-only `localStorage` transparency ledger, One-Paste Capture & Voice consent switches, **Reduce motion** toggle, and a **Delete all my data** control.
8. **Global AI Personal Assistant**: Accessible across all 7 sections via chat, voice dictation, and file/image/PDF upload—context-aware of your goals, tasks, deadlines, and schedule, asking confirmation before making significant changes.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Serverless API (`/api/*.ts`)**: Vercel-style Node serverless functions + Express dev/prod server (`server.ts`)
- **AI**: Google Gemini API (`@google/genai`, `gemini-3.1-flash-lite` with `ThinkingLevel.MINIMAL` for fast extraction/chat)
- **Persistence**: Browser `localStorage` only (`orbit_copilot_state_v2`, with automatic migration from `v1`)

---

## Setup & Deployment

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set `GEMINI_API_KEY` in your environment or `.env` file:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
3. Run the dev server on port 3000:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

### Deploy on Vercel
1. Import the repository into Vercel.
2. Add `GEMINI_API_KEY` in **Project Settings → Environment Variables**.
3. Deploy—`vercel.json` routes `/api/*` to the serverless functions in `/api` and serves the built Vite SPA.
