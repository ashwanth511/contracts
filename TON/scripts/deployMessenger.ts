import { toNano, Address, beginCell, Cell, contractAddress, Contract } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { join } from 'path';

dotenv.config();

class MessengerContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}
}

export async function run(provider: NetworkProvider) {
    // Validate environment
    if (!process.env.WALLET_MNEMONIC) {
        throw new Error('WALLET_MNEMONIC not set in .env');
    }
    if (!process.env.ENDPOINT) {
        throw new Error('ENDPOINT not set in .env');
    }
    if (!process.env.BRIDGE_ADDRESS) {
        throw new Error('BRIDGE_ADDRESS not set in .env');
    }

    // Get sender address safely
    const sender = provider.sender();
    const senderAddress = sender.address;
    
    if (!senderAddress) {
        throw new Error('Could not determine sender address');
    }

    // Use bridge address from environment
    const bridgeAddress = Address.parse(process.env.BRIDGE_ADDRESS);

    // Load compiled contract code
    const messengerCodePath = join(__dirname, '../build/Messenger/tact_Messenger.code.boc');
    if (!fs.existsSync(messengerCodePath)) {
        throw new Error('Compiled contract code not found. Please run `blueprint build` first.');
    }
    const messengerCode = Cell.fromBoc(fs.readFileSync(messengerCodePath))[0];

    // Initialize contract data
    const messengerData = beginCell()
        .storeAddress(senderAddress)  // owner
        .storeAddress(bridgeAddress)  // bridge
        .storeCoins(0)               // totalProcessed
        .endCell();

    // Calculate contract address
    const messengerAddress = contractAddress(0, { code: messengerCode, data: messengerData });

    console.log('='.repeat(50));
    console.log('Deploying Messenger contract...');
    console.log('Network:', process.env.ENDPOINT);
    console.log('Messenger address:', messengerAddress.toString());
    console.log('Owner address:', senderAddress.toString());
    console.log('Bridge address:', bridgeAddress.toString());

    try {
        // Check if already deployed
        const isDeployed = await provider.isContractDeployed(messengerAddress);
        if (isDeployed) {
            console.log('Messenger contract is already deployed!');
            return;
        }

        // Create contract instance
        const messenger = new MessengerContract(messengerAddress, {
            code: messengerCode,
            data: messengerData
        });

        // Deploy contract
        await provider.deploy(messenger, toNano('0.1'));
        console.log('Messenger deployed successfully!');

        // Save deployment info
        const deployInfo = {
            messenger: {
                address: messengerAddress.toString(),
                owner: senderAddress.toString(),
                bridgeAddress: bridgeAddress.toString()
            },
            network: process.env.ENDPOINT,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync('messenger-deployment-info.json', JSON.stringify(deployInfo, null, 2));
        console.log('\nMessenger deployment info saved to messenger-deployment-info.json');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('Error during Messenger deployment:', error);
        process.exit(1);
    }
}
