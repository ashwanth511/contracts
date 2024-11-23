import { Address, toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Bridge address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const bridge = provider.open(Bridge.fromAddress(address));

    // Get initial total locked tokens
    const totalLockedBefore = await bridge.getGetTotalLocked();
    ui.write(`Current total locked tokens: ${totalLockedBefore}`);

    // Example: Lock some tokens
    const lockAmount = toNano('0.5'); // Lock 0.5 TON
    const ethAddress = Address.parse('EQDtd-bk0fDzEQN61l5Y6mX_jNYvCPXdqJJKd5ikxFs-ulS9'); // Using same format as bridge address

    await bridge.send(
        provider.sender(),
        {
            value: toNano('0.05'), // Gas for transaction
        },
        {
            $$type: 'Lock',
            queryId: 0n,
            amount: lockAmount,
            ethAddress: ethAddress
        }
    );

    ui.write('Waiting for tokens to be locked...');

    // Wait for lock to be processed
    let totalLockedAfter = await bridge.getGetTotalLocked();
    let attempt = 1;
    while (totalLockedAfter === totalLockedBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        totalLockedAfter = await bridge.getGetTotalLocked();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write(`Lock successful! New total locked tokens: ${totalLockedAfter}`);
}
