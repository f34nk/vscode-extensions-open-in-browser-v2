import * as Module from 'module';
import { vscodeMock } from './vscodeMock';

const originalLoad = (Module as any)._load;

(Module as any)._load = function (request: string, parent: NodeModule, isMain: boolean) {
  if (request === 'vscode') {
    return vscodeMock;
  }
  return originalLoad(request, parent, isMain);
};
