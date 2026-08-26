import * as assert from 'assert';
import {
  getTicketWordAt,
  getTicketWordAtCursor,
  resolveEditorForTicket,
  resetTicketEditorTrackingForTests,
  setLastKnownFileEditorForTests,
  coerceResourceUri
} from '../out/ticketAtCursor';
import { createMockDocument, createMockEditor, resetVscodeMock } from './helpers/vscodeMock';

describe('ticketAtCursor', () => {
  beforeEach(() => {
    resetTicketEditorTrackingForTests();
  });

  describe('getTicketWordAt', () => {
    it('extracts a GitHub-style issue reference', () => {
      const document = createMockDocument(['See issue #456 for details']);
      const word = getTicketWordAt(document as any, { line: 0, character: 11 } as any);
      assert.strictEqual(word, '#456');
    });

    it('extracts a Jira-style ticket id', () => {
      const document = createMockDocument(['Fix PROJ-1234 before release']);
      const word = getTicketWordAt(document as any, { line: 0, character: 8 } as any);
      assert.strictEqual(word, 'PROJ-1234');
    });

    it('extracts a numeric branch-style token', () => {
      const document = createMockDocument(['branch name: 123-foo']);
      const word = getTicketWordAt(document as any, { line: 0, character: 16 } as any);
      assert.strictEqual(word, '123-foo');
    });

    it('returns null when the cursor is on punctuation', () => {
      const document = createMockDocument(['!!!']);
      const word = getTicketWordAt(document as any, { line: 0, character: 1 } as any);
      assert.strictEqual(word, null);
    });
  });

  describe('resolveEditorForTicket', () => {
    it('uses activeTextEditor when available', () => {
      const document = createMockDocument(['Fix PROJ-1234'], '/workspace/project/src/file.ts');
      const editor = createMockEditor(document, 0, 8);
      resetVscodeMock({ activeEditor: editor, visibleEditors: [editor] });

      const resolved = resolveEditorForTicket({ fsPath: document.uri.fsPath } as any);
      assert.strictEqual(resolved, editor);
    });

    it('falls back to a visible editor matching the resource URI', () => {
      const document = createMockDocument(['Fix PROJ-1234'], '/workspace/project/src/file.ts');
      const editor = createMockEditor(document, 0, 8);
      resetVscodeMock({ activeEditor: undefined, visibleEditors: [editor] });

      const resolved = resolveEditorForTicket({ fsPath: document.uri.fsPath } as any);
      assert.strictEqual(resolved, editor);
    });

    it('prefers the resource editor over a different activeTextEditor (Cursor context menu)', () => {
      const fileDocument = createMockDocument(['Fix PROJ-1234'], '/workspace/project/src/file.ts');
      const fileEditor = createMockEditor(fileDocument, 0, 8);
      const chatDocument = createMockDocument(['Ask anything'], '/cursor/chat/input');
      chatDocument.uri.scheme = 'cursor-chat';
      const chatEditor = createMockEditor(chatDocument, 0, 0);

      resetVscodeMock({
        activeEditor: chatEditor,
        visibleEditors: [fileEditor, chatEditor]
      });

      const resolved = resolveEditorForTicket({ fsPath: fileDocument.uri.fsPath } as any);
      assert.strictEqual(resolved, fileEditor);
    });

    it('uses last known file editor when chat holds focus (Cursor keyboard shortcut)', () => {
      const fileDocument = createMockDocument(['Fix PROJ-1234'], '/workspace/project/src/file.ts');
      const fileEditor = createMockEditor(fileDocument, 0, 8);
      const chatDocument = createMockDocument(['Ask anything'], '/cursor/chat/input');
      chatDocument.uri.scheme = 'cursor-chat';
      const chatEditor = createMockEditor(chatDocument, 0, 0);

      resetVscodeMock({
        activeEditor: chatEditor,
        visibleEditors: [fileEditor, chatEditor]
      });
      setLastKnownFileEditorForTests(fileEditor as any);

      const resolved = resolveEditorForTicket(undefined);
      assert.strictEqual(resolved, fileEditor);
    });
  });

  describe('coerceResourceUri', () => {
    it('accepts string paths', () => {
      const uri = coerceResourceUri('/workspace/project/src/file.ts');
      assert.strictEqual(uri?.fsPath, '/workspace/project/src/file.ts');
    });
  });

  describe('getTicketWordAtCursor', () => {
    it('reads the ticket from a visible editor when activeTextEditor is unset', () => {
      const document = createMockDocument(['Fix PROJ-1234 before release'], '/workspace/project/src/file.ts');
      const editor = createMockEditor(document, 0, 8);
      resetVscodeMock({ activeEditor: undefined, visibleEditors: [editor] });

      const word = getTicketWordAtCursor(undefined, { fsPath: document.uri.fsPath } as any);
      assert.strictEqual(word, 'PROJ-1234');
    });
  });
});
