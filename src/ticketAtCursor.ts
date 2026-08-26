import * as vscode from 'vscode';

/** Characters allowed inside a ticket token at the cursor */
const TICKET_CHAR = /[#A-Za-z0-9_-]/;

/** Last editor that had focus; used when context-menu commands run without activeTextEditor */
let lastKnownEditor: vscode.TextEditor | undefined;

/**
 * Track the most recently focused text editor for cursor-based commands.
 */
export function trackLastActiveTextEditor(context: vscode.ExtensionContext): void {
  lastKnownEditor = vscode.window.activeTextEditor;

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        lastKnownEditor = editor;
      }
    })
  );
}

/**
 * Resolve the editor whose cursor should be used for ticket detection.
 * Context-menu commands often pass the document URI while activeTextEditor is unset.
 */
export function resolveEditorForTicket(path?: vscode.Uri): vscode.TextEditor | undefined {
  if (vscode.window.activeTextEditor) {
    return vscode.window.activeTextEditor;
  }

  if (path?.fsPath) {
    const fromVisible = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.fsPath === path.fsPath
    );
    if (fromVisible) {
      return fromVisible;
    }
  }

  return lastKnownEditor;
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
