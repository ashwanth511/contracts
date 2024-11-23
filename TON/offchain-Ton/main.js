import { Address, TonClient } from 'ton';
import { Bridge } from '../build/Bridge'; // Your compiled contract

async function listenBridgeEvents() {
    const client = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    });

    const bridge = new Bridge(Address.parse('EQD'));

    // Start listening to transactions
    const transactions = await client.getTransactions(bridge.address, {
        limit: 100,
    });

    for (let tx of transactions) {
        // Decode the event from transaction
        const event = bridge.decodeEvent(tx);

        if (event) {
            console.log({
                amount: event.amount,
                destinationAddress: event.destinationAddress,
                messageHash: event.messageHash,
                data: event.data,
            });
        }
    }

    // For real-time monitoring
    while (true) {
        const newTransactions = await client.getTransactions(bridge.address, {
            limit: 1,
        });

        const event = bridge.decodeEvent(newTransactions[0]);
        if (event) {
            console.log('New Event:', {
                amount: event.amount,
                destinationAddress: event.destinationAddress,
                messageHash: event.messageHash,
                data: event.data,
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

listenBridgeEvents();
