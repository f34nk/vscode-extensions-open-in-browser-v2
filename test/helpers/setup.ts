import Module from 'module';
import { vscodeMock } from './vscodeMock';

const originalRequire = Module.prototype.require;

Module.prototype.require = function (id: string) {
  if (id === 'vscode') {
    return vscodeMock;
  }
  return originalRequire.apply(this, arguments as any);
};
