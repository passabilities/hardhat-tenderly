import { Contract, ethers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import { Libraries } from "hardhat-deploy/types";
import { TenderlyPlugin } from "../../type-extensions";
export declare class TdlyContract {
    [key: string]: any;
    private readonly contractName;
    private nativeContract;
    private tenderly;
    private libraries;
    constructor(nativeContract: ethers.Contract, tenderly: TenderlyPlugin, contractName: string, libs?: Libraries);
    deployed(): Promise<Contract>;
    private _tdlyVerify;
}
export interface TransactionReceipt {
    to: string;
    from: string;
    contractAddress: string;
    transactionIndex: number;
    root?: string;
    gasUsed: BigNumber;
    logsBloom: string;
    blockHash: string;
    transactionHash: string;
    logs: Log[];
    blockNumber: number;
    confirmations: number;
    cumulativeGasUsed: BigNumber;
    effectiveGasPrice: BigNumber;
    byzantium: boolean;
    type: number;
    status?: number;
}
export interface Log {
    blockNumber: number;
    blockHash: string;
    transactionIndex: number;
    removed: boolean;
    address: string;
    data: string;
    topics: string[];
    transactionHash: string;
    logIndex: number;
}
//# sourceMappingURL=Contract.d.ts.map