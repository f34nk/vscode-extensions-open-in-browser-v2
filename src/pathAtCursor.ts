import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** Characters allowed inside a file path token at the cursor */
const PATH_CHAR = /[a-zA-Z0-9_./\\@~\-:#]/;

/** Optional `:line` or `:line:column` suffix (path-first) */
const LINE_COL_SUFFIX = /^(.+?):(\d+)(?::(\d+))?$/;

/** Optional `:line:` suffix with trailing colon (compiler/linter output) */
const LINE_SUFFIX_TRAILING_COLON = /^(.+?):(\d+):$/;

/** Optional `line:column:` or `line:` prefix (location-first) */
const PREFIX_LINE_COL = /^(\d+):(\d+):(.+)$/;
const PREFIX_LINE = /^(\d+):(.+)$/;

/** Optional `#Lline` or `#Lline-Lend` suffix (GitHub-style) */
const HASH_LINE_SUFFIX = /^(.+?)#L(\d+)(?:-L(\d+))?$/;

export interface ParsedPathAtCursor {
  /** Raw path without line/column suffix */
  filePath: string;
  /** 0-based line to reveal, or undefined */
  line?: number;
  /** 0-based column to reveal, or undefined */
  column?: number;
}

/**
 * Expand left/right from cursor while characters match a path token.
 */
function expandPathToken(line: string, index: number): { start: number; end: number } {
  let start = index;
  let end = index;

  if (index >= line.length) {
    index = Math.max(0, line.length - 1);
    start = index;
    end = index;
  }

  while (start > 0 && PATH_CHAR.test(line[start - 1])) {
    start--;
  }
  while (end < line.length && PATH_CHAR.test(line[end])) {
    end++;
  }

  return { start, end };
}

/**
 * Strip surrounding quotes/backticks if cursor is inside a quoted string.
 */
function stripQuotesIfInside(line: string, index: number, token: string): string {
  const quoteChars = ['"', "'", '`'] as const;

  for (const q of quoteChars) {
    const before = line.lastIndexOf(q, index);
    const after = line.indexOf(q, index);
    if (before >= 0 && after > before && before < index && after > index) {
      const inner = line.substring(before + 1, after);
      if (inner.includes(token)) {
        return token;
      }
    }
  }

  return token;
}

function looksLikeFilePath(filePath: string): boolean {
  if (/^https?:\/\//i.test(filePath)) {
    return false;
  }
  return (
    filePath.includes('/') ||
    filePath.includes('\\') ||
    /\.[a-z0-9]+$/i.test(filePath)
  );
}

/**
 * Parse line/column suffix or prefix from a path token.
 */
export function parsePathToken(raw: string): ParsedPathAtCursor | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..') {
    return null;
  }

  let filePath = trimmed;
  let line: number | undefined;
  let column: number | undefined;

  const hashMatch = trimmed.match(HASH_LINE_SUFFIX);
  if (hashMatch) {
    filePath = hashMatch[1];
    line = parseInt(hashMatch[2], 10) - 1;
  } else {
    const prefixLineColMatch = trimmed.match(PREFIX_LINE_COL);
    if (prefixLineColMatch) {
      filePath = prefixLineColMatch[3];
      line = parseInt(prefixLineColMatch[1], 10) - 1;
      column = parseInt(prefixLineColMatch[2], 10) - 1;
    } else {
      const prefixLineMatch = trimmed.match(PREFIX_LINE);
      if (prefixLineMatch && looksLikeFilePath(prefixLineMatch[2])) {
        filePath = prefixLineMatch[2];
        line = parseInt(prefixLineMatch[1], 10) - 1;
      } else {
        const lineMatch = trimmed.match(LINE_COL_SUFFIX);
        if (lineMatch) {
          filePath = lineMatch[1];
          line = parseInt(lineMatch[2], 10) - 1;
          if (lineMatch[3]) {
            column = parseInt(lineMatch[3], 10) - 1;
          }
        } else {
          const trailingColonMatch = trimmed.match(LINE_SUFFIX_TRAILING_COLON);
          if (trailingColonMatch) {
            filePath = trailingColonMatch[1];
            line = parseInt(trailingColonMatch[2], 10) - 1;
          }
        }
      }
    }
  }

  filePath = filePath.replace(/\\/g, '/');

  if (!looksLikeFilePath(filePath)) {
    return null;
  }

  return { filePath, line, column };
}

/**
 * Extract a file path at the given cursor position.
 */
export function getPathAtCursor(
  document: vscode.TextDocument,
  position: vscode.Position
): ParsedPathAtCursor | null {
  const lineText = document.lineAt(position.line).text;
  const index = position.character;

  const { start, end } = expandPathToken(lineText, index);
  if (start === end) {
    return null;
  }

  let token = lineText.substring(start, end);
  token = stripQuotesIfInside(lineText, index, token);

  return parsePathToken(token);
}

/**
 * Resolve a path string to an absolute filesystem path.
 * Search order:
 *   1. ~ expansion
 *   2. Absolute path
 *   3. Each workspace folder root
 *   4. Directory of the document containing the cursor
 */
export function resolvePathToAbsolute(
  filePath: string,
  documentPath: string
): string | null {
  let candidate = filePath;

  if (candidate.startsWith('~/')) {
    candidate = path.join(os.homedir(), candidate.slice(2));
  }

  if (path.isAbsolute(candidate)) {
    return fs.existsSync(candidate) ? candidate : null;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of workspaceFolders) {
    const resolved = path.join(folder.uri.fsPath, candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  if (documentPath) {
    const fromDocument = path.join(path.dirname(documentPath), candidate);
    if (fs.existsSync(fromDocument)) {
      return fromDocument;
    }
  }

  // Last resort: return workspace-relative path even if missing (openTextDocument may still work for unsaved targets)
  if (workspaceFolders.length > 0) {
    return path.join(workspaceFolders[0].uri.fsPath, candidate);
  }

  if (documentPath) {
    return path.join(path.dirname(documentPath), candidate);
  }

  return null;
}

/**
 * Open a resolved absolute path in the current editor group.
 */
export async function openFileInEditor(
  absolutePath: string,
  parsed: ParsedPathAtCursor
): Promise<void> {
  const uri = vscode.Uri.file(absolutePath);

  if (!fs.existsSync(absolutePath)) {
    vscode.window.showErrorMessage(`File not found: ${parsed.filePath}`);
    return;
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    vscode.window.showErrorMessage(`Path is a directory, not a file: ${parsed.filePath}`);
    return;
  }

  const doc = await vscode.workspace.openTextDocument(uri);

  const selection =
    parsed.line !== undefined
      ? new vscode.Range(
          parsed.line,
          parsed.column ?? 0,
          parsed.line,
          parsed.column ?? 0
        )
      : undefined;

  await vscode.window.showTextDocument(doc, {
    viewColumn: vscode.ViewColumn.Active,
    preserveFocus: false,
    selection
  });

  const shortPath = parsed.filePath;
  let location = shortPath;
  if (parsed.line !== undefined) {
    location =
      parsed.column !== undefined
        ? `${shortPath}:${parsed.line + 1}:${parsed.column + 1}`
        : `${shortPath}:${parsed.line + 1}`;
  }
  vscode.window.showInformationMessage(`Opened ${location}`);
}
