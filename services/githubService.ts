/**
 * Integração com GitHub API (repositório público).
 * Usado como "monitor" do projeto — traz nome, descrição, estrelas, último commit, etc.
 */

export interface RepoInfo {
  fullName: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  url: string;
  htmlUrl: string;
  lastPushed: string | null;
  language: string | null;
  createdAt: string;
}

const GITHUB_API = 'https://api.github.com';

/** Extrai owner e repo de uma URL (github.com/owner/repo ou owner/repo). */
export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : null;
    let owner: string;
    let repo: string;
    if (url) {
      const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[0];
        repo = parts[1].replace(/\.git$/, '');
        return { owner, repo };
      }
      return null;
    }
    const match = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (match) return { owner: match[1], repo: match[2] };
    return null;
  } catch {
    return null;
  }
}

/** Busca informações do repositório (API pública; para repo privado use backend com token). */
export async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      fullName: data.full_name ?? `${owner}/${repo}`,
      description: data.description ?? null,
      defaultBranch: data.default_branch ?? 'main',
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      url: data.url ?? '',
      htmlUrl: data.html_url ?? `https://github.com/${owner}/${repo}`,
      lastPushed: data.pushed_at ?? null,
      language: data.language ?? null,
      createdAt: data.created_at ?? '',
    };
  } catch {
    return null;
  }
}

/** Busca último commit da branch default (opcional). */
export async function fetchLastCommit(owner: string, repo: string, branch: string): Promise<{ sha: string; message: string; date: string } | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${branch}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      sha: data.sha?.slice(0, 7) ?? '',
      message: data.commit?.message?.split('\n')[0] ?? '',
      date: data.commit?.committer?.date ?? '',
    };
  } catch {
    return null;
  }
}
