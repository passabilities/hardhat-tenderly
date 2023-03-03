"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TdlyContract = void 0;
class TdlyContract {
    constructor(nativeContract, tenderly, contractName, libs) {
        this.contractName = contractName;
        this.nativeContract = nativeContract;
        this.tenderly = tenderly;
        this.libraries = libs;
        Object.keys(nativeContract).forEach((key) => {
            if (this[key] !== undefined) {
                return;
            }
            if (key === "deployTransaction") {
                const wait = nativeContract[key].wait;
                nativeContract[key].wait = async (confirmations) => {
                    const receipt = await wait(confirmations);
                    await this._tdlyVerify(receipt.contractAddress);
                    return receipt;
                };
            }
            this[key] = nativeContract[key];
        });
    }
    async deployed() {
        const contract = await this.nativeContract.deployed();
        if (this.nativeContract.deployTransaction === undefined || this.nativeContract.deployTransaction === null) {
            await this._tdlyVerify(contract.address);
        }
        return contract;
    }
    async _tdlyVerify(address) {
        const contPair = {
            name: this.contractName,
            address,
        };
        if (this.libraries !== undefined && this.libraries !== null) {
            contPair.libraries = this.libraries;
        }
        await this.tenderly.persistArtifacts(contPair);
        await this.tenderly.verify(contPair);
    }
}
exports.TdlyContract = TdlyContract;
//# sourceMappingURL=Contract.js.map