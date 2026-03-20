/**
 * batch-tips-to-wallet1.cjs — Send multiple test tips to wallet_1 on devnet.
 *
 * Usage:
 *   node scripts/batch-tips-to-wallet1.cjs
 *
 * Optional env vars:
 *   NUM_TIPS    — Number of tips to send (default 5)
 *   AMOUNT      — Tip amount in microSTX (default 1000, min 1000)
 *   MESSAGE     — On-chain message (default "Test tip to wallet 1")
 *   DRY_RUN     — Set to "1" to build the tx without broadcasting
 *   NETWORK     — "devnet" (default) or "mainnet"
 *
 * This script uses wallets from settings/Devnet.toml or settings/Mainnet.toml
 * and sends all tips to wallet_1.
 */
const {
    makeContractCall,
    broadcastTransaction,
    AnchorMode,
    principalCV,
    uintCV,
    stringUtf8CV,
    fetchNonce,
} = require('@stacks/transactions');
const { STACKS_MAINNET, STACKS_DEVNET } = require('@stacks/network');
const { generateWallet } = require('@stacks/wallet-sdk');
const {
    tipPostCondition,
    maxTransferForTip,
    feeForTip,
    totalDeduction,
    SAFE_POST_CONDITION_MODE,
} = require('./lib/post-conditions.cjs');

// Wallet configurations from settings/Devnet.toml and settings/Mainnet.toml
const WALLETS = {
    devnet: {
        wallet_1: {
            mnemonic: "sell invite acquire kitten bamboo drastic jelly vivid peace spawn twice guilt pave pen trash pretty park cube fragile unaware remain midnight betray rebuild",
            address: "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5"
        },
        wallet_2: {
            mnemonic: "hold excess usual excess ring elephant install account glad dry fragile donkey gaze humble truck breeze nation gasp vacuum limb head keep delay hospital",
            address: "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
        },
        wallet_3: {
            mnemonic: "cycle puppy glare enroll cost improve round trend wrist mushroom scorpion tower claim oppose clever elephant dinosaur eight problem before frozen dune wagon high",
            address: "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC"
        },
        wallet_4: {
            mnemonic: "board list obtain sugar hour worth raven scout denial thunder horse logic fury scorpion fold genuine phrase wealth news aim below celery when cabin",
            address: "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND"
        },
        wallet_5: {
            mnemonic: "hurry aunt blame peanut heavy update captain human rice crime juice adult scale device promote vast project quiz unit note reform update climb purchase",
            address: "ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB"
        },
        wallet_6: {
            mnemonic: "area desk dutch sign gold cricket dawn toward giggle vibrant indoor bench warfare wagon number tiny universe sand talk dilemma pottery bone trap buddy",
            address: "ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0"
        },
        wallet_7: {
            mnemonic: "prevent gallery kind limb income control noise together echo rival record wedding sense uncover school version force bleak nuclear include danger skirt enact arrow",
            address: "ST3PF13W7Z0RRM42A8VZRVFQ75SV1K26RXEP8YGKJ"
        },
        wallet_8: {
            mnemonic: "female adjust gallery certain visit token during great side clown fitness like hurt clip knife warm bench start reunion globe detail dream depend fortune",
            address: "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
        },
    },
    mainnet: {
        wallet_1: {
            mnemonic: "arm fiscal vapor million follow member injury galaxy rifle music happy taxi clump giant giggle snap shiver spare lawsuit hole budget coffee family exile",
            address: "SP3TNNY9CCQTRH5E7JG37HSKSVGZAGNT37CQN57VE"
        },
        wallet_2: {
            mnemonic: "fat world speed million finger lawsuit season iron artist record twenty thrive news recipe grow cycle item deer focus merit toward butter regret unusual",
            address: "SP3X3RK4WV8GAHQPS043VHSFCFEHXDMN1QCTMFEF0"
        },
        wallet_3: {
            mnemonic: "attract you fancy silver riot emotion ride ready aisle aspect bar shop trust sunny public raccoon wealth shrimp access twist eye key enhance lunch",
            address: "SP3QWJC2Q2M95Z35J7FQYFSPAKRQH85VXWPDRQR5M"
        },
        wallet_4: {
            mnemonic: "easily ancient win fun obey eagle idea group monster flat party around cause purity sea aunt galaxy weird slender portion private debris danger galaxy",
            address: "SP2NQSB7X92EXYPVS68WQ7M7KC3AHZYEP9Y0579T9"
        },
        wallet_5: {
            mnemonic: "face loan void excite garbage before erode keep follow begin satisfy few float drop intact pottery deny guess arrange case convince erosion crunch double",
            address: "SP3V0KZC5PSE9KWMRNW5D901XNZ87Q3V0898R5Q5B"
        },
        wallet_6: {
            mnemonic: "shoulder uncover weather local quality umbrella gadget model chat duty hard floor virtual suggest bargain live exclude model upgrade hole physical stem scorpion medal",
            address: "SPWKVP1S21NB8HQCTK1EMV0N64N5882Q5D6WX3ER"
        },
        wallet_7: {
            mnemonic: "monkey shove enable wave road impose wool require oil vessel dance relief toilet amateur expose leaf today breeze idle vanish differ figure spawn forget",
            address: "SP3JHDB3E7GXDDQNTSHHGB42VFHBF031JSS6SJY7Q"
        },
        wallet_8: {
            mnemonic: "best coconut kiss meat silver leopard put loyal curious idea ancient frown save ask scare occur vivid mobile conduct patrol kingdom next lobster smile",
            address: "SPKS7Z1PGDRQVD8ZDVPD5FX7MCXCBGHR252EYCNP"
        },
    }
};

// Contract configuration
const CONTRACTS = {
    devnet: {
        address: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        name: "tipstream"
    },
    mainnet: {
        address: "SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T",
        name: "tipstream"
    }
};

async function sendTip(senderMnemonic, senderAddress, recipient, amount, message, network, contract, isDryRun, nonce) {
    try {
        // Derive wallet and private key
        const wallet = await generateWallet({
            secretKey: senderMnemonic,
            password: '',
        });
        const account = wallet.accounts[0];
        const senderKey = account.stxPrivateKey;

        console.log(`\n--- Tip from ${senderAddress.substring(0, 10)}... ---`);
        console.log(`Recipient: ${recipient}`);
        console.log(`Amount:    ${amount} uSTX (${(amount / 1_000_000).toFixed(6)} STX)`);
        console.log(`Fee:       ${feeForTip(amount)} uSTX (0.5%)`);
        console.log(`Total:     ${totalDeduction(amount)} uSTX`);
        console.log(`Message:   "${message}"`);

        // Build post conditions
        const postConditions = [tipPostCondition(senderAddress, amount)];

        const txOptions = {
            contractAddress: contract.address,
            contractName: contract.name,
            functionName: "send-tip",
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
            fee: 2000, // Set manual fee to avoid API call (0.002 STX)
            nonce: BigInt(nonce), // Use provided nonce to avoid API call
        };

        console.log("Creating transaction...");
        let transaction;
        try {
            transaction = await makeContractCall(txOptions);
            console.log("Transaction created:", typeof transaction, !!transaction);
            if (transaction) {
                console.log("Transaction has serialize?", typeof transaction.serialize);
            }
        } catch (txError) {
            console.error("makeContractCall error:", txError.message);
            console.error("Stack:", txError.stack);
            throw txError;
        }

        if (!transaction) {
            throw new Error("makeContractCall returned undefined");
        }

        if (typeof transaction.serialize !== 'function') {
            throw new Error(`Transaction object invalid: ${typeof transaction}, keys: ${Object.keys(transaction).join(', ')}`);
        }

        console.log("Broadcasting transaction...");
        if (isDryRun) {
            console.log("✓ Dry run — transaction built successfully");
            return { success: true, txid: 'DRY_RUN' };
        }

        const response = await broadcastTransaction({
            transaction,
            network
        });

        if (response.error) {
            console.error("✗ Broadcast Error:", response.error);
            if (response.reason) console.error("  Reason:", response.reason);
            return { success: false, error: response.error };
        } else {
            console.log("✓ Transaction broadcasted successfully!");
            console.log(`  TX ID: 0x${response.txid}`);
            return { success: true, txid: response.txid };
        }
    } catch (error) {
        // Print full error for debugging
        console.error("Full error:", error);

        // Sanitize error messages to prevent mnemonic leakage
        let safeMessage = (error.message || String(error));
        safeMessage = safeMessage.replace(/[0-9a-f]{64}/gi, '[REDACTED_KEY]');
        console.error("✗ Error:", safeMessage);
        return { success: false, error: safeMessage };
    }
}

async function runBatchTips() {
    console.log("=".repeat(60));
    console.log("Batch Tips to Wallet 1");
    console.log("=".repeat(60));

    // Configuration
    const numTips = parseInt(process.env.NUM_TIPS || '5', 10);
    const amount = parseInt(process.env.AMOUNT || '1000', 10);
    const message = process.env.MESSAGE || "Test tip to wallet 1";
    const isDryRun = process.env.DRY_RUN === '1';
    const networkName = process.env.NETWORK || 'devnet';

    // Validate configuration
    if (isNaN(amount) || amount < 1000) {
        console.error("Error: AMOUNT must be at least 1000 uSTX (0.001 STX).");
        process.exit(1);
    }

    if (isNaN(numTips) || numTips < 1) {
        console.error("Error: NUM_TIPS must be at least 1.");
        process.exit(1);
    }

    // Setup network and contract
    const network = networkName === 'mainnet' ? STACKS_MAINNET : STACKS_DEVNET;
    const contract = CONTRACTS[networkName];
    const wallets = WALLETS[networkName];
    const recipient = wallets.wallet_1.address;

    console.log(`Network:   ${networkName}`);
    console.log(`Contract:  ${contract.address}.${contract.name}`);
    console.log(`Target:    ${recipient} (wallet_1)`);
    console.log(`Tips:      ${numTips}`);
    console.log(`Amount:    ${amount} uSTX per tip`);
    console.log(`Mode:      ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log("=".repeat(60));

    // Get sender wallets (exclude wallet_1 to avoid self-tipping)
    const senderWallets = Object.entries(wallets)
        .filter(([key, _]) => key !== 'wallet_1')
        .slice(0, numTips);

    if (senderWallets.length < numTips) {
        console.warn(`Warning: Only ${senderWallets.length} sender wallets available.`);
    }

    // Send tips
    const results = [];

    // Fetch nonces for all sender wallets upfront
    console.log("\nFetching nonce values for all wallets...");
    const nonces = {};
    for (const [walletName, walletInfo] of senderWallets) {
        try {
            const nonce = await fetchNonce({ address: walletInfo.address, network });
            nonces[walletName] = Number(nonce);
            console.log(`  ${walletName}: nonce ${nonces[walletName]}`);
        } catch (e) {
            console.error(`  ${walletName}: failed to fetch nonce - ${e.message}`);
            nonces[walletName] = 0; // Fallback
        }
    }

    console.log("\nSending transactions...");

    for (let i = 0; i < Math.min(numTips, senderWallets.length); i++) {
        const [walletName, walletInfo] = senderWallets[i];
        console.log(`\nTip ${i + 1}/${Math.min(numTips, senderWallets.length)} - from ${walletName}`);

        const result = await sendTip(
            walletInfo.mnemonic,
            walletInfo.address,
            recipient,
            amount,
            `${message} #${i + 1}`,
            network,
            contract,
            isDryRun,
            nonces[walletName] // Use fetched nonce
        );

        results.push({ wallet: walletName, ...result });

        // Add delay between transactions to avoid nonce conflicts
        if (!isDryRun && i < numTips - 1) {
            console.log("Waiting 2 seconds before next transaction...");
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Total:      ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed:     ${failed}`);

    if (!isDryRun && successful > 0) {
        console.log("\nSuccessful transactions:");
        results.filter(r => r.success).forEach(r => {
            console.log(`  ${r.wallet}: 0x${r.txid}`);
        });
    }

    if (failed > 0) {
        console.log("\nFailed transactions:");
        results.filter(r => !r.success).forEach(r => {
            console.log(`  ${r.wallet}: ${r.error}`);
        });
    }

    console.log("=".repeat(60));
}

runBatchTips().catch(error => {
    console.error("Fatal error:", error.message);
    process.exit(1);
});
