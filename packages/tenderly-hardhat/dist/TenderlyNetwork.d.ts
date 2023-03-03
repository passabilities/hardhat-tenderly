import * as axios from "axios";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TenderlyForkContractUploadRequest, TenderlyVerifyContractsRequest } from "tenderly/types";
export declare class TenderlyNetwork {
    host: string;
    connected: boolean;
    accessKey: string;
    head: string | undefined;
    forkID: string | undefined;
    tenderlyJsonRpc: axios.AxiosInstance;
    accounts: Record<string, string> | undefined;
    env: HardhatRuntimeEnvironment;
    private tenderlyService;
    constructor(hre: HardhatRuntimeEnvironment);
    supportsSubscriptions(): false | undefined;
    disconnect(): true | undefined;
    send(payload: any, cb: any): Promise<void>;
    resetFork(): string | undefined;
    verify(requestData: TenderlyVerifyContractsRequest): Promise<void>;
    verifyMultiCompilerAPI(request: TenderlyVerifyContractsRequest, tenderlyProject: string, username: string, forkID: string): Promise<void>;
    verifyAPI(request: TenderlyForkContractUploadRequest, tenderlyProject: string, username: string, forkID: string): Promise<void>;
    getHead(): string | undefined;
    setHead(head: string | undefined): void;
    getForkID(): Promise<string | undefined>;
    setFork(fork: string | undefined): void;
    initializeFork(): Promise<void>;
    private _writeHead;
    private _filterContracts;
    private _getForkContractData;
    private _checkNetwork;
    /**
     * Note: _configureTenderlyRPCInstance needs to be deleted this is only a temporary solution.
     * @deprecated
     */
    private _configureTenderlyRPCInstance;
}
//# sourceMappingURL=TenderlyNetwork.d.ts.map