"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const tslog_1 = require("tslog");
exports.logger = new tslog_1.Logger({
    prettyLogTemplate: "{{dateIsoStr}} {{logLevelName}} {{name}} =>",
    name: "Hardhat",
});
//# sourceMappingURL=logger.js.map