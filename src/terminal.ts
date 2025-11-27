import { exec } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Check if a terminal is currently active
 */
export function isTerminalActive(): boolean {
  const terminal = vscode.window.activeTerminal;
  return terminal !== undefined;
}

/**
 * Check if path is a directory
 */
export function isDirectory(path: string): boolean {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Get current working directory from a process ID
 * Platform-specific implementation
 */
async function getProcessCwd(processId: number): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let command: string;
    
    if (process.platform === 'darwin') {
      // macOS: Use lsof
      command = `lsof -a -p ${processId} -d cwd -Fn | grep '^n' | cut -c2-`;
    } else if (process.platform === 'linux') {
      // Linux: Use pwdx or read from /proc
      command = `readlink -f /proc/${processId}/cwd 2>/dev/null || pwdx ${processId} 2>/dev/null | cut -d' ' -f2-`;
    } else if (process.platform === 'win32') {
      // Windows: Use PowerShell
      command = `powershell -NoProfile -Command "(Get-Process -Id ${processId}).Path | Split-Path -Parent"`;
    } else {
      resolve(null);
      return;
    }
    
    exec(command, (error: any, stdout: any) => {
      if (error || !stdout) {
        resolve(null);
      } else {
        const path = stdout.trim();
        // Normalize Windows paths
        resolve(path.replace(/\\/g, '/'));
      }
    });
  });
}

/**
 * Check if terminal fallback to workspace is enabled
 */
function shouldFallbackToWorkspace(): boolean {
  const config = vscode.workspace.getConfiguration('open-in-browser');
  return config.get('terminalFallbackToWorkspace', true);
}

/**
 * Get current working directory of the active terminal
 * Tries multiple approaches in order:
 * 1. Shell integration (VS Code 1.70+)
 * 2. Process-based detection
 * 3. Workspace root (if enabled)
 */
export async function getActiveTerminalCwd(): Promise<string | null> {
  const terminal = vscode.window.activeTerminal;
  if (!terminal) {
    return null;
  }
  
  // Approach 1: Shell integration (VS Code 1.70+)
  // Check if terminal has shell integration with cwd
  if ('shellIntegration' in terminal) {
    const shellIntegration = (terminal as any).shellIntegration;
    if (shellIntegration && shellIntegration.cwd) {
      const cwd = shellIntegration.cwd;
      if (cwd && cwd.fsPath) {
        return cwd.fsPath;
      }
    }
  }
  
  // Approach 2: Process-based detection
  try {
    const processId = await terminal.processId;
    if (processId) {
      const cwd = await getProcessCwd(processId);
      if (cwd && fs.existsSync(cwd)) {
        // Resolve symlinks to real path
        try {
          return fs.realpathSync(cwd);
        } catch (error) {
          return cwd;
        }
      }
    }
  } catch (error) {
    // Process detection failed
  }
  
  // Approach 3: Fall back to workspace root (if enabled)
  if (shouldFallbackToWorkspace()) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
  }
  
  return null;
}

/**
 * Check if terminal support is enabled
 */
export function isTerminalSupportEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('open-in-browser');
  return config.get('enableTerminalSupport', true);
}
