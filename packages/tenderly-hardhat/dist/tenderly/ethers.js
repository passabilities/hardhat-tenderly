"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapEthers = void 0;
const ContractFactory_1 = require("./ethers/ContractFactory");
function wrapEthers(nativeEthers, tenderly) {
    // Factory
    nativeEthers.getContractFactoryFromArtifact = wrapGetContractFactoryFromArtifact(nativeEthers.getContractFactoryFromArtifact, tenderly);
    nativeEthers.getContractFactory = wrapGetContractFactory(nativeEthers.getContractFactory, tenderly);
    // Contract
    nativeEthers.getContractAtFromArtifact = wrapGetContractAtFromArtifact(nativeEthers.getContractAtFromArtifact, tenderly);
    nativeEthers.getContractAt = wrapGetContractAt(nativeEthers.getContractAt, tenderly);
    return nativeEthers;
}
exports.wrapEthers = wrapEthers;
function wrapGetContractFactory(func, tenderly) {
    return async function (nameOrAbi, bytecodeOrFactoryOptions, signer) {
        if (typeof nameOrAbi === "string") {
            const contractFactory = await func(nameOrAbi, bytecodeOrFactoryOptions);
            let libs;
            const factoryOpts = bytecodeOrFactoryOptions;
            if (factoryOpts !== undefined && "libraries" in factoryOpts) {
                libs = factoryOpts.libraries;
            }
            return wrapContractFactory(contractFactory, tenderly, nameOrAbi, libs);
        }
        return func(nameOrAbi, bytecodeOrFactoryOptions, signer);
    };
}
function wrapGetContractAt(func, tenderly) {
    return async function (nameOrAbi, address, signer) {
        if (typeof nameOrAbi === "string") {
            const contract = await func(nameOrAbi, address, signer);
            await tryToVerify(tenderly, nameOrAbi, contract);
            return contract;
        }
        return func(nameOrAbi, address, signer);
    };
}
function wrapGetContractFactoryFromArtifact(func, tenderly) {
    return async function (artifact, signerOrOptions) {
        const contractFactory = await func(artifact, signerOrOptions);
        let libs;
        const factoryOpts = signerOrOptions;
        if (factoryOpts !== undefined && "libraries" in factoryOpts) {
            libs = factoryOpts.libraries;
        }
        return wrapContractFactory(contractFactory, tenderly, artifact.contractName, libs);
    };
}
function wrapGetContractAtFromArtifact(func, tenderly) {
    return async function (artifact, address, signer) {
        const contract = await func(artifact, address, signer);
        await tryToVerify(tenderly, artifact.contractName, contract);
        return contract;
    };
}
function wrapContractFactory(contractFactory, tenderly, name, libraries) {
    contractFactory = new ContractFactory_1.TdlyContractFactory(contractFactory, tenderly, name, libraries);
    return contractFactory;
}
async function tryToVerify(tenderly, name, contract) {
    await tenderly.verify({
        name,
        address: contract.address,
    });
}
//# sourceMappingURL=ethers.js.map