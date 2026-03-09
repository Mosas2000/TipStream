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
    console.error("Error: MNEMONIC environment variable not set.");
    console.log("Usage: MNEMONIC=\"your mnemonic\" RECIPIENT=\"SPaddress\" node scripts/test-contract.cjs");
    process.exit(1);
}

// Basic sanity check: a BIP-39 mnemonic should contain 12 or 24 words.
const wordCount = mnemonic.trim().split(/\s+/).length;
if (wordCount !== 12 && wordCount !== 24) {
    console.error(`Error: mnemonic has ${wordCount} words (expected 12 or 24).`);
    console.error("Double-check the MNEMONIC environment variable.");
    process.exit(1);
}

const recipientArg = process.env.RECIPIENT;
if (!recipientArg) {
    console.error("Error: RECIPIENT environment variable not set.");
    console.log("The contract does not allow self-tipping. Provide a different recipient address.");
    console.log("Usage: MNEMONIC=\"your mnemonic\" RECIPIENT=\"SPaddress\" node scripts/test-contract.cjs");
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

        const recipient = recipientArg;
        const amount = 1000;
        const message = "On-chain test tip";

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
