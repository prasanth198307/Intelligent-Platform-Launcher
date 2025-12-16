import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('Replit identity token not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected. Please set up GitHub integration first.');
  }
  return accessToken;
}

export async function getGitHubClient(): Promise<Octokit> {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function isGitHubConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function getAuthenticatedUser() {
  const octokit = await getGitHubClient();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function listRepositories(options?: { type?: 'all' | 'owner' | 'public' | 'private' | 'member'; sort?: 'created' | 'updated' | 'pushed' | 'full_name'; per_page?: number }) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    type: options?.type || 'owner',
    sort: options?.sort || 'updated',
    per_page: options?.per_page || 30
  });
  return data;
}

export async function getRepository(owner: string, repo: string) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}

export async function createRepository(name: string, options?: { description?: string; private?: boolean; auto_init?: boolean }) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    description: options?.description,
    private: options?.private ?? true,
    auto_init: options?.auto_init ?? true
  });
  return data;
}

export async function listBranches(owner: string, repo: string) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.repos.listBranches({ owner, repo });
  return data;
}

export async function createBranch(owner: string, repo: string, branchName: string, sourceBranch: string = 'main') {
  const octokit = await getGitHubClient();
  
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${sourceBranch}`
  });
  
  const { data } = await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: refData.object.sha
  });
  
  return data;
}

export async function getFileContent(owner: string, repo: string, path: string, branch?: string) {
  const octokit = await getGitHubClient();
  const params: any = { owner, repo, path };
  if (branch) params.ref = branch;
  
  const { data } = await octokit.repos.getContent(params);
  
  if ('content' in data && data.type === 'file') {
    return {
      content: Buffer.from(data.content, 'base64').toString('utf-8'),
      sha: data.sha,
      path: data.path,
      size: data.size
    };
  }
  
  return data;
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch?: string,
  existingSha?: string
) {
  const octokit = await getGitHubClient();
  
  let sha = existingSha;
  if (!sha) {
    try {
      const existing = await getFileContent(owner, repo, path, branch);
      if ('sha' in existing) {
        sha = existing.sha;
      }
    } catch {
    }
  }
  
  const params: any = {
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64')
  };
  
  if (branch) params.branch = branch;
  if (sha) params.sha = sha;
  
  const { data } = await octokit.repos.createOrUpdateFileContents(params);
  return data;
}

export async function listCommits(owner: string, repo: string, options?: { branch?: string; per_page?: number }) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    sha: options?.branch,
    per_page: options?.per_page || 10
  });
  return data;
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string
) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    head,
    base,
    body
  });
  return data;
}

export async function listPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
  const octokit = await getGitHubClient();
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state,
    per_page: 20
  });
  return data;
}

export async function listIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
  const octokit = await getGitHubClient();
  const { data } = await octokit.issues.listForRepo({
    owner,
    repo,
    state,
    per_page: 20
  });
  return data;
}

export async function createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]) {
  const octokit = await getGitHubClient();
  const { data } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels
  });
  return data;
}
