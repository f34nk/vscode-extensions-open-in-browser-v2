import Module from 'module';
import { setOpenUrlForTests } from '../../out/testHooks';
import { vscodeMock } from './vscodeMock';

const originalRequire = Module.prototype.require;

Module.prototype.require = function (id: string) {
  if (id === 'vscode') {
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments as any);
};

setOpenUrlForTests(() => {
  // Prevent tests from launching a real browser or editor.
});
