import { RunTaskFunction, HardhatConfig } from "hardhat/types";
import { TenderlyContract } from "tenderly/types";
export declare function extractContractData(contracts: string[], network: string | undefined, config: HardhatConfig, run: RunTaskFunction): Promise<TenderlyContract[]>;
//# sourceMappingURL=index.d.ts.map