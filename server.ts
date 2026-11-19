import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import planHandler from './api/plan.ts';
import extractEventHandler from './api/extract-event.ts';
import unstickHandler from './api/unstick.ts';
import replanHandler from './api/replan.ts';
import captureHandler from './api/capture.ts';
import insightsHandler from './api/insights.ts';
import winNoteHandler from './api/win-note.ts';
import githubHandler from './api/github.ts';
import assistantHandler from './api/assistant.ts';
import copilotHandler from './api/copilot.ts';
import goalBreakdownHandler from './api/goal-breakdown.ts';
import assignmentExtractHandler from './api/assignment-extract.ts';
import opportunityExtractHandler from './api/opportunity-extract.ts';
import assistantCommandHandler from './api/assistant-command.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  const adapt =
    (handler: (req: any, res: any) => Promise<any>) =>
    async (req: Request, res: Response) => {
      try {
        await handler(req, res);
      } catch (err) {
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Orbit hit an unexpected server hiccup. Please try again in a moment.',
          });
        }
      }
    };

  app.all('/api/plan', adapt(planHandler));
  app.all('/api/extract-event', adapt(extractEventHandler));
  app.all('/api/unstick', adapt(unstickHandler));
  app.all('/api/replan', adapt(replanHandler));
  app.all('/api/capture', adapt(captureHandler));
  app.all('/api/insights', adapt(insightsHandler));
  app.all('/api/win-note', adapt(winNoteHandler));
  app.all('/api/github', adapt(githubHandler));
  app.all('/api/assistant', adapt(assistantHandler));
  app.all('/api/copilot', adapt(copilotHandler));
  app.all('/api/goal-breakdown', adapt(goalBreakdownHandler));
  app.all('/api/assignment-extract', adapt(assignmentExtractHandler));
  app.all('/api/opportunity-extract', adapt(opportunityExtractHandler));
  app.all('/api/assistant-command', adapt(assistantCommandHandler));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Orbit server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
