import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type MessengerConfig = {
    owner: Address;
    bridgeAddress: Address;
};

export function messengerConfigToCell(config: MessengerConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeAddress(config.bridgeAddress)
        .endCell();
}

export class Messenger extends Contract {
    static fromInit(owner: Address, bridgeAddress: Address) {
        const config: MessengerConfig = { owner, bridgeAddress };
        const code = Cell.fromBase64(''); // TODO: Add actual contract code
        const data = messengerConfigToCell(config);
        const init = { code, data };
        return new Messenger(contractAddress(0, init), init);
    }

    constructor(address: Address, init?: { code: Cell; data: Cell }) {
        super(address, init);
    }

    async getBridgeAddress(provider: ContractProvider) {
        const result = await provider.get('getBridgeAddress', []);
        return result.stack.readAddress();
    }
}
