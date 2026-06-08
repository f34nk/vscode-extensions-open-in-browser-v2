"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Module = require("module");
const vscodeMock_1 = require("./vscodeMock");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'vscode') {
        return vscodeMock_1.vscodeMock;
    }
    return originalLoad(request, parent, isMain);
};
//# sourceMappingURL=setup.js.map