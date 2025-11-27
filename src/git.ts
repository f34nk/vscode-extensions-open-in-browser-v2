import { exec } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import Config from './config';

/**
 * Promisified exec
 */
function execAsync(command: string, options: any): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ 
          stdout: stdout.toString(), 
          stderr: stderr.toString() 
        });
      }
    });
  });
}

export interface GitInfo {
  remoteUrl: string;      // e.g., "git@github.com:user/repo.git"
  branch: string;         // e.g., "main", "feature/xyz"
  repoRoot: string;       // e.g., "/Users/user/projects/repo"
  relativePath: string;   // e.g., "src/index.ts"
  lineStart?: number;     // e.g., 123 (cursor line or selection start)
  lineEnd?: number;       // e.g., 456 (selection end, undefined if single line)
  isDirectory?: boolean;  // true if path is a directory, not a file
}

export interface CommitInfo {
  sha: string;           // Full commit SHA (40 chars)
  shortSha: string;      // Short SHA (7 chars)
  author: string;        // Author name
  authorEmail: string;   // Author email
  date: string;          // Commit date (ISO string)
  summary: string;       // First line of commit message
  uncommitted: boolean;  // True if line not yet committed
}

/**
 * Get timeout value from configuration
 */
function getGitTimeout(): number {
  const config = vscode.workspace.getConfiguration(Config.app);
  return config.gitTimeout || 5000;
}

/**
 * Get line information from active editor
 * Returns line start and end (if selection exists)
 */
export function getLineInfo(): { lineStart?: number; lineEnd?: number } {
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    return {};
  }
  
  const selection = editor.selection;
  
  // Check if there's a selection (not just cursor position)
  if (selection.isEmpty) {
    // No selection, just cursor - return cursor line
    return {
      lineStart: selection.active.line + 1  // VS Code uses 0-based, browsers use 1-based
    };
  } else {
    // Selection exists - return range
    const start = Math.min(selection.start.line, selection.end.line) + 1;
    const end = Math.max(selection.start.line, selection.end.line) + 1;
    
    // Only return range if multiple lines selected
    if (start === end) {
      return { lineStart: start };
    } else {
      return { lineStart: start, lineEnd: end };
    }
  }
}

/**
 * Validate and normalize line numbers
 */
function validateLineNumbers(lineStart?: number, lineEnd?: number): { lineStart?: number; lineEnd?: number } {
  if (!lineStart || lineStart < 1) {
    return {};
  }
  
  if (lineEnd && lineEnd < lineStart) {
    // Swap if end < start (shouldn't happen with our code, but defensive)
    return { lineStart: lineEnd, lineEnd: lineStart };
  }
  
  return { lineStart, lineEnd };
}

/**
 * Run a git command in the directory containing the file
 */
async function runGitCommand(cwd: string, command: string): Promise<string> {
  try {
    const timeout = getGitTimeout();
    const { stdout } = await execAsync(command, { cwd, timeout });
    return stdout.trim();
  } catch (error) {
    throw error;
  }
}

/**
 * Check if file is tracked in a git repository
 */
export async function isFileInGit(filePath: string): Promise<boolean> {
  try {
    // Get the directory containing the file
    const fileDir = path.dirname(filePath);
    
    // Check if the file is tracked by git
    await runGitCommand(fileDir, `git ls-files --error-unmatch "${filePath}"`);
    return true;
  } catch (error) {
    // File is not tracked or not in a git repo
    return false;
  }
}

/**
 * Check if directory is in a git repository
 */
export async function isDirectoryInGit(dirPath: string): Promise<boolean> {
  try {
    // Check if directory is in a git repo
    await runGitCommand(dirPath, 'git rev-parse --git-dir');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get git repository information for a file or directory
 */
export async function getGitInfo(
  fileOrDirPath: string, 
  includeLines: boolean = true,
  isDirectory: boolean = false
): Promise<GitInfo | null> {
  try {
    const basePath = isDirectory ? fileOrDirPath : path.dirname(fileOrDirPath);
    
    // Get repository root
    const repoRoot = await runGitCommand(basePath, 'git rev-parse --show-toplevel');
    
    // Get current branch
    let branch: string;
    try {
      branch = await runGitCommand(basePath, 'git rev-parse --abbrev-ref HEAD');
      
      // Handle detached HEAD state
      if (branch === 'HEAD') {
        // Fallback to commit SHA
        branch = await runGitCommand(basePath, 'git rev-parse HEAD');
      }
    } catch (error) {
      // If branch detection fails, return null
      return null;
    }
    
    // Get remote URL
    let remoteUrl: string;
    try {
      remoteUrl = await runGitCommand(basePath, 'git remote get-url origin');
    } catch (error) {
      // No remote configured
      return null;
    }
    
    // Calculate relative path from repo root to file/directory
    const relativePath = path.relative(repoRoot, fileOrDirPath);
    
    // Get line information only for files, not directories
    let lineStart: number | undefined;
    let lineEnd: number | undefined;
    
    if (includeLines && !isDirectory) {
      const lineInfo = getLineInfo();
      const validated = validateLineNumbers(lineInfo.lineStart, lineInfo.lineEnd);
      lineStart = validated.lineStart;
      lineEnd = validated.lineEnd;
    }
    
    return {
      remoteUrl,
      branch,
      repoRoot,
      relativePath,
      lineStart,
      lineEnd,
      isDirectory
    };
  } catch (error) {
    // Git command failed
    return null;
  }
}

/**
 * Check if user has enabled git URL preference
 */
export function isGitUrlPreferred(): boolean {
  const config = vscode.workspace.getConfiguration(Config.app);
  // Default to true if not configured
  return config.preferGitUrl !== false;
}

/**
 * Check if user has enabled line numbers
 */
export function isLineNumbersEnabled(): boolean {
  const config = vscode.workspace.getConfiguration(Config.app);
  // Default to true if not configured
  return config.includeLineNumbers !== false;
}

/**
 * Get the current git branch name for a given directory
 * @param dirPath Directory path to check
 * @returns Branch name or null if not in git
 */
export async function getCurrentBranch(dirPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git symbolic-ref --short HEAD', {
      cwd: dirPath,
      timeout: getGitTimeout()
    });
    
    const branch = stdout.trim();
    return branch || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the remote URL for the repository
 * @param dirPath Directory path to check
 * @returns Remote URL or null if not found
 */
export async function getRemoteUrl(dirPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git remote get-url origin', {
      cwd: dirPath,
      timeout: getGitTimeout()
    });
    
    const remoteUrl = stdout.trim();
    return remoteUrl || null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract Jira ticket number from branch name
 * Pattern: [A-Z]{2,5}-[0-9]{1,6}
 * Examples: OX-2615, PLAT-123, FE-1
 * @param branchName Branch name to parse
 * @returns Ticket number or null if not found
 */
export function extractJiraTicket(branchName: string): string | null {
  // Match pattern: 2-5 uppercase letters, hyphen, 1-6 digits
  const ticketPattern = /([A-Z]{2,5}-[0-9]{1,6})/;
  const match = branchName.match(ticketPattern);
  
  return match ? match[1] : null;
}

/**
 * Build Jira URL for a ticket
 * @param ticket Ticket number (e.g., OX-2615)
 * @returns Full Jira URL
 */
export function buildJiraUrl(ticket: string): string {
  const baseUrl = Config.getJiraBaseUrl();
  return `${baseUrl}/${ticket}`;
}

/**
 * Check if a specific branch exists
 * @param dirPath Directory path to check
 * @param branchName Branch name to check
 * @returns true if branch exists
 */
export async function branchExists(dirPath: string, branchName: string): Promise<boolean> {
  try {
    await execAsync(`git show-ref --verify refs/heads/${branchName}`, {
      cwd: dirPath,
      timeout: getGitTimeout()
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get configured base branch from settings or auto-detect
 * @returns Base branch name (default: 'main')
 */
export function getConfiguredBaseBranch(): string {
  const config = vscode.workspace.getConfiguration(Config.app);
  return config.get<string>('defaultBaseBranch', 'main');
}

/**
 * Get the default base branch for the repository
 * Tries 'main' first, falls back to 'master'
 * @param dirPath Directory path to check
 * @returns Base branch name or null if not found
 */
export async function getBaseBranch(dirPath: string): Promise<string | null> {
  // First, try configured default
  const configuredBase = getConfiguredBaseBranch();
  
  if (await branchExists(dirPath, configuredBase)) {
    return configuredBase;
  }
  
  // Try 'main'
  if (await branchExists(dirPath, 'main')) {
    return 'main';
  }
  
  // Try 'master'
  if (await branchExists(dirPath, 'master')) {
    return 'master';
  }
  
  // Try checking remote branches if local doesn't exist
  try {
    const { stdout } = await execAsync('git branch -r', {
      cwd: dirPath,
      timeout: getGitTimeout()
    });
    
    const branches = stdout.split('\n').map(b => b.trim());
    
    // Look for origin/main
    if (branches.some(b => b === 'origin/main')) {
      return 'main';
    }
    
    // Look for origin/master
    if (branches.some(b => b === 'origin/master')) {
      return 'master';
    }
  } catch (error) {
    // If remote check fails, fall through
  }
  
  // Default to 'main' even if it doesn't exist
  return 'main';
}

/**
 * Get commit SHA for a specific line in a file
 * Uses git blame to find the commit that last modified the line
 * @param filePath Absolute path to the file
 * @param lineNumber Line number (1-based)
 * @returns Commit SHA or null if not found
 */
export async function getCommitForLine(
  filePath: string,
  lineNumber: number
): Promise<string | null> {
  try {
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    // Get timeout from config
    const timeout = vscode.workspace.getConfiguration(Config.app).get<number>('gitTimeout', 5000);
    
    // Execute git blame for specific line
    // -L n,n: Only blame line n
    // --porcelain: Machine-readable format
    const result = await execAsync(
      `git blame -L ${lineNumber},${lineNumber} --porcelain "${fileName}"`,
      { cwd: fileDir, timeout }
    );
    
    if (!result.stdout) {
      return null;
    }
    
    // Parse porcelain format
    // First line format: <sha> <original-line> <final-line> <num-lines>
    const lines = result.stdout.trim().split('\n');
    const firstLine = lines[0];
    const shaMatch = firstLine.match(/^([0-9a-f]{40})/);
    
    if (!shaMatch) {
      return null;
    }
    
    const sha = shaMatch[1];
    
    // Check for uncommitted changes (SHA is all zeros)
    if (sha === '0000000000000000000000000000000000000000') {
      return null;
    }
    
    return sha;
  } catch (error) {
    console.error('Error getting commit for line:', error);
    return null;
  }
}

/**
 * Get detailed commit information for a specific line
 * @param filePath Absolute path to the file
 * @param lineNumber Line number (1-based)
 * @returns Commit information object or null
 */
export async function getCommitDetailsForLine(
  filePath: string,
  lineNumber: number
): Promise<CommitInfo | null> {
  try {
    const fileDir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    // Get timeout from config
    const timeout = vscode.workspace.getConfiguration(Config.app).get<number>('gitTimeout', 5000);
    
    // Execute git blame with porcelain format for detailed info
    const result = await execAsync(
      `git blame -L ${lineNumber},${lineNumber} --porcelain "${fileName}"`,
      { cwd: fileDir, timeout }
    );
    
    if (!result.stdout) {
      return null;
    }
    
    // Parse porcelain format
    const output = result.stdout;
    
    // Extract SHA (first line)
    const shaMatch = output.match(/^([0-9a-f]{40})/);
    if (!shaMatch) {
      return null;
    }
    
    const sha = shaMatch[1];
    
    // Check for uncommitted changes
    const uncommitted = sha === '0000000000000000000000000000000000000000';
    
    // Extract author
    const authorMatch = output.match(/^author (.+)$/m);
    const author = authorMatch ? authorMatch[1] : 'Unknown';
    
    // Extract author email
    const emailMatch = output.match(/^author-mail <(.+)>$/m);
    const authorEmail = emailMatch ? emailMatch[1] : '';
    
    // Extract date
    const dateMatch = output.match(/^author-time (\d+)$/m);
    const timestamp = dateMatch ? parseInt(dateMatch[1], 10) : 0;
    const date = new Date(timestamp * 1000).toISOString();
    
    // Extract commit summary
    const summaryMatch = output.match(/^summary (.+)$/m);
    const summary = summaryMatch ? summaryMatch[1] : '';
    
    return {
      sha,
      shortSha: sha.substring(0, 7),
      author,
      authorEmail,
      date,
      summary,
      uncommitted
    };
  } catch (error) {
    console.error('Error getting commit details:', error);
    return null;
  }
}
