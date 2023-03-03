import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TenderlyAddContractRequest, TenderlyContractUploadRequest, TenderlyForkContractUploadRequest, TenderlyVerifyContractsRequest } from "tenderly/types";
import { ContractByName } from "./tenderly/types";
import { TenderlyNetwork } from "./TenderlyNetwork";
export declare class Tenderly {
    env: HardhatRuntimeEnvironment;
    tenderlyNetwork: TenderlyNetwork;
    private tenderlyService;
    constructor(hre: HardhatRuntimeEnvironment);
    verify(...contracts: any[]): Promise<void>;
    verifyMultiCompilerAPI(request: TenderlyVerifyContractsRequest): Promise<void>;
    verifyForkMultiCompilerAPI(request: TenderlyVerifyContractsRequest, tenderlyProject: string, username: string, forkID: string): Promise<void>;
    network(): TenderlyNetwork;
    setNetwork(network: TenderlyNetwork): TenderlyNetwork;
    private _getVerificationType;
    push(...contracts: any[]): Promise<void>;
    addToProject(...contracts: TenderlyAddContractRequest[]): Promise<void>;
    private _throwIfUsernameOrProjectNotSet;
    verifyAPI(request: TenderlyContractUploadRequest): Promise<void>;
    verifyForkAPI(request: TenderlyForkContractUploadRequest, tenderlyProject: string, username: string, forkID: string): Promise<void>;
    pushAPI(request: TenderlyContractUploadRequest, tenderlyProject: string, username: string): Promise<void>;
    persistArtifacts(...contracts: ContractByName[]): Promise<void>;
    private _filterContracts;
    private _getContractData;
}
//# sourceMappingURL=Tenderly.d.ts.map