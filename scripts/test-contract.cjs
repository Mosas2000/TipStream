const {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    PostConditionMode,
    principalCV,
    uintCV,
    stringUtf8CV,
    makeStandardSTXPostCondition,
    FungibleConditionCode,
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

    // Contract fee parameters — keep in sync with tipstream.clar
    const FEE_BASIS_POINTS = 50;
    const BASIS_POINTS_DIVISOR = 10000;

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
        const amount = parseInt(process.env.AMOUNT || '1000', 10);
        const message = process.env.MESSAGE || "On-chain test tip";

        if (isNaN(amount) || amount < 1000) {
            console.error("Error: AMOUNT must be at least 1000 uSTX (0.001 STX).");
            process.exit(1);
        }

        console.log(`Calling ${contractName}.${functionName} on Mainnet...`);
        console.log(`Sender: ${senderAddress}`);
        console.log(`Recipient: ${recipient}`);
        console.log(`Amount: ${amount} uSTX (0.001 STX)`);

        // Build post conditions to restrict STX movement to exactly the
        // tip amount plus the maximum possible fee.  This ensures the
        // transaction cannot drain more than intended even if the
        // contract logic changes unexpectedly.
        const maxTransfer = amount + Math.ceil(amount * FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR) + 1;
        const postConditions = [
            makeStandardSTXPostCondition(
                senderAddress,
                FungibleConditionCode.LessEqual,
                maxTransfer
            )
        ];

        const txOptions = {
            contractAddress,
            contractName,
            functionName,
            functionArgs: [
                principalCV(recipient),
                uintCV(amount),
                stringUtf8CV(message),
            ],
            postConditions,
            senderKey,
            network,
            anchorMode: AnchorMode.Any,
            postConditionMode: PostConditionMode.Deny,
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
