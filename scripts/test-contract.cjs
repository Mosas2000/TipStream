/**
 * test-contract.cjs — Send a test tip on Stacks mainnet.
 *
 * Usage:
 *   MNEMONIC="..." RECIPIENT="SP..." node scripts/test-contract.cjs
 *
 * Optional env vars:
 *   AMOUNT   — Tip in microSTX (default 1000, min 1000)
 *   MESSAGE  — On-chain message (default "On-chain test tip")
 *   DRY_RUN  — Set to "1" to build the tx without broadcasting
 *
 * Security:
 *   This script uses PostConditionMode.Deny with an explicit STX ceiling.
 *   See scripts/lib/post-conditions.cjs and docs/POST-CONDITION-GUIDE.md.
 */
const {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    principalCV,
    uintCV,
    stringUtf8CV,
} = require('@stacks/transactions');
const { STACKS_MAINNET: network } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const {
    tipPostCondition,
    maxTransferForTip,
    feeForTip,
    totalDeduction,
    SAFE_POST_CONDITION_MODE,
} = require('./lib/post-conditions.cjs');

// Use MNEMONIC environment variable for security
const mnemonic = process.env.MNEMONIC;

if (!mnemonic) {
    console.error("Error: MNEMONIC environment variable not set.");
    console.log("Usage: MNEMONIC=\"your mnemonic\" RECIPIENT=\"SPaddress\" node scripts/test-contract.cjs");
    process.exit(1);
}

// BIP-39 mnemonics are 12 or 24 words
const wordCount = mnemonic.trim().split(/\s+/).length;
if (wordCount !== 12 && wordCount !== 24) {
    console.error(`Error: MNEMONIC has ${wordCount} words. Expected 12 or 24.`);
    process.exit(1);
}

const recipientArg = process.env.RECIPIENT;
if (!recipientArg) {
    console.error("Error: RECIPIENT environment variable not set.");
    console.log("The contract does not allow self-tipping. Provide a different recipient address.");
    console.log("Usage: MNEMONIC=\"your mnemonic\" RECIPIENT=\"SPaddress\" node scripts/test-contract.cjs");
    process.exit(1);
}

// Validate recipient address format
if (!/^SP[0-9A-Z]{33,39}$/i.test(recipientArg.trim())) {
    console.error("Error: RECIPIENT does not look like a valid mainnet address (SP...).");
    process.exit(1);
}

async function runTestTip() {
    const contractAddress = "SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T";
    const contractName = "tipstream";
    const functionName = "send-tip";

    // Fee constants are defined in scripts/lib/post-conditions.cjs

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

        // The contract rejects self-tips; catch it early
        if (senderAddress === recipient) {
            console.error("Error: sender and recipient are the same address.");
            console.error("The contract does not allow self-tipping.");
            process.exit(1);
        }

        console.log(`Calling ${contractName}.${functionName} on Mainnet...`);
        console.log(`Sender:    ${senderAddress}`);
        console.log(`Recipient: ${recipient}`);
        console.log(`Amount:    ${amount} uSTX (${(amount / 1_000_000).toFixed(6)} STX)`);
        console.log(`Fee:       ${feeForTip(amount)} uSTX (0.5%)`);
        console.log(`Total:     ${totalDeduction(amount)} uSTX`);
        console.log(`Ceiling:   ${maxTransferForTip(amount)} uSTX (post-condition limit)`);
        console.log(`Mode:      PostConditionMode.Deny`);
        console.log(`Message:   "${message}"`);

        // Build post conditions using the shared helper.
        const postConditions = [tipPostCondition(senderAddress, amount)];

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
            postConditionMode: SAFE_POST_CONDITION_MODE,
        };

        const transaction = await makeContractCall(txOptions);

        // Dry-run mode: build and display the transaction without broadcasting
        if (process.env.DRY_RUN === '1') {
            console.log("Dry run — transaction built but NOT broadcast.");
            console.log(`Post-condition: sender can send at most ${maxTransferForTip(amount)} uSTX`);
            console.log(`PostConditionMode: Deny`);
            console.log(`Transaction size: ${transaction.serialize().byteLength} bytes`);
            return;
        }

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
