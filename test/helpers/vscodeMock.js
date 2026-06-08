"use strict";
/**
 * Minimal vscode API mock for unit tests.
 * Configure via resetVscodeMock() before each test suite.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.vscodeMock = void 0;
exports.resetVscodeMock = resetVscodeMock;
exports.getClipboardText = getClipboardText;
exports.createMockDocument = createMockDocument;
exports.createMockEditor = createMockEditor;
let config = { values: {} };
let activeEditor;
let workspaceFolders = [];
let activeTerminal;
let clipboardText = '';
const outputChannels = new Map();
function resetVscodeMock(options) {
    var _a, _b;
    config = (_a = options === null || options === void 0 ? void 0 : options.config) !== null && _a !== void 0 ? _a : { values: {} };
    activeEditor = options === null || options === void 0 ? void 0 : options.activeEditor;
    workspaceFolders = (_b = options === null || options === void 0 ? void 0 : options.workspaceFolders) !== null && _b !== void 0 ? _b : [];
    activeTerminal = options === null || options === void 0 ? void 0 : options.activeTerminal;
    clipboardText = '';
    outputChannels.clear();
}
function getClipboardText() {
    return clipboardText;
}
function createMockDocument(lines, fsPath = '/workspace/project/src/file.ts') {
    return {
        uri: { fsPath, scheme: 'file' },
        lineAt: (line) => { var _a; return ({ text: (_a = lines[line]) !== null && _a !== void 0 ? _a : '' }); }
    };
}
function createMockEditor(document, line, character, selectionEnd) {
    const end = selectionEnd !== null && selectionEnd !== void 0 ? selectionEnd : { line, character };
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
    constructor(section) {
        this.section = section;
    }
    get(key, defaultValue) {
        const fullKey = `${this.section}.${key}`;
        if (config.workspaceValues && fullKey in config.workspaceValues) {
            return config.workspaceValues[fullKey];
        }
        if (config.globalValues && fullKey in config.globalValues) {
            return config.globalValues[fullKey];
        }
        if (key in config.values) {
            return config.values[key];
        }
        return defaultValue;
    }
    inspect(key) {
        const workspaceKey = config.workspaceValues
            ? config.workspaceValues[key]
            : undefined;
        const globalKey = config.globalValues
            ? config.globalValues[key]
            : undefined;
        if (workspaceKey === undefined && globalKey === undefined) {
            return { workspaceValue: this.get(key) };
        }
        return { workspaceValue: workspaceKey, globalValue: globalKey };
    }
}
class MockOutputChannel {
    constructor(name) {
        this.name = name;
        this.lines = [];
        outputChannels.set(name, this);
    }
    appendLine(value) {
        this.lines.push(value);
    }
    show() {
        // no-op
    }
    dispose() {
        outputChannels.delete(this.name);
    }
}
class MockFileSystemWatcher {
    dispose() {
        // no-op
    }
    onDidChange(_listener) {
        return this;
    }
    onDidCreate(_listener) {
        return this;
    }
    onDidDelete(_listener) {
        return this;
    }
}
exports.vscodeMock = {
    workspace: {
        get workspaceFolders() {
            return workspaceFolders.length > 0 ? workspaceFolders : undefined;
        },
        getConfiguration(section) {
            const sectionConfig = new MockConfigurationSection(section);
            return new Proxy(sectionConfig, {
                get(target, prop) {
                    if (prop in target) {
                        return target[prop];
                    }
                    return target.get(prop);
                }
            });
        },
        async openTextDocument(_path) {
            return { uri: { fsPath: _path } };
        },
        createFileSystemWatcher(_pattern) {
            return new MockFileSystemWatcher();
        }
    },
    window: {
        get activeTextEditor() {
            return activeEditor;
        },
        get activeTerminal() {
            return activeTerminal;
        },
        showErrorMessage(_message, ..._items) {
            return Promise.resolve(undefined);
        },
        showWarningMessage(_message, ..._items) {
            return Promise.resolve(undefined);
        },
        showInformationMessage(_message, ..._items) {
            return Promise.resolve(undefined);
        },
        showQuickPick(_items) {
            return Promise.resolve(undefined);
        },
        async showTextDocument(_doc) {
            return undefined;
        },
        createOutputChannel(name) {
            return new MockOutputChannel(name);
        }
    },
    env: {
        clipboard: {
            async writeText(text) {
                clipboardText = text;
            },
            async readText() {
                return clipboardText;
            }
        }
    },
    Uri: {
        file(fsPath) {
            return { fsPath, scheme: 'file' };
        }
    },
    ViewColumn: {
        Active: 1
    },
    Range: class MockRange {
        constructor(startLine, startCharacter, endLine, endCharacter) {
            this.startLine = startLine;
            this.startCharacter = startCharacter;
            this.endLine = endLine;
            this.endCharacter = endCharacter;
        }
    },
    RelativePattern: class MockRelativePattern {
        constructor(base, pattern) {
            this.base = base;
            this.pattern = pattern;
        }
    },
    commands: {
        registerCommand(_id, _handler) {
            return { dispose: () => undefined };
        }
    },
    ExtensionContext: class {
    }
};
//# sourceMappingURL=vscodeMock.js.map