import type { ApiRequest, ApiResponse } from '../lib/gemini';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawUsername = req.query?.username;
  const username = (Array.isArray(rawUsername) ? rawUsername[0] : rawUsername || '').trim();

  if (!username || !/^[a-zA-Z0-9-]+$/.test(username)) {
    return res.status(400).json({ error: 'Please enter a valid GitHub username.' });
  }

  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Orbit-Student-Copilot',
    };

    const [eventsRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`, {
        headers,
      }),
      fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=10`,
        { headers }
      ),
    ]);

    if (eventsRes.status === 404 || reposRes.status === 404) {
      return res.status(404).json({ error: `Could not find public GitHub user "${username}".` });
    }
    if (eventsRes.status === 403 || reposRes.status === 403) {
      return res.status(429).json({
        error: 'GitHub public rate limit was reached for a moment. Please try again shortly.',
      });
    }
    if (!eventsRes.ok || !reposRes.ok) {
      return res.status(502).json({
        error: 'Could not reach GitHub right now. You can try refreshing in a moment.',
      });
    }

    const events = (await eventsRes.json()) as any[];
    const repos = (await reposRes.json()) as any[];

    const pushEvents = Array.isArray(events)
      ? events.filter((e) => e.type === 'PushEvent' && e.created_at)
      : [];

    let lastCommitDate: string | null = null;
    if (pushEvents.length > 0) {
      lastCommitDate = pushEvents[0].created_at;
    } else if (Array.isArray(repos) && repos.length > 0 && repos[0].pushed_at) {
      lastCommitDate = repos[0].pushed_at;
    }

    let daysSinceLastCommit: number | null = null;
    if (lastCommitDate) {
      const diffMs = Date.now() - new Date(lastCommitDate).getTime();
      daysSinceLastCommit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const languageCounts = new Map<string, number>();
    if (Array.isArray(repos)) {
      for (const repo of repos) {
        if (repo.language) {
          languageCounts.set(repo.language, (languageCounts.get(repo.language) || 0) + 1);
        }
      }
    }

    const languages = Array.from(languageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    return res.status(200).json({
      username,
      daysSinceLastCommit,
      lastCommitDate,
      languages,
      recentRepoCount: Array.isArray(repos) ? repos.length : 0,
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return res.status(502).json({
      error: 'Unable to fetch GitHub public activity right now. Please try again shortly.',
    });
  }
}
