/**
 * Open-source repository & project metadata for 「史序」.
 *
 * Defaults to the official GitHub repository and can be overridden at build
 * time via the VITE_REPO_URL environment variable for forks.
 */
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const DEFAULT_REPO_URL = 'https://github.com/dongyu-will/shixu-history';

function normalizeRepoUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.href.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export const REPO_URL = normalizeRepoUrl(env.VITE_REPO_URL || DEFAULT_REPO_URL);

export const REPO = Object.freeze({
  name: '史序 · Shixu History',
  owner: 'dongyu-will',
  repo: 'shixu-history',
  shortName: 'GitHub',
  license: 'MIT',
  url: REPO_URL,
  issuesUrl: REPO_URL ? `${REPO_URL}/issues` : '',
  label: 'GitHub 开源仓库',
  ariaLabel: '在 GitHub 查看史序开源仓库',
});

export const hasRepoUrl = () => Boolean(REPO.url);
