import { Contract, ContractFactory, Signer } from "ethers";
import { Libraries } from "@nomiclabs/hardhat-ethers/types";
import { TenderlyPlugin } from "../../type-extensions";
export declare class TdlyContractFactory {
    [key: string]: any;
    private readonly contractName;
    private libs;
    private nativeContractFactory;
    private tenderly;
    constructor(nativeContractFactory: ContractFactory, tenderly: TenderlyPlugin, contractName: string, libs?: Libraries);
    deploy(...args: any[]): Promise<Contract>;
    connect(signer: Signer): TdlyContractFactory;
}
//# sourceMappingURL=ContractFactory.d.ts.map