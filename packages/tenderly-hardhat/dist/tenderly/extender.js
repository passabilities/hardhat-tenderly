"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = void 0;
const plugins_1 = require("hardhat/plugins");
const config_1 = require("hardhat/config");
const tenderly_1 = require("tenderly");
const logger_1 = require("tenderly/utils/logger");
const constants_1 = require("tenderly/common/constants");
const logger_2 = require("../utils/logger");
const Tenderly_1 = require("../Tenderly");
const TenderlyNetwork_1 = require("../TenderlyNetwork");
const constants_2 = require("../constants");
const ethers_1 = require("./ethers");
const hardhat_deploy_1 = require("./hardhat-deploy");
const tenderlyService = new tenderly_1.TenderlyService(constants_2.PLUGIN_NAME);
function setup() {
    // set to loggers to error level by default
    logger_2.logger.settings.minLevel = 4;
    logger_1.logger.settings.minLevel = 4;
    (0, config_1.extendEnvironment)((hre) => {
        hre.tenderly = (0, plugins_1.lazyObject)(() => new Tenderly_1.Tenderly(hre));
        if (hre.hardhatArguments.verbose) {
            logger_2.logger.settings.minLevel = 1; // trace level
            logger_1.logger.settings.minLevel = 1; // trace level
        }
        logger_2.logger.info(`Setting up hardhat-tenderly plugin. Log level of hardhat tenderly plugin set to: ${logger_2.logger.settings.minLevel}`);
        // serviceLogger is used here just for initialization, nothing else, it will be used in TenderlyService.ts
        logger_1.logger.info(`Log level of tenderly service set to: ${logger_1.logger.settings.minLevel}`);
        const pjson = require("../../package.json");
        logger_2.logger.info("@tenderly/hardhat-tenderly version:", pjson.version);
        logger_2.logger.info("Tenderly running configuration: ", {
            username: hre.config.tenderly?.username,
            project: hre.config.tenderly?.project,
            automaticVerification: process.env.AUTOMATIC_VERIFICATION_ENABLED,
            privateVerification: hre.config.tenderly?.privateVerification,
            networkName: hre.network.name,
        });
        extendProvider(hre);
        populateNetworks();
        if (process.env.AUTOMATIC_VERIFICATION_ENABLED === "true") {
            logger_2.logger.debug("Automatic verification is enabled, proceeding to extend ethers library.");
            extendEthers(hre);
            extendHardhatDeploy(hre);
            logger_2.logger.debug("Wrapping ethers library finished.");
        }
        logger_2.logger.debug("Setup finished.");
    });
}
exports.setup = setup;
(0, config_1.extendEnvironment)((hre) => {
    hre.tenderly = (0, plugins_1.lazyObject)(() => new Tenderly_1.Tenderly(hre));
    extendProvider(hre);
    populateNetworks();
});
(0, config_1.extendConfig)((resolvedConfig) => {
    resolvedConfig.networks.tenderly = {
        ...resolvedConfig.networks.tenderly,
    };
});
const extendProvider = (hre) => {
    if (hre.network.name !== "tenderly") {
        logger_2.logger.info("Used network is not 'tenderly' so there is no extending of the provider.");
        return;
    }
    if ("url" in hre.network.config && hre.network.config.url !== undefined) {
        const forkID = hre.network.config.url.split("/").pop();
        hre.tenderly.network().setFork(forkID);
        logger_2.logger.info(`There is a fork url in the 'tenderly' network`, { forkID });
        return;
    }
    const tenderlyNetwork = new TenderlyNetwork_1.TenderlyNetwork(hre);
    tenderlyNetwork
        .initializeFork()
        .then(async (_) => {
        hre.tenderly.setNetwork(tenderlyNetwork);
        const forkID = await hre.tenderly.network().getForkID();
        hre.network.config.url = `${constants_1.TENDERLY_JSON_RPC_BASE_URL}/fork/${forkID ?? ""}`;
        hre.ethers.provider = new hre.ethers.providers.Web3Provider(hre.tenderly.network());
    })
        .catch((_) => {
        logger_2.logger.error(`Error happened while trying to initialize fork ${constants_2.PLUGIN_NAME}. Check your tenderly configuration`);
    });
};
const populateNetworks = () => {
    tenderlyService
        .getNetworks()
        .then((networks) => {
        let network;
        let slug;
        for (network of networks) {
            constants_1.NETWORK_NAME_CHAIN_ID_MAP[network.slug] = network.ethereum_network_id;
            if (network?.metadata?.slug !== undefined) {
                constants_1.NETWORK_NAME_CHAIN_ID_MAP[network.metadata.slug] = network.ethereum_network_id;
            }
            constants_1.CHAIN_ID_NETWORK_NAME_MAP[network.ethereum_network_id] = network.slug;
            for (slug of network.metadata.secondary_slugs) {
                constants_1.NETWORK_NAME_CHAIN_ID_MAP[slug] = network.ethereum_network_id;
            }
        }
        logger_2.logger.silly("Obtained supported public networks: ", constants_1.NETWORK_NAME_CHAIN_ID_MAP);
    })
        .catch((_) => {
        logger_2.logger.error("Error encountered while fetching public networks");
    });
};
const extendEthers = (hre) => {
    if ("ethers" in hre && hre.ethers !== undefined && "tenderly" in hre && hre.tenderly !== undefined) {
        Object.assign(hre.ethers, (0, ethers_1.wrapEthers)(hre.ethers, hre.tenderly));
    }
};
const extendHardhatDeploy = (hre) => {
    // ts-ignore is needed here because we want to avoid importing hardhat-deploy in order not to cause duplicated initialization of the .deployments field
    if ("deployments" in hre &&
        // @ts-ignore
        hre.deployments !== undefined &&
        "tenderly" in hre &&
        // @ts-ignore
        hre.tenderly !== undefined) {
        // @ts-ignore
        hre.deployments = (0, hardhat_deploy_1.wrapHHDeployments)(hre.deployments, hre.tenderly);
    }
};
//# sourceMappingURL=extender.js.map