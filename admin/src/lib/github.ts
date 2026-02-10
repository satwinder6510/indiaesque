import { Octokit } from "octokit";

// Validate GitHub configuration
function validateConfig() {
  const missing: string[] = [];
  if (!process.env.GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
  if (!process.env.GITHUB_OWNER) missing.push("GITHUB_OWNER");
  if (!process.env.GITHUB_REPO) missing.push("GITHUB_REPO");

  if (missing.length > 0) {
    throw new Error(`GitHub not configured. Missing: ${missing.join(", ")}. Add these to .env.local`);
  }
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.GITHUB_OWNER || "";
const repo = process.env.GITHUB_REPO || "";

// Base path for the Astro project within the repo
export const CONTENT_BASE = "india-experiences/src/content";

export interface GitHubFile {
  path: string;
  content: string;
  sha?: string;
}

export interface GitHubFileInfo {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
}

/**
 * Read a file from the GitHub repository
 */
export async function readFile(path: string): Promise<string | null> {
  validateConfig();
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if ("content" in response.data && response.data.type === "file") {
      return Buffer.from(response.data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get file info including SHA (needed for updates)
 */
export async function getFileInfo(path: string): Promise<{ sha: string; content: string } | null> {
  validateConfig();
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if ("content" in response.data && response.data.type === "file") {
      return {
        sha: response.data.sha,
        content: Buffer.from(response.data.content, "base64").toString("utf-8"),
      };
    }
    return null;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Write a single file to the GitHub repository
 */
export async function writeFile(
  path: string,
  content: string,
  message: string,
  existingSha?: string
): Promise<{ sha: string; committed: boolean }> {
  // Get existing file SHA if not provided
  let sha = existingSha;
  if (!sha) {
    const existing = await getFileInfo(path);
    sha = existing?.sha;
  }

  const response = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    sha,
  });

  return {
    sha: response.data.content?.sha || "",
    committed: true,
  };
}

/**
 * Delete a file from the GitHub repository
 */
export async function deleteFile(path: string, message: string): Promise<boolean> {
  const fileInfo = await getFileInfo(path);
  if (!fileInfo) {
    return false;
  }

  await octokit.rest.repos.deleteFile({
    owner,
    repo,
    path,
    message,
    sha: fileInfo.sha,
  });

  return true;
}

/**
 * List files in a directory
 */
export async function listDirectory(path: string): Promise<GitHubFileInfo[]> {
  validateConfig();
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(response.data)) {
      return response.data.map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size || 0,
        type: item.type as "file" | "dir",
      }));
    }
    return [];
  } catch (error: unknown) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  const info = await getFileInfo(path);
  return info !== null;
}

/**
 * Batch commit multiple files in a single commit using Git Trees API
 */
export async function batchCommit(
  files: GitHubFile[],
  message: string,
  branch: string = "main"
): Promise<{ sha: string; committed: boolean }> {
  // Get the current commit SHA for the branch
  const refResponse = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const currentCommitSha = refResponse.data.object.sha;

  // Get the tree SHA from the current commit
  const commitResponse = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: currentCommitSha,
  });
  const baseTreeSha = commitResponse.data.tree.sha;

  // Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blobResponse = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      });

      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobResponse.data.sha,
      };
    })
  );

  // Create a new tree
  const treeResponse = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // Create a new commit
  const newCommitResponse = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: treeResponse.data.sha,
    parents: [currentCommitSha],
  });

  // Update the branch reference
  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommitResponse.data.sha,
  });

  return {
    sha: newCommitResponse.data.sha,
    committed: true,
  };
}

/**
 * Read JSON file and parse it
 */
export async function readJSON<T>(path: string): Promise<T | null> {
  const content = await readFile(path);
  if (!content) return null;
  return JSON.parse(content) as T;
}

/**
 * Write JSON file with pretty formatting
 */
export async function writeJSON<T>(
  path: string,
  data: T,
  message: string
): Promise<{ sha: string; committed: boolean }> {
  const content = JSON.stringify(data, null, 2);
  return writeFile(path, content, message);
}

/**
 * Upload a binary file (like an image) to the GitHub repository
 */
export async function uploadBinaryFile(
  path: string,
  base64Content: string,
  message: string
): Promise<{ sha: string; committed: boolean }> {
  validateConfig();
  // Get existing file SHA if it exists (for updates)
  let sha: string | undefined;
  const existing = await getFileInfo(path);
  if (existing) {
    sha = existing.sha;
  }

  const response = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: base64Content,
    sha,
  });

  return {
    sha: response.data.content?.sha || "",
    committed: true,
  };
}
