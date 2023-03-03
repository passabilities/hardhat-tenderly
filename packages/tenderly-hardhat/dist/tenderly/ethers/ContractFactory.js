"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TdlyContractFactory = void 0;
const util_1 = require("../../utils/util");
const Contract_1 = require("./Contract");
class TdlyContractFactory {
    constructor(nativeContractFactory, tenderly, contractName, libs) {
        this.nativeContractFactory = nativeContractFactory;
        this.tenderly = tenderly;
        this.contractName = contractName;
        this.libs = libs;
        for (const attribute in Object.assign(nativeContractFactory)) {
            if (this[attribute] !== undefined) {
                continue;
            }
            this[attribute] = nativeContractFactory[attribute];
        }
        (0, util_1.classFunctions)(nativeContractFactory).forEach((funcName) => {
            if (this[funcName] !== undefined) {
                return;
            }
            this[funcName] = nativeContractFactory[funcName];
        });
    }
    async deploy(...args) {
        const contract = await this.nativeContractFactory.deploy(...args);
        return new Contract_1.TdlyContract(contract, this.tenderly, this.contractName, this.libs);
    }
    connect(signer) {
        const contractFactory = this.nativeContractFactory.connect(signer);
        return new TdlyContractFactory(contractFactory, this.tenderly, this.contractName, this.libs);
    }
}
exports.TdlyContractFactory = TdlyContractFactory;
//# sourceMappingURL=ContractFactory.js.map