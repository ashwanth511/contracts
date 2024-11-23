import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, beginCell, Address } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import '@ton/test-utils';
import { randomAddress } from '@ton/test-utils';

describe('Bridge', () => {
    let blockchain: Blockchain;
    let bridge: SandboxContract<Bridge>;
    let deployer: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let messengerAddress: Address;

    const MIN_AMOUNT = toNano('0.1');
    const MAX_AMOUNT = toNano('1000');

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        user = await blockchain.treasury('user');
        messengerAddress = randomAddress();

        bridge = blockchain.openContract(
            await Bridge.fromInit(
                deployer.address,
                MIN_AMOUNT,
                MAX_AMOUNT
            )
        );

        const deployResult = await bridge.send(
            deployer.getSender(),
            {
                value: toNano('1'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        // Verify deployment transactions
        expect(deployResult.transactions.length).toBeGreaterThanOrEqual(2);
    });

    it('should deploy', async () => {
        // Check contract exists
        const contract = await blockchain.getContract(bridge.address);
        expect(contract).toBeDefined();

        // Check owner
        const owner = await bridge.getOwner();
        expect(owner.toString()).toBe(deployer.address.toString());

        // Check total locked amount starts at 0
        const totalLocked = await bridge.getGetTotalLocked();
        expect(totalLocked).toBe(0n);

        // Verify contract limits
        const lockedAmountForOwner = await bridge.getGetLockedAmount(deployer.address);
        expect(lockedAmountForOwner).toBe(0n);
    });

    it('should process valid lock', async () => {
        const amount = toNano('1');
        const ethAddress = randomAddress();
        
        const result = await bridge.send(
            user.getSender(),
            {
                value: amount,
            },
            {
                $$type: 'Lock',
                queryId: 0n,
                amount: amount,
                ethAddress: ethAddress
            }
        );

        // Verify lock transactions
        expect(result.transactions.length).toBeGreaterThanOrEqual(2);
        
        // Verify lock was recorded
        const totalLocked = await bridge.getGetTotalLocked();
        expect(totalLocked).toBe(amount);
    });

    it('should reject lock below minimum', async () => {
        const amount = toNano('0.01'); // Below minimum
        
        const result = await bridge.send(
            user.getSender(),
            {
                value: amount,
            },
            {
                $$type: 'Lock',
                queryId: 0n,
                amount: amount,
                ethAddress: randomAddress()
            }
        );

        // Verify transaction occurred but did not process
        expect(result.transactions.length).toBeGreaterThanOrEqual(1);

        // Verify no tokens were locked
        const totalLocked = await bridge.getGetTotalLocked();
        expect(totalLocked).toBe(0n);
    });

    it('should reject lock above maximum', async () => {
        const amount = toNano('1001'); // Above maximum
        
        const result = await bridge.send(
            user.getSender(),
            {
                value: amount,
            },
            {
                $$type: 'Lock',
                queryId: 0n,
                amount: amount,
                ethAddress: randomAddress()
            }
        );

        // Verify transaction occurred but did not process
        expect(result.transactions.length).toBeGreaterThanOrEqual(1);

        // Verify no tokens were locked
        const totalLocked = await bridge.getGetTotalLocked();
        expect(totalLocked).toBe(0n);
    });
});
