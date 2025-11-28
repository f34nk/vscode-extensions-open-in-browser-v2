import { openUrl, defaultBrowser, standardizedBrowserName } from './util';
import { isFileInGit, getGitInfo, isGitUrlPreferred, isLineNumbersEnabled, isDirectoryInGit, getCurrentBranch, extractJiraTicket, buildJiraUrl, getBaseBranch, getRemoteUrl, getCommitDetailsForLine } from './git';
import { buildGitProviderUrl, buildPrListUrl, buildCompareUrl, buildCommitUrl, buildCommitFileUrl } from './dynamicUrlBuilder';
import { isTerminalActive, getActiveTerminalCwd, isDirectory, isTerminalSupportEnabled } from './terminal';
import Config from './config';
import * as vscode from 'vscode';

function currentPageUri () {
  return vscode.window.activeTextEditor
      && vscode.window.activeTextEditor.document
      && vscode.window.activeTextEditor.document.uri;
}

/**
 * Get path and determine if it's a directory
 * Prioritizes editor, then falls back to terminal
 */
async function getPathAndType(path: any): Promise<{ uri: string | null; isDir: boolean }> {
  let uri: string | null = null;
  let isDir = false;
  
  if (path) {
    // Called from context menu with file path
    uri = path.fsPath;
    isDir = isDirectory(uri);
  } else {
    // Check if there's an active text editor first (prioritize editor over terminal)
    const _path = currentPageUri();
    if (_path && _path.fsPath) {
      // Editor is active, use it
      uri = _path.fsPath;
      isDir = false;
    } else if (isTerminalSupportEnabled() && isTerminalActive()) {
      // No active editor, check if terminal is active
      uri = await getActiveTerminalCwd();
      isDir = uri ? isDirectory(uri) : false;
      
      if (!uri) {
        return { uri: null, isDir: false };
      }
    }
  }
  
  return { uri, isDir };
}

/**
 * Build URL for file or directory
 */
async function buildUrl(uri: string, isDir: boolean): Promise<string> {
  let finalUrl: string;
  
  // Check if user prefers git URLs
  if (isGitUrlPreferred()) {
    let isInGit = false;
    
    if (isDir) {
      isInGit = await isDirectoryInGit(uri);
    } else {
      isInGit = await isFileInGit(uri);
    }
    
    if (isInGit) {
      // Get git info and build provider URL
      const includeLines = !isDir && isLineNumbersEnabled();
      const gitInfo = await getGitInfo(uri, includeLines, isDir);
      if (gitInfo) {
        const gitUrl = buildGitProviderUrl(gitInfo);
        if (gitUrl) {
          finalUrl = gitUrl;
        } else {
          // Fallback to local file if provider unknown
          finalUrl = 'file://' + uri;
          vscode.window.showWarningMessage('Unknown git provider, opening locally.');
        }
      } else {
        // Couldn't get git info (no remote, etc.)
        finalUrl = 'file://' + uri;
      }
    } else {
      // Not in git, use local file URL
      finalUrl = 'file://' + uri;
    }
  } else {
    // User disabled git URL preference, always use local file
    finalUrl = 'file://' + uri;
  }
  
  return finalUrl;
}

/** 
 * open default browser
 * if you have specified browser in configuration file, 
 * the browser you specified will work.
 * else the system default browser will work.
 */
export const openDefault = async (path: any): Promise<void> => {
  // 1. Get file path or terminal directory
  const { uri, isDir } = await getPathAndType(path);
  
  if (!uri) {
    const errorMsg = isTerminalActive() 
      ? 'Could not detect terminal directory.'
      : 'No file or terminal to open. Please save the file first or focus a terminal.';
    vscode.window.showErrorMessage(errorMsg);
    return;
  }
  
  // 2. Build URL (git provider or local file)
  const finalUrl = await buildUrl(uri, isDir);
  
  // 3. Get browser configuration
  let browser = await standardizedBrowserName(defaultBrowser());
  
  // If no browser configured, try to find a default one based on the platform
  if (!browser) {
    if (process.platform === 'darwin') {
      browser = 'firefox';
    } else if (process.platform === 'win32') {
      browser = 'chrome';
  } else {
      browser = 'google-chrome';
    }
  }
  
  // 4. Open in browser
  openUrl(finalUrl, browser);
};

/** 
 * open specify browser
 */
export const openBySpecify = async (path: any): Promise<void> => {
  // 1. Get file path or terminal directory
  const { uri, isDir } = await getPathAndType(path);
  
  if (!uri) {
    const errorMsg = isTerminalActive() 
      ? 'Could not detect terminal directory.'
      : 'No file or terminal to open. Please save the file first or focus a terminal.';
    vscode.window.showErrorMessage(errorMsg);
    return;
  }
  
  // 2. Build URL (git provider or local file)
  const finalUrl = await buildUrl(uri, isDir);
  
  // 3. Get available browsers and show picker
  const browsers = await Config.getBrowsers();
  
  const selected = await vscode.window.showQuickPick(browsers);
  
  if (!selected) {
    return;
  }
  
  openUrl(finalUrl, selected.standardName);
};

/**
 * Copy remote URL to clipboard
 */
export const copyRemoteUrl = async (path: any): Promise<void> => {
  // 1. Get file path or terminal directory
  const { uri, isDir } = await getPathAndType(path);
  
  if (!uri) {
    const errorMsg = isTerminalActive() 
      ? 'Could not detect terminal directory.'
      : 'No file or terminal to copy URL for. Please save the file first or focus a terminal.';
    vscode.window.showErrorMessage(errorMsg);
    return;
  }
  
  // 2. Build URL (git provider or local file)
  const finalUrl = await buildUrl(uri, isDir);
  
  // 3. Copy to clipboard
  try {
    await vscode.env.clipboard.writeText(finalUrl);
    
    // 4. Show success message with URL preview
    const shortUrl = finalUrl.length > 60 
      ? finalUrl.substring(0, 57) + '...' 
      : finalUrl;
    vscode.window.showInformationMessage(`URL copied to clipboard: ${shortUrl}`);
  } catch (error) {
    vscode.window.showErrorMessage('Failed to copy URL to clipboard');
  }
};

/**
 * Open PR list page for the repository
 */
export const openPrList = async (path: any): Promise<void> => {
  // 1. Get file path or terminal directory
  const { uri, isDir } = await getPathAndType(path);
  
  if (!uri) {
    const errorMsg = isTerminalActive() 
      ? 'Could not detect terminal directory.'
      : 'No file or terminal to open. Please save the file first or focus a terminal.';
    vscode.window.showErrorMessage(errorMsg);
    return;
  }
  
  // 2. Check if in git repository
  let isInGit = false;
  
  if (isDir) {
    isInGit = await isDirectoryInGit(uri);
  } else {
    isInGit = await isFileInGit(uri);
  }
  
  if (!isInGit) {
    vscode.window.showErrorMessage('File is not in a git repository.');
    return;
  }
  
  // 3. Get git info (we only need remote URL)
  const gitInfo = await getGitInfo(uri, false, isDir);
  
  if (!gitInfo || !gitInfo.remoteUrl) {
    vscode.window.showErrorMessage('No git remote configured for this repository.');
    return;
  }
  
  // 4. Build PR list URL
  const prListUrl = buildPrListUrl(gitInfo.remoteUrl);
  
  if (!prListUrl) {
    vscode.window.showWarningMessage('PR list not available for this git provider yet.');
    return;
  }
  
  // 5. Get browser configuration
  let browser = await standardizedBrowserName(defaultBrowser());
  
  if (!browser) {
    if (process.platform === 'darwin') {
      browser = 'firefox';
    } else if (process.platform === 'win32') {
      browser = 'chrome';
    } else {
      browser = 'google-chrome';
    }
  }
  
  // 6. Open in browser
  openUrl(prListUrl, browser);
};

/**
 * Open Jira ticket for current branch
 */
export const openJiraTicket = async (path: any): Promise<void> => {
  // 1. Get file path or terminal directory
  const { uri, isDir } = await getPathAndType(path);
  
  if (!uri) {
    const errorMsg = isTerminalActive() 
      ? 'Could not detect terminal directory.'
      : 'No file or terminal to open. Please save the file first or focus a terminal.';
    vscode.window.showErrorMessage(errorMsg);
    return;
  }
  
  // 2. Determine directory to check for git branch
  let dirPath: string;
  if (isDir) {
    dirPath = uri;
  } else {
    // Get directory of file
    const lastSlash = uri.lastIndexOf('/');
    dirPath = lastSlash > 0 ? uri.substring(0, lastSlash) : uri;
  }
  
  // 3. Check if in git repository
  const isInGit = isDir 
    ? await isDirectoryInGit(dirPath)
    : await isFileInGit(uri);
  
  if (!isInGit) {
    vscode.window.showErrorMessage('Not in a git repository.');
    return;
  }
  
  // 4. Get current branch name
  const branchName = await getCurrentBranch(dirPath);
  
  if (!branchName) {
    vscode.window.showErrorMessage('Could not determine current branch.');
    return;
  }
  
  // 5. Extract Jira ticket from branch name
  const ticket = extractJiraTicket(branchName);
  
  if (!ticket) {
    vscode.window.showErrorMessage(`No Jira ticket found in branch name: ${branchName}`);
    return;
  }
  
  // 6. Build Jira URL
  const jiraUrl = buildJiraUrl(ticket);
  
  // 7. Get browser configuration
  let browser = await standardizedBrowserName(defaultBrowser());
  
  if (!browser) {
    if (process.platform === 'darwin') {
      browser = 'firefox';
    } else if (process.platform === 'win32') {
      browser = 'chrome';
    } else {
      browser = 'google-chrome';
    }
  }
  
  // 8. Open in browser
  openUrl(jiraUrl, browser);
  
  // 9. Show success message with ticket info
  vscode.window.showInformationMessage(`Opening Jira ticket: ${ticket}`);
};

/**
 * Open compare URL for current branch
 */
export const openCompareUrl = async (path: any): Promise<void> => {
  // 1. Get file path or terminal directory
  const { uri, isDir } = await getPathAndType(path);
  
  if (!uri) {
    const errorMsg = isTerminalActive() 
      ? 'Could not detect terminal directory.'
      : 'No file or terminal to open. Please save the file first or focus a terminal.';
    vscode.window.showErrorMessage(errorMsg);
    return;
  }
  
  // 2. Determine directory to check for git branch
  let dirPath: string;
  if (isDir) {
    dirPath = uri;
  } else {
    // Get directory of file
    const lastSlash = uri.lastIndexOf('/');
    dirPath = lastSlash > 0 ? uri.substring(0, lastSlash) : uri;
  }
  
  // 3. Check if in git repository
  const isInGit = isDir 
    ? await isDirectoryInGit(dirPath)
    : await isFileInGit(uri);
  
  if (!isInGit) {
    vscode.window.showErrorMessage('Not in a git repository.');
    return;
  }
  
  // 4. Get current branch
  const currentBranch = await getCurrentBranch(dirPath);
  
  if (!currentBranch) {
    vscode.window.showErrorMessage('Could not determine current branch.');
    return;
  }
  
  // 5. Get base branch
  const baseBranch = await getBaseBranch(dirPath);
  
  if (!baseBranch) {
    vscode.window.showErrorMessage('Could not determine base branch.');
    return;
  }
  
  // 6. Check if on base branch
  if (currentBranch === baseBranch) {
    vscode.window.showWarningMessage(`Already on base branch '${baseBranch}'. Cannot create compare URL.`);
    return;
  }
  
  // 7. Get remote URL
  const remoteUrl = await getRemoteUrl(dirPath);
  
  if (!remoteUrl) {
    vscode.window.showErrorMessage('No git remote configured for this repository.');
    return;
  }
  
  // 8. Build compare URL
  const compareUrl = buildCompareUrl(remoteUrl, baseBranch, currentBranch);
  
  if (!compareUrl) {
    vscode.window.showWarningMessage('Compare URL not available for this git provider yet.');
    return;
  }
  
  // 9. Get browser configuration
  let browser = await standardizedBrowserName(defaultBrowser());
  
  if (!browser) {
    if (process.platform === 'darwin') {
      browser = 'firefox';
    } else if (process.platform === 'win32') {
      browser = 'chrome';
    } else {
      browser = 'google-chrome';
    }
  }
  
  // 10. Open in browser
  openUrl(compareUrl, browser);
  
  // 11. Show success message
  vscode.window.showInformationMessage(`Opening compare: ${baseBranch}...${currentBranch}`);
};

/**
 * Open commit URL for line under cursor
 */
export const openCommitUnderCursor = async (): Promise<void> => {
  // 1. Get active editor
  const editor = vscode.window.activeTextEditor;
  
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found.');
    return;
  }
  
  // 2. Get file path
  const document = editor.document;
  const filePath = document.uri.fsPath;
  
  // 3. Check if file is saved
  if (document.isUntitled || !filePath) {
    vscode.window.showErrorMessage('Please save the file first.');
    return;
  }
  
  // 4. Check if file is in git repository
  const isInGit = await isFileInGit(filePath);
  
  if (!isInGit) {
    vscode.window.showErrorMessage('File is not in a git repository.');
    return;
  }
  
  // 5. Get cursor position
  const cursorPosition = editor.selection.active;
  const lineNumber = cursorPosition.line + 1; // Convert 0-based to 1-based
  
  // 6. Get commit details for line
  const commitInfo = await getCommitDetailsForLine(filePath, lineNumber);
  
  if (!commitInfo) {
    vscode.window.showErrorMessage(`Could not find commit information for line ${lineNumber}.`);
    return;
  }
  
  // 7. Check if line is uncommitted
  if (commitInfo.uncommitted) {
    vscode.window.showWarningMessage(
      `Line ${lineNumber} has uncommitted changes. Commit or stash changes first.`
    );
    return;
  }
  
  // 8. Get git info (includes remote URL and relative path)
  const gitInfo = await getGitInfo(filePath, false);
  
  if (!gitInfo) {
    vscode.window.showErrorMessage('Could not retrieve git information for this file.');
    return;
  }
  
  // 9. Check if file-specific commit URLs are enabled
  const config = vscode.workspace.getConfiguration(Config.app);
  const includeFileInCommitUrl = config.get<boolean>('commitUrlIncludeFile', true);
  
  // 10. Build commit URL using dynamic URL builder
  let commitUrl: string | null = null;
  
  if (includeFileInCommitUrl) {
    // Build file-specific commit URL with line number
    commitUrl = buildCommitFileUrl(gitInfo.remoteUrl, commitInfo.sha, gitInfo.relativePath, lineNumber);
  } else {
    // Build basic commit URL
    commitUrl = buildCommitUrl(gitInfo.remoteUrl, commitInfo.sha);
  }
  
  if (!commitUrl) {
    vscode.window.showWarningMessage('Commit URL not available for this git provider yet.');
    return;
  }
  
  // 11. Get browser configuration
  let browser = await standardizedBrowserName(defaultBrowser());
  
  if (!browser) {
    if (process.platform === 'darwin') {
      browser = 'firefox';
    } else if (process.platform === 'win32') {
      browser = 'chrome';
    } else {
      browser = 'google-chrome';
    }
  }
  
  // 12. Open in browser
  openUrl(commitUrl, browser);
  
  // 13. Show success message with commit info
  const commitPreview = commitInfo.summary.length > 50 
    ? commitInfo.summary.substring(0, 47) + '...'
    : commitInfo.summary;
  
  vscode.window.showInformationMessage(
    `Opening commit ${commitInfo.shortSha}: ${commitPreview}`
  );
};
