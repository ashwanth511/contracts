import { sign } from 'ton-crypto';
import { Address, Cell, beginCell } from 'ton-core';

async function signBridgeMessage(amount: bigint, receiver: string, secretKey: Buffer) {
    // Create cell with message data using beginCell
    const cell = beginCell()
        .storeUint(amount, 256)
        .storeAddress(Address.parse(receiver))
        .endCell();
    
    // Get hash and sign
    const hash = cell.hash();
    const signature = sign(hash, secretKey);
    
    return {
        hash,
        signature
    };
}
