"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tenderly = void 0;
const path_1 = require("path");
const fs = __importStar(require("fs-extra"));
const plugins_1 = require("hardhat/plugins");
const tenderly_1 = require("tenderly");
const constants_1 = require("tenderly/common/constants");
const logger_1 = require("./utils/logger");
const errors_1 = require("./tenderly/errors");
const util_1 = require("./utils/util");
const constants_2 = require("./constants");
const TenderlyNetwork_1 = require("./TenderlyNetwork");
class Tenderly {
    constructor(hre) {
        this.tenderlyService = new tenderly_1.TenderlyService(constants_2.PLUGIN_NAME);
        logger_1.logger.debug("Creating Tenderly plugin.");
        this.env = hre;
        this.tenderlyNetwork = new TenderlyNetwork_1.TenderlyNetwork(hre);
        logger_1.logger.debug("Created Tenderly plugin.");
    }
    async verify(...contracts) {
        logger_1.logger.info("Verification invoked.");
        const flatContracts = contracts.reduce((accumulator, value) => accumulator.concat(value), []);
        const requestData = await (0, util_1.makeVerifyContractsRequest)(this.env, flatContracts, this.tenderlyNetwork.forkID // If network is not set to "tenderly", forkID will be undefined
        );
        if (requestData === null) {
            logger_1.logger.error("Verification failed due to bad processing of the data in /artifacts directory.");
            return;
        }
        const verificationType = this._getVerificationType();
        if (verificationType === constants_2.VERIFICATION_TYPES.FORK) {
            logger_1.logger.info("Network parameter is set to 'tenderly', redirecting to fork verification.");
            await this._throwIfUsernameOrProjectNotSet();
            return this.tenderlyNetwork.verify(requestData);
        }
        if (verificationType === constants_2.VERIFICATION_TYPES.PRIVATE) {
            logger_1.logger.info("Private verification flag is set to true, redirecting to private verification.");
            await this._throwIfUsernameOrProjectNotSet();
            return this.tenderlyService.pushContractsMultiCompiler(requestData, this.env.config.tenderly.project, this.env.config.tenderly.username);
        }
        logger_1.logger.info("Publicly verifying contracts.");
        return this.tenderlyService.verifyContractsMultiCompiler(requestData);
    }
    async verifyMultiCompilerAPI(request) {
        logger_1.logger.info("Invoked verification (multi compiler version) through API.");
        logger_1.logger.trace("Request data:", request);
        switch (this._getVerificationType()) {
            case constants_2.VERIFICATION_TYPES.FORK:
                logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Network parameter is set to 'tenderly' and verifyMultiCompilerAPI() is not available for fork deployments, please use verifyForkAPI().`);
                break;
            case constants_2.VERIFICATION_TYPES.PRIVATE:
                if (this.env.config.tenderly?.project === undefined) {
                    logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Please provide the project field in the tenderly object in hardhat.config.js`);
                    return;
                }
                if (this.env.config.tenderly?.username === undefined) {
                    logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Please provide the username field in the tenderly object in hardhat.config.js`);
                    return;
                }
                logger_1.logger.info("Private verification flag is set to true, redirecting to private verification.");
                await this.tenderlyService.pushContractsMultiCompiler(request, this.env.config.tenderly.project, this.env.config.tenderly.username);
                break;
            case constants_2.VERIFICATION_TYPES.PUBLIC:
                logger_1.logger.info("Publicly verifying contracts.");
                await this.tenderlyService.verifyContractsMultiCompiler(request);
                break;
        }
    }
    async verifyForkMultiCompilerAPI(request, tenderlyProject, username, forkID) {
        logger_1.logger.info("Invoked fork verification through API request. (Multi compiler version)");
        if (this.env.network.name !== "tenderly") {
            logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Network parameter is not set to 'tenderly' and verifyForkAPI() is only available for tenderly fork deployments, please use --network tenderly.`);
            return;
        }
        await this._throwIfUsernameOrProjectNotSet();
        await this.tenderlyNetwork.verifyMultiCompilerAPI(request, tenderlyProject, username, forkID);
    }
    network() {
        return this.tenderlyNetwork;
    }
    setNetwork(network) {
        this.tenderlyNetwork = network;
        logger_1.logger.trace("Network is set to 'tenderly'.", network);
        return this.tenderlyNetwork;
    }
    _getVerificationType() {
        if (this.env.network.name === "tenderly") {
            return constants_2.VERIFICATION_TYPES.FORK;
        }
        const priv = this.env.config.tenderly?.privateVerification;
        if (priv !== undefined && priv && this.env.network.name !== "tenderly") {
            return constants_2.VERIFICATION_TYPES.PRIVATE;
        }
        return constants_2.VERIFICATION_TYPES.PUBLIC;
    }
    async push(...contracts) {
        return this.verify(...contracts);
    }
    async addToProject(...contracts) {
        logger_1.logger.info("Add contracts to project invoked.");
        await this._throwIfUsernameOrProjectNotSet();
        await this.tenderlyService.addContractsToProject(this.env.config.tenderly.username, this.env.config.tenderly.project, ...contracts);
    }
    async _throwIfUsernameOrProjectNotSet() {
        if (this.env.config.tenderly?.project === undefined) {
            throw Error(`Error in ${constants_2.PLUGIN_NAME}: Please provide the project field in the tenderly object in hardhat.config.js`);
        }
        if (this.env.config.tenderly?.username === undefined) {
            throw Error(`Error in ${constants_2.PLUGIN_NAME}: Please provide the username field in the tenderly object in hardhat.config.js`);
        }
    }
    async verifyAPI(request) {
        logger_1.logger.info("Invoked public verification through API request.");
        if (this.env.network.name === "tenderly") {
            logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Network parameter is set to 'tenderly' and verifyAPI() is not available for fork deployments, please use verifyForkAPI().`);
            return;
        }
        await this.tenderlyService.verifyContracts(request);
    }
    async verifyForkAPI(request, tenderlyProject, username, forkID) {
        logger_1.logger.info("Invoked fork verification through API request.");
        if (this.env.network.name !== "tenderly") {
            logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Network parameter is not set to 'tenderly' and verifyForkAPI() is only available for tenderly fork deployments, please use --network tenderly.`);
            return;
        }
        await this.tenderlyNetwork.verifyAPI(request, tenderlyProject, username, forkID);
    }
    async pushAPI(request, tenderlyProject, username) {
        logger_1.logger.info("Invoked pushing contracts through API.");
        if (this.env.network.name === "tenderly") {
            logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Network parameter is set to 'tenderly' and pushAPI() is not available for fork deployments, please use verifyForkAPI().`);
            return;
        }
        await this.tenderlyService.pushContracts(request, tenderlyProject, username);
    }
    async persistArtifacts(...contracts) {
        logger_1.logger.info("Invoked persisting artifacts.");
        if (contracts.length === 0) {
            logger_1.logger.error("No contracts were provided during artifact persisting.");
            return;
        }
        const sourcePaths = await this.env.run("compile:solidity:get-source-paths");
        const sourceNames = await this.env.run("compile:solidity:get-source-names", { sourcePaths });
        const data = await this.env.run("compile:solidity:get-dependency-graph", {
            sourceNames,
        });
        if (data.length === 0) {
            throw new plugins_1.HardhatPluginError(constants_2.PLUGIN_NAME, errors_1.CONTRACTS_NOT_DETECTED);
        }
        let contract;
        data._resolvedFiles.forEach((resolvedFile, _) => {
            const sourcePath = resolvedFile.sourceName;
            logger_1.logger.trace("Currently processing file:", sourcePath);
            const name = sourcePath.split("/").slice(-1)[0].split(".")[0];
            logger_1.logger.trace("Obtained name from source file:", name);
            for (contract of contracts) {
                if (contract.name === name) {
                    logger_1.logger.trace("Found contract:", contract.name);
                    const network = this.env.hardhatArguments.network !== "hardhat"
                        ? this.env.hardhatArguments.network ?? contract.network
                        : contract.network;
                    if (network === undefined) {
                        console.log(`Error in ${constants_2.PLUGIN_NAME}: Please provide a network via the hardhat --network argument or directly in the contract`);
                        continue;
                    }
                    let chainID = constants_1.NETWORK_NAME_CHAIN_ID_MAP[network.toLowerCase()];
                    if (this.env.config.networks[network].chainId !== undefined) {
                        chainID = this.env.config.networks[network].chainId.toString();
                    }
                    if (chainID === undefined) {
                        chainID = constants_2.DEFAULT_CHAIN_ID;
                    }
                    const deploymentsFolder = this.env.config?.tenderly?.deploymentsDir ?? "deployments";
                    const destPath = `${deploymentsFolder}${path_1.sep}${network.toLowerCase()}_${chainID}${path_1.sep}`;
                    const contractDataPath = `${this.env.config.paths.artifacts}${path_1.sep}${sourcePath}${path_1.sep}${name}.json`;
                    const contractData = JSON.parse(fs.readFileSync(contractDataPath).toString());
                    const metadata = {
                        defaultCompiler: {
                            version: (0, util_1.extractCompilerVersion)(this.env.config, sourcePath),
                        },
                        sources: {
                            [sourcePath]: {
                                content: resolvedFile.content.rawContent,
                                versionPragma: resolvedFile.content.versionPragmas[0],
                            },
                        },
                    };
                    const visited = {};
                    (0, util_1.resolveDependencies)(data, sourcePath, metadata, visited);
                    const artifact = {
                        metadata: JSON.stringify(metadata),
                        address: contract.address,
                        bytecode: contractData.bytecode,
                        deployedBytecode: contractData.deployedBytecode,
                        abi: contractData.abi,
                    };
                    logger_1.logger.trace("Processed artifact: ", artifact);
                    fs.outputFileSync(`${destPath}${name}.json`, JSON.stringify(artifact));
                }
            }
        });
    }
    async _filterContracts(flatContracts) {
        logger_1.logger.info("Processing data needed for verification.");
        let contract;
        let requestData;
        try {
            requestData = await this._getContractData(flatContracts);
            logger_1.logger.silly("Processed request data:", requestData);
        }
        catch (e) {
            logger_1.logger.error("Error caught while trying to process contracts by name: ", e);
            return null;
        }
        for (contract of flatContracts) {
            const network = this.env.hardhatArguments.network !== "hardhat"
                ? this.env.hardhatArguments.network ?? contract.network
                : contract.network;
            if (network === undefined) {
                logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Please provide a network via the hardhat --network argument or directly in the contract`);
                return null;
            }
            logger_1.logger.trace("Found network is:", network);
            const index = requestData.contracts.findIndex((requestContract) => requestContract.contractName === contract.name);
            if (index === -1) {
                logger_1.logger.error(`Contract '${contract.name}' was not found among the contracts in /artifacts.`);
                continue;
            }
            let chainID = constants_1.NETWORK_NAME_CHAIN_ID_MAP[network.toLowerCase()];
            if (this.env.config.networks[network].chainId !== undefined) {
                chainID = this.env.config.networks[network].chainId.toString();
            }
            logger_1.logger.trace(`ChainID for network '${network}' is ${chainID}`);
            if (chainID === undefined) {
                logger_1.logger.error(`Error in ${constants_2.PLUGIN_NAME}: Couldn't identify network. Please provide a chainId in the network config object`);
                return null;
            }
            requestData.contracts[index].networks = {
                [chainID]: {
                    address: contract.address,
                    links: contract.libraries,
                },
            };
        }
        logger_1.logger.debug("Processed request data from _filterContracts:", requestData);
        return requestData;
    }
    async _getContractData(flatContracts) {
        const contracts = await (0, util_1.getContracts)(this.env, flatContracts);
        const config = (0, util_1.getCompilerDataFromContracts)(contracts, flatContracts, this.env.config);
        if (config === undefined) {
            logger_1.logger.error(errors_1.NO_COMPILER_FOUND_FOR_CONTRACT_ERR_MSG);
        }
        return {
            contracts,
            config: config,
        };
    }
}
exports.Tenderly = Tenderly;
//# sourceMappingURL=Tenderly.js.map