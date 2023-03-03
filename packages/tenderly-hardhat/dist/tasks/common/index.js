"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractContractData = void 0;
const plugins_1 = require("hardhat/plugins");
const constants_1 = require("tenderly/common/constants");
const logger_1 = require("../../utils/logger");
const constants_2 = require("../../constants");
const errors_1 = require("../../tenderly/errors");
const util_1 = require("../../utils/util");
async function extractContractData(contracts, network, config, run) {
    logger_1.logger.info("Extracting contract data.");
    let contract;
    const requestContracts = [];
    const sourcePaths = await run("compile:solidity:get-source-paths");
    const sourceNames = await run("compile:solidity:get-source-names", {
        sourcePaths,
    });
    const data = await run("compile:solidity:get-dependency-graph", {
        sourceNames,
    });
    if (data.length === 0) {
        throw new plugins_1.HardhatPluginError(constants_2.PLUGIN_NAME, errors_1.CONTRACTS_NOT_DETECTED);
    }
    const metadata = {
        defaultCompiler: {
            version: (0, util_1.extractCompilerVersion)(config),
        },
        sources: {},
    };
    data._resolvedFiles.forEach((resolvedFile, _) => {
        for (contract of contracts) {
            const contractData = contract.split("=");
            if (contractData.length < 2) {
                throw new plugins_1.HardhatPluginError(constants_2.PLUGIN_NAME, `Invalid contract provided`);
            }
            if (network === undefined) {
                throw new plugins_1.HardhatPluginError(constants_2.PLUGIN_NAME, `No network provided`);
            }
            const sourcePath = resolvedFile.sourceName;
            const name = sourcePath.split("/").slice(-1)[0].split(".")[0];
            if (name !== contractData[0]) {
                continue;
            }
            metadata.sources[sourcePath] = {
                content: resolvedFile.content.rawContent,
                versionPragma: resolvedFile.content.versionPragmas[0],
            };
            const visited = {};
            (0, util_1.resolveDependencies)(data, sourcePath, metadata, visited);
        }
    });
    for (const [key, value] of Object.entries(metadata.sources)) {
        const name = key.split("/").slice(-1)[0].split(".")[0];
        logger_1.logger.trace("Currently processing contract:", name);
        const contractToPush = {
            contractName: name,
            source: value.content,
            sourcePath: key,
            networks: {},
            compiler: {
                name: "solc",
                version: (0, util_1.extractCompilerVersion)(config, key, value.versionPragma),
            },
        };
        for (contract of contracts) {
            const contractData = contract.split("=");
            if (contractToPush.contractName === contractData[0]) {
                let chainID = constants_1.NETWORK_NAME_CHAIN_ID_MAP[network.toLowerCase()];
                if (config.networks[network].chainId !== undefined) {
                    chainID = config.networks[network].chainId.toString();
                }
                if (chainID === undefined) {
                    logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Couldn't identify network. Please provide a chainID in the network config object`);
                    return [];
                }
                contractToPush.networks = {
                    [chainID]: {
                        address: contractData[1],
                    },
                };
            }
        }
        logger_1.logger.silly(`Processed contract ${name}:`, contractToPush);
        requestContracts.push(contractToPush);
    }
    return requestContracts;
}
exports.extractContractData = extractContractData;
//# sourceMappingURL=index.js.map