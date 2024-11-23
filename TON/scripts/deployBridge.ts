import { toNano, Address } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { NetworkProvider } from '@ton/blueprint';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const DEPLOY_AMOUNT = '0.1'; // Increased for safety
const MIN_AMOUNT = toNano('0.1');  // Minimum transaction amount
const MAX_AMOUNT = toNano('1000'); // Maximum transaction amount

export async function run(provider: NetworkProvider) {
    // Validate environment
    if (!process.env.WALLET_MNEMONIC) {
        throw new Error('WALLET_MNEMONIC not set in .env');
    }
    if (!process.env.ENDPOINT) {
        throw new Error('ENDPOINT not set in .env');
    }

    // Get sender address safely
    const sender = provider.sender();
    const senderAddress = sender.address;
    
    if (!senderAddress) {
        throw new Error('Could not determine sender address');
    }

    // Deploy Bridge first
    console.log('='.repeat(50));
    console.log('Deploying Bridge contract...');
    
    const bridge = provider.open(await Bridge.fromInit(
        senderAddress,  // Owner address
        MIN_AMOUNT,  // Minimum transaction amount
        MAX_AMOUNT   // Maximum transaction amount
    ));

    console.log('Bridge address:', bridge.address.toString());
    console.log('Network:', process.env.ENDPOINT);

    try {
        // Check if Bridge is already deployed
        const isBridgeDeployed = await provider.isContractDeployed(bridge.address);
        if (isBridgeDeployed) {
            console.log('Bridge contract is already deployed!');
        } else {
            // Deploy Bridge
            await bridge.send(
                sender,
                {
                    value: toNano(DEPLOY_AMOUNT),
                },
                {
                    $$type: 'Deploy',
                    queryId: 0n,
                }
            );

            await provider.waitForDeploy(bridge.address);
            console.log('Bridge deployed successfully!');
        }

        // Save deployment info
        const deployInfo = {
            bridge: {
                address: bridge.address.toString(),
                owner: senderAddress.toString()
            },
            network: process.env.ENDPOINT,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync('deployment-info.json', JSON.stringify(deployInfo, null, 2));
        console.log('\nDeployment info saved to deployment-info.json');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('Error during deployment:', error);
        process.exit(1);
    }
}
