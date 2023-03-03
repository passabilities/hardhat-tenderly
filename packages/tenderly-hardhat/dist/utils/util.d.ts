import { HardhatConfig } from "hardhat/src/types/config";
import { CompilationJob, HardhatRuntimeEnvironment } from "hardhat/types";
import { TenderlyContract, TenderlyContractConfig, TenderlyVerifyContractsRequest } from "tenderly/types";
import { ContractByName, Metadata } from "../tenderly/types";
export declare const makeVerifyContractsRequest: (hre: HardhatRuntimeEnvironment, flatContracts: ContractByName[], forkId?: string) => Promise<TenderlyVerifyContractsRequest | null>;
export declare const getCompilationJob: (hre: HardhatRuntimeEnvironment, contractName: string) => Promise<CompilationJob>;
export declare const getCompilerDataFromContracts: (contracts: TenderlyContract[], flatContracts: ContractByName[], hhConfig: HardhatConfig) => TenderlyContractConfig | undefined;
export declare const getContracts: (hre: HardhatRuntimeEnvironment, flatContracts: ContractByName[]) => Promise<TenderlyContract[]>;
export declare const resolveDependencies: (dependencyData: any, sourcePath: string, metadata: Metadata, visited: Record<string, boolean>) => void;
export declare const compareConfigs: (originalConfig: TenderlyContractConfig, newConfig: TenderlyContractConfig) => boolean;
export declare const newCompilerConfig: (config: HardhatConfig, sourcePath?: string, contractCompiler?: string) => TenderlyContractConfig;
export declare const extractCompilerVersion: (config: HardhatConfig, sourcePath?: string, versionPragma?: string) => string;
export declare const classFunctions: (x: any) => string[];
//# sourceMappingURL=util.d.ts.map