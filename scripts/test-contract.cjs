const {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    PostConditionMode,
    principalCV,
    uintCV,
    stringUtf8CV,
} = require('@stacks/transactions');
const { STACKS_MAINNET: network } = require('@stacks/network');
const { generateWallet, getStxAddress } = require('@stacks/wallet-sdk');

// Use MNEMONIC environment variable for security
const mnemonic = process.env.MNEMONIC;

if (!mnemonic) {
    console.error("❌ Error: MNEMONIC environment variable not set.");
    console.log("Usage: MNEMONIC=\"your mnemonic here\" node scripts/test-contract.cjs");
    process.exit(1);
}

async function runTestTip() {
    const contractAddress = "SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T";
    const contractName = "tipstream";
    const functionName = "send-tip";

    try {
        // Derive wallet and private key
        const wallet = await generateWallet({
            mnemonic,
            password: '',
        });
        const account = wallet.accounts[0];
        const senderKey = account.stxPrivateKey;
        const senderAddress = account.address;

        // Test parameters: Send 1000 micro-STX (0.001 STX) to self
        const recipient = senderAddress;
        const amount = 1000;
        const message = "On-chain test from Antigravity 🚀";

        console.log(`Calling ${contractName}.${functionName} on Mainnet...`);
        console.log(`Sender: ${senderAddress}`);
        console.log(`Recipient: ${recipient}`);
        console.log(`Amount: ${amount} uSTX (0.001 STX)`);

        const txOptions = {
            contractAddress,
            contractName,
            functionName,
            functionArgs: [
                principalCV(recipient),
                uintCV(amount),
                stringUtf8CV(message),
            ],
            senderKey,
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Allow,
        };

        const transaction = await makeContractCall(txOptions);
        const response = await broadcastTransaction(transaction, network);

        if (response.error) {
            console.error("Broadcast Error:", response.error);
            if (response.reason) console.error("Reason:", response.reason);
        } else {
            console.log("Transaction broadcasted successfully!");
            console.log(`TX ID: 0x${response.txid}`);
            console.log(`Explorer Link: https://explorer.hiro.so/txid/0x${response.txid}?chain=mainnet`);
        }
    } catch (error) {
        console.error("Error creating/broadcasting transaction:", error);
    }
}

runTestTip();
