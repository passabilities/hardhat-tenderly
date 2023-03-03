"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classFunctions = exports.extractCompilerVersion = exports.newCompilerConfig = exports.compareConfigs = exports.resolveDependencies = exports.getContracts = exports.getCompilerDataFromContracts = exports.getCompilationJob = exports.makeVerifyContractsRequest = void 0;
const plugins_1 = require("hardhat/plugins");
const constants_1 = require("tenderly/common/constants");
const task_names_1 = require("hardhat/builtin-tasks/task-names");
const constants_2 = require("../constants");
const errors_1 = require("../tenderly/errors");
const logger_1 = require("./logger");
const makeVerifyContractsRequest = async (hre, flatContracts, forkId) => {
    logger_1.logger.info("Processing data needed for verification.");
    const contracts = [];
    for (const flatContract of flatContracts) {
        logger_1.logger.info("Processing contract:", flatContract.name);
        let job;
        try {
            job = await (0, exports.getCompilationJob)(hre, flatContract.name);
        }
        catch (err) {
            // TODO(dusan): See how to wrap errors, don't return errors like this
            logger_1.logger.error(`Error while trying to get compilation job for contract '${flatContract.name}'. The provided contract name probably doesn't exist or is mistyped.`);
            throw err;
        }
        const network = hre.hardhatArguments.network;
        if (network === undefined) {
            logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Please provide a network via the hardhat --network argument or directly in the contract`);
            return null;
        }
        logger_1.logger.trace("Found network is:", network);
        let chainId = constants_1.NETWORK_NAME_CHAIN_ID_MAP[network.toLowerCase()];
        if (hre.config.networks[network].chainId !== undefined) {
            chainId = hre.config.networks[network].chainId.toString();
        }
        if (chainId === undefined && network === "tenderly" && forkId !== undefined) {
            chainId = forkId;
        }
        logger_1.logger.trace(`ChainId for network '${network}' is ${chainId}`);
        if (chainId === undefined) {
            logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Couldn't identify network. Please provide a chainId in the network config object`);
            return null;
        }
        const compiler = await insertLibraries(hre, job.getSolcConfig(), flatContract.libraries);
        contracts.push({
            contractToVerify: flatContract.name,
            // TODO(dusan) this can be done with TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT hardhat task
            sources: await extractSources(hre, flatContract.name, job),
            compiler: await repackLibraries(compiler),
            networks: {
                [chainId]: {
                    address: flatContract.address,
                    links: flatContract.libraries,
                },
            },
        });
    }
    // TODO(dusan) see about merging compilation jobs?
    return {
        contracts,
    };
};
exports.makeVerifyContractsRequest = makeVerifyContractsRequest;
async function extractSources(hre, contractToVerify, job) {
    const sources = {};
    logger_1.logger.info("Extracting sources from compilation job.");
    const mainArtifact = hre.artifacts.readArtifactSync(contractToVerify);
    for (const file of job.getResolvedFiles()) {
        let contractName = constants_2.CONTRACT_NAME_PLACEHOLDER;
        // Only the contract to verify should have its name extracted since we need to attach a network to it.
        // Other names aren't important since they are only needed for compilation purposes.
        if (mainArtifact.sourceName === file.sourceName) {
            contractName = mainArtifact.contractName;
        }
        sources[file.sourceName] = {
            name: contractName,
            code: file.content.rawContent,
        };
    }
    return sources;
}
async function insertLibraries(hre, compiler, libraries) {
    if (libraries === undefined || libraries === null) {
        return compiler;
    }
    if (compiler.settings.libraries !== undefined && compiler.settings.libraries !== null) {
        throw new Error(`There are multiple definitions of libraries the contract should use. One is defined in the verify request and the other as an compiler config override. Please remove one of them.`);
    }
    compiler.settings.libraries = {};
    for (const [libName, libAddress] of Object.entries(libraries)) {
        const libArtifact = hre.artifacts.readArtifactSync(libName);
        if (compiler.settings.libraries[libArtifact.sourceName] === undefined) {
            compiler.settings.libraries[libArtifact.sourceName] = {};
        }
        compiler.settings.libraries[libArtifact.sourceName][libName] = libAddress;
    }
    return compiler;
}
/*
The only difference between SolcConfig and TenderlySolcConfig is in the settings.libraries object.

SolcConfig.settings.libraries is in the format of:
compiler.settings.libraries = {
  "contracts/path/Token.sol": {
    "contracts/library-path/Library.sol": "0x...."
  }
}

TenderlySolcConfig.settings.libraries is in the format of:
compiler.settings.libraries = {
  "contracts/path/Token.sol": {
    addresses: {
      "contracts/library-path/Library.sol": "0x...."
    }
  }
}

The reason for this are the definition limitations of proto messages.
Proto doesn't allow for a map to have a map as a value like map<string, map<string, string>>.
So we have to wrap the inner map in an object like map<string, Libraries> where Libraries is a message with a map<string, string> field.
*/
async function repackLibraries(compiler) {
    if (!compiler?.settings?.libraries) {
        return compiler;
    }
    const libraries = {};
    for (const [fileName, libVal] of Object.entries(compiler.settings.libraries)) {
        if (libraries[fileName] === undefined) {
            libraries[fileName] = { addresses: {} };
        }
        for (const [libName, libAddress] of Object.entries(libVal)) {
            libraries[fileName].addresses[libName] = libAddress;
        }
    }
    compiler.settings.libraries = libraries;
    return compiler;
}
const getCompilationJob = async (hre, contractName) => {
    logger_1.logger.trace("Getting compilation job for contract:", contractName);
    const dependencyGraph = await getDependencyGraph(hre);
    const artifact = hre.artifacts.readArtifactSync(contractName);
    const file = dependencyGraph.getResolvedFiles().find((resolvedFile) => {
        return resolvedFile.sourceName === artifact.sourceName;
    });
    return hre.run(task_names_1.TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE, {
        dependencyGraph,
        file,
    });
};
exports.getCompilationJob = getCompilationJob;
async function getDependencyGraph(hre) {
    const sourcePaths = await hre.run(task_names_1.TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS);
    const sourceNames = await hre.run(task_names_1.TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES, {
        sourcePaths,
    });
    return hre.run(task_names_1.TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH, {
        sourceNames,
    });
}
const getCompilerDataFromContracts = (contracts, flatContracts, hhConfig) => {
    logger_1.logger.debug("Obtaining compiler data from contracts.");
    let contract;
    let mainContract;
    let config;
    for (contract of contracts) {
        for (mainContract of flatContracts) {
            if (mainContract.name !== contract.contractName) {
                continue;
            }
            logger_1.logger.trace("Obtaining compiler data from contract:", mainContract.name);
            const contractConfig = (0, exports.newCompilerConfig)(hhConfig, contract.sourcePath, contract.compiler?.version);
            if (config !== null && config !== undefined && !(0, exports.compareConfigs)(contractConfig, config)) {
                logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Different compiler versions provided in same request`);
                throw new Error("Compiler version mismatch");
            }
            else {
                config = contractConfig;
            }
        }
    }
    logger_1.logger.debug("Compiler data has been obtained.");
    logger_1.logger.silly("Obtained compiler configuration is:", config);
    return config;
};
exports.getCompilerDataFromContracts = getCompilerDataFromContracts;
const getContracts = async (hre, flatContracts) => {
    logger_1.logger.debug("Processing contracts from the artifacts/ directory.");
    const sourcePaths = await hre.run("compile:solidity:get-source-paths");
    const sourceNames = await hre.run("compile:solidity:get-source-names", {
        sourcePaths,
    });
    const data = await hre.run("compile:solidity:get-dependency-graph", {
        sourceNames,
    });
    if (data.length === 0) {
        throw new plugins_1.HardhatPluginError(constants_2.PLUGIN_NAME, errors_1.CONTRACTS_NOT_DETECTED);
    }
    let contract;
    const requestContracts = [];
    const metadata = {
        defaultCompiler: {
            version: (0, exports.extractCompilerVersion)(hre.config),
        },
        sources: {},
    };
    logger_1.logger.trace("Extracted compiler version is:", metadata.defaultCompiler.version);
    data._resolvedFiles.forEach((resolvedFile, _) => {
        const sourcePath = resolvedFile.sourceName;
        logger_1.logger.trace("Processing file:", sourcePath);
        const name = sourcePath.split("/").slice(-1)[0].split(".")[0];
        logger_1.logger.trace("Obtained name from source file:", name);
        for (contract of flatContracts) {
            if (contract.name !== name) {
                continue;
            }
            logger_1.logger.trace("Found contract:", contract.name);
            metadata.sources[sourcePath] = {
                content: resolvedFile.content.rawContent,
                versionPragma: resolvedFile.content.versionPragmas[0],
            };
            if (metadata.sources[sourcePath].content === undefined ||
                metadata.sources[sourcePath].content === null ||
                metadata.sources[sourcePath].content === "") {
                logger_1.logger.error("Metadata source content is empty!");
            }
            if (metadata.sources[sourcePath].versionPragma === undefined ||
                metadata.sources[sourcePath].versionPragma === null ||
                metadata.sources[sourcePath].versionPragma === "") {
                logger_1.logger.error("Metadata source version pragma is empty!");
            }
            const visited = {};
            (0, exports.resolveDependencies)(data, sourcePath, metadata, visited);
        }
    });
    for (const [key, value] of Object.entries(metadata.sources)) {
        const name = key.split("/").slice(-1)[0].split(".")[0];
        const contractToPush = {
            contractName: name,
            source: value.content,
            sourcePath: key,
            networks: {},
            compiler: {
                name: "solc",
                version: (0, exports.extractCompilerVersion)(hre.config, key, value.versionPragma),
            },
        };
        requestContracts.push(contractToPush);
    }
    logger_1.logger.silly("Finished processing contracts from the artifacts/ folder:", requestContracts);
    logger_1.logger.silly("Finished processing contracts from the artifacts/ folder:", requestContracts);
    return requestContracts;
};
exports.getContracts = getContracts;
const resolveDependencies = (dependencyData, sourcePath, metadata, visited) => {
    if (visited[sourcePath]) {
        return;
    }
    visited[sourcePath] = true;
    dependencyData._dependenciesPerFile.get(sourcePath).forEach((resolvedDependency, _) => {
        (0, exports.resolveDependencies)(dependencyData, resolvedDependency.sourceName, metadata, visited);
        metadata.sources[resolvedDependency.sourceName] = {
            content: resolvedDependency.content.rawContent,
            versionPragma: resolvedDependency.content.versionPragmas[0],
        };
    });
};
exports.resolveDependencies = resolveDependencies;
const compareConfigs = (originalConfig, newConfig) => {
    if (originalConfig.compiler_version !== newConfig.compiler_version) {
        return false;
    }
    if (originalConfig.optimizations_used !== newConfig.optimizations_used) {
        return false;
    }
    if (originalConfig.optimizations_count !== newConfig.optimizations_count) {
        return false;
    }
    if (originalConfig.evm_version !== newConfig.evm_version) {
        return false;
    }
    return true;
};
exports.compareConfigs = compareConfigs;
const newCompilerConfig = (config, sourcePath, contractCompiler) => {
    if (sourcePath !== undefined && config.solidity.overrides[sourcePath] !== undefined) {
        logger_1.logger.trace("There is a compiler config override for:", sourcePath);
        return {
            compiler_version: config.solidity.overrides[sourcePath].version,
            optimizations_used: config.solidity.overrides[sourcePath].settings.optimizer.enabled,
            optimizations_count: config.solidity.overrides[sourcePath].settings.optimizer.runs,
            evm_version: config.solidity.overrides[sourcePath].settings.evmVersion,
            debug: config.solidity.overrides[sourcePath].settings.debug,
        };
    }
    if (contractCompiler !== undefined) {
        logger_1.logger.trace("There is a provided compiler configuration, determining it.");
        return determineCompilerConfig(config.solidity.compilers, contractCompiler);
    }
    logger_1.logger.trace("Returning the first compiler in the configuration");
    return {
        compiler_version: config.solidity.compilers[0].version,
        optimizations_used: config.solidity.compilers[0].settings.optimizer.enabled,
        optimizations_count: config.solidity.compilers[0].settings.optimizer.runs,
        evm_version: config.solidity.compilers[0].settings.evmVersion,
        debug: config.solidity.compilers[0].settings.debug,
    };
};
exports.newCompilerConfig = newCompilerConfig;
const extractCompilerVersion = (config, sourcePath, versionPragma) => {
    if (sourcePath !== undefined && config.solidity.overrides[sourcePath] !== undefined) {
        return config.solidity.overrides[sourcePath].version;
    }
    if (versionPragma !== undefined) {
        for (const compiler of config.solidity.compilers) {
            if (compareVersions(compiler.version, versionPragma)) {
                return compiler.version;
            }
        }
    }
    return config.solidity.compilers[0].version;
};
exports.extractCompilerVersion = extractCompilerVersion;
const determineCompilerConfig = (compilers, contractCompiler) => {
    for (const compiler of compilers) {
        if (compareVersions(compiler.version, contractCompiler)) {
            logger_1.logger.trace("Provided compiler matched the version: ", compiler.version);
            return {
                compiler_version: compiler.version,
                optimizations_used: compiler.settings.optimizer.enabled,
                optimizations_count: compiler.settings.optimizer.runs,
                evm_version: compiler.settings.evmVersion,
                debug: compiler.settings.debug,
            };
        }
    }
    logger_1.logger.trace("Couldn't find the provided compiler among compilers in the configuration, returning the configuration of the first one");
    return {
        compiler_version: compilers[0].version,
        optimizations_used: compilers[0].settings.optimizer.enabled,
        optimizations_count: compilers[0].settings.optimizer.runs,
        evm_version: compilers[0].settings.evmVersion,
        debug: compilers[0].settings.debug,
    };
};
const compareVersions = (compilerVersion, contractVersionPragma) => {
    switch (contractVersionPragma[0]) {
        case "^":
            return checkGTEVersion(compilerVersion, contractVersionPragma.slice(1));
        case ">":
            if (contractVersionPragma.length === 6) {
                return checkGTVersion(compilerVersion, contractVersionPragma.slice(1));
            }
            if (contractVersionPragma.length === 7) {
                return checkGTEVersion(compilerVersion, contractVersionPragma.slice(2));
            }
            if (contractVersionPragma.length > 8) {
                const [gt, lt] = contractVersionPragma.split(" ");
                let isGT = false;
                let isLT = false;
                if (gt.length === 6) {
                    isGT = checkGTVersion(compilerVersion, gt.slice(1));
                }
                if (gt.length === 7) {
                    isGT = checkGTEVersion(compilerVersion, gt.slice(2));
                }
                if (lt.length === 6) {
                    isLT = !checkGTEVersion(compilerVersion, lt.slice(1));
                }
                if (lt.length === 7) {
                    isLT = !checkGTVersion(compilerVersion, lt.slice(2));
                }
                return isGT && isLT;
            }
            break;
        default:
            return checkGTEVersion(compilerVersion, contractVersionPragma);
    }
    return false;
};
const checkGTEVersion = (compilerVersion, contractVersionPragma) => {
    const compilerVersionSplit = compilerVersion.split(".");
    const contractVersionSplit = contractVersionPragma.split(".");
    for (let i = 0; i < compilerVersionSplit.length; i++) {
        if (compilerVersionSplit[i] > contractVersionSplit[i]) {
            break;
        }
        if (compilerVersionSplit[i] < contractVersionSplit[i]) {
            return false;
        }
    }
    return true;
};
const checkGTVersion = (compilerVersion, contractVersionPragma) => {
    const compilerVersionSplit = compilerVersion.split(".");
    const contractVersionSplit = contractVersionPragma.split(".");
    for (let i = 0; i < compilerVersionSplit.length; i++) {
        if (compilerVersionSplit[i] > contractVersionSplit[i]) {
            break;
        }
        if (compilerVersionSplit[i] <= contractVersionSplit[i]) {
            return false;
        }
    }
    return true;
};
// ------------------------------------------------------------------------------------
const isGetter = (x, name) => (Object.getOwnPropertyDescriptor(x, name) !== null || {}).get;
const isFunction = (x, name) => typeof x[name] === "function";
const deepFunctions = (x) => {
    if (x && x !== Object.prototype) {
        return Object.getOwnPropertyNames(x)
            .filter((name) => isGetter(x, name) !== null || isFunction(x, name))
            .concat(deepFunctions(Object.getPrototypeOf(x)) ?? []);
    }
    return [];
};
const distinctDeepFunctions = (x) => Array.from(new Set(deepFunctions(x)));
const classFunctions = (x) => distinctDeepFunctions(x).filter((name) => name !== "constructor" && name.indexOf("__") === -1);
exports.classFunctions = classFunctions;
//# sourceMappingURL=util.js.map