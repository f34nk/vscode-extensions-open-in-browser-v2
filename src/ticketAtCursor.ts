import * as vscode from 'vscode';

/** Characters allowed inside a ticket token at the cursor */
const TICKET_CHAR = /[#A-Za-z0-9_-]/;

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
export function getTicketWordAtCursor(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return null;
  }

  return getTicketWordAt(editor.document, editor.selection.active);
}
