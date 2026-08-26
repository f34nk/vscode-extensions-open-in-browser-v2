import * as path from 'path';
import * as vscode from 'vscode';

/** Characters allowed inside a ticket token at the cursor */
const TICKET_CHAR = /[#A-Za-z0-9_-]/;

/** Last editor that had focus; used when context-menu commands run without activeTextEditor */
let lastKnownEditor: vscode.TextEditor | undefined;

/** Last workspace file editor focused; Cursor may keep chat/composer as activeTextEditor */
let lastKnownFileEditor: vscode.TextEditor | undefined;

function isWorkspaceFileEditor(editor: vscode.TextEditor): boolean {
  return editor.document.uri.scheme === 'file';
}

function sameDocumentUri(a: vscode.Uri, b: vscode.Uri): boolean {
  if (a.scheme !== b.scheme) {
    return false;
  }
  if (a.scheme === 'file') {
    const aPath = a.fsPath || a.path;
    const bPath = b.fsPath || b.path;
    if (aPath && bPath) {
      return path.normalize(aPath) === path.normalize(bPath);
    }
  }
  return a.toString() === b.toString();
}

function isEditorStillVisible(editor: vscode.TextEditor): boolean {
  return vscode.window.visibleTextEditors.some((visible) =>
    sameDocumentUri(visible.document.uri, editor.document.uri)
  );
}

function findVisibleEditorByUri(resource: vscode.Uri): vscode.TextEditor | undefined {
  return vscode.window.visibleTextEditors.find((editor) =>
    sameDocumentUri(editor.document.uri, resource)
  );
}

/**
 * Normalize a command argument into a vscode.Uri when possible.
 */
export function coerceResourceUri(path: unknown): vscode.Uri | undefined {
  if (!path) {
    return undefined;
  }

  if (typeof path === 'string') {
    return vscode.Uri.file(path);
  }

  const uri = path as vscode.Uri;
  if (uri.fsPath) {
    return uri.scheme ? uri : vscode.Uri.file(uri.fsPath);
  }
  if (uri.scheme === 'file' && uri.path) {
    return vscode.Uri.file(uri.path);
  }

  return uri.toString() ? uri : undefined;
}

/**
 * Track the most recently focused text editor for cursor-based commands.
 */
export function trackLastActiveTextEditor(context: vscode.ExtensionContext): void {
  lastKnownEditor = vscode.window.activeTextEditor;
  if (lastKnownEditor && isWorkspaceFileEditor(lastKnownEditor)) {
    lastKnownFileEditor = lastKnownEditor;
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        lastKnownEditor = editor;
        if (isWorkspaceFileEditor(editor)) {
          lastKnownFileEditor = editor;
        }
      }
    })
  );
}

/**
 * Resolve the editor whose cursor should be used for ticket detection.
 * Context-menu commands often pass the document URI while activeTextEditor is unset.
 * Cursor may keep chat/composer focused while a file editor remains visible.
 */
export function resolveEditorForTicket(path?: vscode.Uri): vscode.TextEditor | undefined {
  const resource = coerceResourceUri(path);

  // Context menu: prefer the editor for the invoked resource over activeTextEditor.
  if (resource) {
    const fromPath = findVisibleEditorByUri(resource);
    if (fromPath) {
      return fromPath;
    }
  }

  const active = vscode.window.activeTextEditor;
  if (active && isWorkspaceFileEditor(active)) {
    return active;
  }

  if (lastKnownFileEditor && isEditorStillVisible(lastKnownFileEditor)) {
    return lastKnownFileEditor;
  }

  return active ?? lastKnownEditor;
}

function expandTicketToken(line: string, index: number): { start: number; end: number } {
  let start = index;
  let end = index;

  if (index >= line.length) {
    index = Math.max(0, line.length - 1);
    start = index;
    end = index;
  }

  while (start > 0 && TICKET_CHAR.test(line[start - 1])) {
    start--;
  }
  while (end < line.length && TICKET_CHAR.test(line[end])) {
    end++;
  }

  return { start, end };
}

/**
 * Extract a ticket-like word at the given cursor position.
 */
export function getTicketWordAt(
  document: vscode.TextDocument,
  position: vscode.Position
): string | null {
  const lineText = document.lineAt(position.line).text;
  const index = position.character;

  const { start, end } = expandTicketToken(lineText, index);
  if (start === end) {
    return null;
  }

  const word = lineText.substring(start, end);
  return word.length > 0 ? word : null;
}

/**
 * Extract a ticket-like word under the cursor in the active editor.
 */
export function getTicketWordAtCursor(
  editor?: vscode.TextEditor,
  path?: vscode.Uri
): string | null {
  const resolvedEditor = editor ?? resolveEditorForTicket(path);
  if (!resolvedEditor) {
    return null;
  }

  return getTicketWordAt(resolvedEditor.document, resolvedEditor.selection.active);
}

/** @internal Resets module state between unit tests. */
export function resetTicketEditorTrackingForTests(): void {
  lastKnownEditor = undefined;
  lastKnownFileEditor = undefined;
}

/** @internal Seeds lastKnownFileEditor for unit tests. */
export function setLastKnownFileEditorForTests(editor: vscode.TextEditor | undefined): void {
  lastKnownFileEditor = editor;
}
