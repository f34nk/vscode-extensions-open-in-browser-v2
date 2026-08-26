import * as vscode from 'vscode';

const OUTPUT_CHANNEL_NAME = 'Open in Browser';
const SHOW_LOG_ACTION = 'Show Log';

export interface LogOptions {
  /** Short label for the code path, e.g. "openTicketInBrowser" */
  context?: string;
  /** Underlying exception or rejection reason */
  error?: unknown;
  /** Extra key/value pairs written beneath the message */
  details?: Record<string, unknown>;
}

let outputChannel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  return outputChannel;
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

function formatDetails(details?: Record<string, unknown>): string | undefined {
  if (!details || Object.keys(details).length === 0) {
    return undefined;
  }

  return Object.entries(details)
    .map(([key, value]) => `  ${key}: ${String(value)}`)
    .join('\n');
}

function write(level: 'ERROR' | 'WARN' | 'INFO', message: string, options?: LogOptions): void {
  const contextPrefix = options?.context ? `[${options.context}] ` : '';
  getChannel().appendLine(`${new Date().toISOString()} ${level} ${contextPrefix}${message}`);

  const details = formatDetails(options?.details);
  if (details) {
    getChannel().appendLine(details);
  }

  if (options?.error !== undefined) {
    getChannel().appendLine(formatError(options.error));
  }
}

export function logError(message: string, options?: LogOptions): void {
  write('ERROR', message, options);
}

export function logWarn(message: string, options?: LogOptions): void {
  write('WARN', message, options);
}

export function logInfo(message: string, context?: string): void {
  const contextPrefix = context ? `[${context}] ` : '';
  getChannel().appendLine(`${new Date().toISOString()} INFO ${contextPrefix}${message}`);
}

export function showLog(): void {
  getChannel().show(true);
}

/**
 * Log an error and show a notification with a "Show Log" action.
 */
export function notifyError(message: string, options?: LogOptions): void {
  logError(message, options);
  void vscode.window.showErrorMessage(message, SHOW_LOG_ACTION).then((choice) => {
    if (choice === SHOW_LOG_ACTION) {
      showLog();
    }
  });
}

/**
 * Log a warning and show a notification.
 */
export function notifyWarning(message: string, options?: LogOptions): void {
  logWarn(message, options);
  void vscode.window.showWarningMessage(message);
}

export function resetOutputChannelForTests(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}

export function disposeLogger(): void {
  resetOutputChannelForTests();
}
