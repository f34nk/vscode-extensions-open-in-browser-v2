/**
 * Minimal vscode API mock for unit tests.
 * Configure via resetVscodeMock() before each test suite.
 */

import * as path from 'path';

export interface MockConfiguration {
  values: Record<string, unknown>;
  workspaceValues?: Record<string, unknown>;
  globalValues?: Record<string, unknown>;
}

export interface MockEditor {
  document: MockTextDocument;
  selection: MockSelection;
}

export interface MockTextDocument {
  uri: { fsPath: string; scheme: string };
  lineAt: (line: number) => { text: string };
  isUntitled?: boolean;
}

export interface MockSelection {
  active: { line: number; character: number };
  start: { line: number; character: number };
  end: { line: number; character: number };
  isEmpty: boolean;
}

export interface MockWorkspaceFolder {
  uri: { fsPath: string };
  name: string;
  index: number;
}

let config: MockConfiguration = { values: {} };
let activeEditor: MockEditor | undefined;
let workspaceFolders: MockWorkspaceFolder[] = [];
let activeTerminal: unknown;
let clipboardText = '';
const outputChannels: Map<string, { lines: string[]; show: () => void }> = new Map();

export function resetVscodeMock(options?: {
  config?: MockConfiguration;
  activeEditor?: MockEditor;
  workspaceFolders?: MockWorkspaceFolder[];
  activeTerminal?: unknown;
}): void {
  config = options?.config ?? { values: {} };
  activeEditor = options?.activeEditor;
  workspaceFolders = options?.workspaceFolders ?? [];
  activeTerminal = options?.activeTerminal;
  clipboardText = '';
  outputChannels.clear();
}

export function getClipboardText(): string {
  return clipboardText;
}

export function createMockDocument(
  lines: string[],
  fsPath: string = '/workspace/project/src/file.ts'
): MockTextDocument {
  return {
    uri: { fsPath, scheme: 'file' },
    lineAt: (line: number) => ({ text: lines[line] ?? '' })
  };
}

export function createMockEditor(
  document: MockTextDocument,
  line: number,
  character: number,
  selectionEnd?: { line: number; character: number }
): MockEditor {
  const end = selectionEnd ?? { line, character };
  const isEmpty = line === end.line && character === end.character;

  return {
    document,
    selection: {
      active: { line, character },
      start: { line, character: character },
      end,
      isEmpty
    }
  };
}

class MockConfigurationSection {
  constructor(private section: string) {}

  get<T>(key: string, defaultValue?: T): T {
    const fullKey = `${this.section}.${key}`;
    if (config.workspaceValues && fullKey in config.workspaceValues) {
      return config.workspaceValues[fullKey] as T;
    }
    if (config.globalValues && fullKey in config.globalValues) {
      return config.globalValues[fullKey] as T;
    }
    if (key in config.values) {
      return config.values[key] as T;
    }
    return defaultValue as T;
  }

  inspect<T>(key: string): {
    workspaceValue?: T;
    globalValue?: T;
  } | undefined {
    const workspaceKey = config.workspaceValues
      ? (config.workspaceValues[key] as T | undefined)
      : undefined;
    const globalKey = config.globalValues
      ? (config.globalValues[key] as T | undefined)
      : undefined;

    if (workspaceKey === undefined && globalKey === undefined) {
      return { workspaceValue: this.get(key) as T };
    }

    return { workspaceValue: workspaceKey, globalValue: globalKey };
  }
}

class MockOutputChannel {
  public lines: string[] = [];

  constructor(private name: string) {
    outputChannels.set(name, this);
  }

  appendLine(value: string): void {
    this.lines.push(value);
  }

  show(): void {
    // no-op
  }

  dispose(): void {
    outputChannels.delete(this.name);
  }
}

class MockFileSystemWatcher {
  dispose(): void {
    // no-op
  }

  onDidChange(_listener: () => void): this {
    return this;
  }

  onDidCreate(_listener: () => void): this {
    return this;
  }

  onDidDelete(_listener: () => void): this {
    return this;
  }
}

export const vscodeMock = {
  workspace: {
    get workspaceFolders() {
      return workspaceFolders.length > 0 ? workspaceFolders : undefined;
    },
    getConfiguration(section: string) {
      const sectionConfig = new MockConfigurationSection(section);

      return new Proxy(sectionConfig, {
        get(target, prop: string) {
          if (prop in target) {
            return (target as any)[prop];
          }
          return (target as any).get(prop);
        }
      });
    },
    async openTextDocument(_path: string) {
      return { uri: { fsPath: _path } };
    },
    createFileSystemWatcher(_pattern: unknown) {
      return new MockFileSystemWatcher();
    },
    asRelativePath(resource: { fsPath?: string }, _includeWorkspaceFolder?: boolean): string {
      const fsPath = resource.fsPath ?? '';
      for (const folder of workspaceFolders) {
        const root = folder.uri.fsPath;
        if (fsPath === root || fsPath.startsWith(root + path.sep)) {
          return path.relative(root, fsPath);
        }
      }
      return fsPath;
    }
  },
  window: {
    get activeTextEditor() {
      return activeEditor;
    },
    get activeTerminal() {
      return activeTerminal;
    },
    showErrorMessage(_message: string, ..._items: string[]) {
      return Promise.resolve(undefined);
    },
    showWarningMessage(_message: string, ..._items: string[]) {
      return Promise.resolve(undefined);
    },
    showInformationMessage(_message: string, ..._items: string[]) {
      return Promise.resolve(undefined);
    },
    showQuickPick<T>(_items: T[]) {
      return Promise.resolve(undefined);
    },
    async showTextDocument(_doc: unknown) {
      return undefined;
    },
    createOutputChannel(name: string) {
      return new MockOutputChannel(name);
    }
  },
  env: {
    clipboard: {
      async writeText(text: string) {
        clipboardText = text;
      },
      async readText() {
        return clipboardText;
      }
    }
  },
  Uri: {
    file(fsPath: string) {
      return { fsPath, scheme: 'file' };
    }
  },
  ViewColumn: {
    Active: 1
  },
  Range: class MockRange {
    constructor(
      public startLine: number,
      public startCharacter: number,
      public endLine: number,
      public endCharacter: number
    ) {}
  },
  RelativePattern: class MockRelativePattern {
    constructor(public base: string, public pattern: string) {}
  },
  commands: {
    registerCommand(_id: string, _handler: (...args: unknown[]) => unknown) {
      return { dispose: () => undefined };
    }
  },
  ExtensionContext: class {}
};
