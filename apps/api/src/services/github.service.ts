import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function getPullRequestDiff(owner: string, repo: string, prNumber: number) {
  const { data } = await octokit.pulls.get({
    owner, repo, pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  return data as unknown as string;
}

export async function getPullRequestFiles(owner: string, repo: string, prNumber: number) {
  const { data } = await octokit.pulls.listFiles({ owner, repo, pull_number: prNumber });
  return data;
}

export async function getFileContent(owner: string, repo: string, path: string, ref: string) {
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
  if ("content" in data) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return null;
}

export async function createFixPullRequest(params: {
  owner: string; repo: string; baseBranch: string; title: string; body: string;
  files: Array<{ path: string; content: string }>;
}) {
  const branchName = `codeguard/fix-${Date.now()}`;

  // Get base ref
  const { data: ref } = await octokit.git.getRef({ owner: params.owner, repo: params.repo, ref: `heads/${params.baseBranch}` });

  // Create branch
  await octokit.git.createRef({ owner: params.owner, repo: params.repo, ref: `refs/heads/${branchName}`, sha: ref.object.sha });

  // Commit files
  for (const file of params.files) {
    await octokit.repos.createOrUpdateFileContents({
      owner: params.owner, repo: params.repo, path: file.path, branch: branchName,
      message: `fix: auto-fix by CodeGuard AI - ${file.path}`,
      content: Buffer.from(file.content).toString("base64"),
    });
  }

  // Create PR
  const { data: pr } = await octokit.pulls.create({
    owner: params.owner, repo: params.repo, head: branchName, base: params.baseBranch,
    title: params.title, body: params.body,
  });

  return pr;
}
