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
exports.TenderlyNetwork = void 0;
const axios = __importStar(require("axios"));
const tenderly_1 = require("tenderly");
const config_1 = require("tenderly/utils/config");
const constants_1 = require("tenderly/common/constants");
const log_compliance_1 = require("tenderly/utils/log-compliance");
const constants_2 = require("./constants");
const errors_1 = require("./tenderly/errors");
const util_1 = require("./utils/util");
const logger_1 = require("./utils/logger");
class TenderlyNetwork {
    constructor(hre) {
        this.tenderlyService = new tenderly_1.TenderlyService(constants_2.PLUGIN_NAME);
        logger_1.logger.debug("Making an interface towards tenderly network.");
        this.env = hre;
        this.connected = true;
        const tdlyGlobalConfig = (0, config_1.getConfig)();
        this.accessKey = tdlyGlobalConfig?.access_key;
        this.tenderlyJsonRpc = this._configureTenderlyRPCInstance();
        this.host = this.tenderlyJsonRpc.defaults.baseURL;
        if (hre.network.name === "tenderly" && "url" in hre.network.config && hre.network.config.url !== undefined) {
            this.forkID = hre.network.config.url.split("/").pop();
            logger_1.logger.info("Fork ID is:", this.forkID);
        }
    }
    supportsSubscriptions() {
        if (!this._checkNetwork()) {
            return;
        }
        return false;
    }
    disconnect() {
        if (!this._checkNetwork()) {
            return;
        }
        return true;
    }
    async send(payload, cb) {
        if (!this._checkNetwork()) {
            return;
        }
        if (this.head === undefined) {
            await this.initializeFork();
        }
        try {
            if (this.head !== undefined) {
                this.tenderlyJsonRpc.defaults.headers.common.Head = this.head;
            }
            const resp = await this.tenderlyJsonRpc.post("", payload);
            this.head = resp.headers.head;
            this._writeHead();
            cb(null, resp.data);
        }
        catch (err) {
            cb(err.response.data);
        }
    }
    resetFork() {
        const tdlyGlobalConfig = (0, config_1.getConfig)();
        const oldHead = tdlyGlobalConfig.head;
        delete tdlyGlobalConfig.head;
        delete tdlyGlobalConfig.fork;
        (0, config_1.writeConfig)(tdlyGlobalConfig);
        return oldHead;
    }
    async verify(requestData) {
        logger_1.logger.info("Invoked fork verification.");
        if (!this._checkNetwork()) {
            return;
        }
        if (this.head === undefined && this.forkID === undefined) {
            logger_1.logger.warn("Head or fork are not initialized.");
            await this.initializeFork();
        }
        await this.tenderlyService.verifyForkContractsMultiCompiler(requestData, this.env.config.tenderly.project, this.env.config.tenderly.username, this.forkID);
    }
    async verifyMultiCompilerAPI(request, tenderlyProject, username, forkID) {
        logger_1.logger.info("Invoked fork verification via API.");
        await this.tenderlyService.verifyForkContractsMultiCompiler(request, tenderlyProject, username, forkID);
    }
    async verifyAPI(request, tenderlyProject, username, forkID) {
        logger_1.logger.info("Invoked fork verification via API.");
        await this.tenderlyService.verifyForkContracts(request, tenderlyProject, username, forkID);
    }
    getHead() {
        if (!this._checkNetwork()) {
            return;
        }
        return this.head;
    }
    setHead(head) {
        if (!this._checkNetwork()) {
            return;
        }
        this.head = head;
    }
    async getForkID() {
        if (!this._checkNetwork()) {
            return;
        }
        return this.forkID;
    }
    setFork(fork) {
        if (!this._checkNetwork()) {
            return;
        }
        this.forkID = fork;
    }
    async initializeFork() {
        logger_1.logger.debug("Initializing tenderly fork.");
        if (!this._checkNetwork()) {
            return;
        }
        if (this.env.config.tenderly?.forkNetwork === undefined) {
            logger_1.logger.error("There is no information about the fork network. Fork won't be initialized");
            return;
        }
        const username = this.env.config.tenderly.username;
        const projectID = this.env.config.tenderly.project;
        logger_1.logger.trace("ProjectID obtained from tenderly configuration:", { projectID });
        try {
            const resp = await this.tenderlyJsonRpc.post(`/account/${username}/project/${projectID}/fork`, {
                network_id: this.env.config.tenderly.forkNetwork,
            });
            const logCompliantInitializeForkResponse = (0, log_compliance_1.convertToLogCompliantForkInitializeResponse)(resp);
            logger_1.logger.trace("Initialized fork:", logCompliantInitializeForkResponse);
            this.head = resp.data.root_transaction.id;
            this.accounts = resp.data.simulation_fork.accounts;
            this.forkID = resp.data.simulation_fork.id;
            logger_1.logger.debug("Successfully initialized tenderly fork.");
        }
        catch (err) {
            logger_1.logger.error("Error was caught while calling fork initialization:", err);
            throw err;
        }
    }
    _writeHead() {
        const tdlyGlobalConfig = (0, config_1.getConfig)();
        tdlyGlobalConfig.head = this.head;
        (0, config_1.writeConfig)(tdlyGlobalConfig);
    }
    async _filterContracts(flatContracts) {
        logger_1.logger.info("Processing data needed for fork verification.");
        let contract;
        let requestData;
        try {
            requestData = await this._getForkContractData(flatContracts);
            logger_1.logger.silly("Obtained request data needed for fork verification:", requestData);
        }
        catch (e) {
            logger_1.logger.error("Caught and error while trying to obtain data needed for fork verification", e);
            return null;
        }
        for (contract of flatContracts) {
            const index = requestData.contracts.findIndex((requestContract) => requestContract.contractName === contract.name);
            if (index === -1) {
                logger_1.logger.error(`Couldn't find a contract '${contract.name}' among the obtained request data.`);
                continue;
            }
            logger_1.logger.trace("Currently processing contract:", contract.name);
            requestData.contracts[index].networks = {
                [this.forkID]: {
                    address: contract.address,
                    links: contract.libraries,
                },
            };
            logger_1.logger.trace(`Contract ${contract.name} has been processed,`);
        }
        return requestData;
    }
    async _getForkContractData(flatContracts) {
        logger_1.logger.trace("Getting contract data needed for fork verification.");
        const contracts = await (0, util_1.getContracts)(this.env, flatContracts);
        if (contracts.length === 0) {
            throw new Error("Fork verification failed due to bad processing of data in /artifacts folder.");
        }
        const solcConfig = (0, util_1.getCompilerDataFromContracts)(contracts, flatContracts, this.env.config);
        if (solcConfig === undefined) {
            logger_1.logger.error(errors_1.NO_COMPILER_FOUND_FOR_CONTRACT_ERR_MSG);
        }
        return {
            contracts,
            config: solcConfig,
            root: this.head,
        };
    }
    _checkNetwork() {
        if (this.env.network.name !== "tenderly") {
            logger_1.logger.error(`Warning in ${constants_2.PLUGIN_NAME}: Network is not set to tenderly. Please call the task again with --network tenderly`);
            return false;
        }
        return true;
    }
    /**
     * Note: _configureTenderlyRPCInstance needs to be deleted this is only a temporary solution.
     * @deprecated
     */
    _configureTenderlyRPCInstance() {
        const tdlyConfig = (0, config_1.getConfig)();
        return axios.default.create({
            baseURL: constants_1.TENDERLY_JSON_RPC_BASE_URL,
            headers: {
                "x-access-key": tdlyConfig.access_key,
                Head: tdlyConfig.head !== undefined ? tdlyConfig.head : "",
            },
        });
    }
}
exports.TenderlyNetwork = TenderlyNetwork;
//# sourceMappingURL=TenderlyNetwork.js.map