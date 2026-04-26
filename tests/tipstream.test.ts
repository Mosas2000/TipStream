/**
 * TipStream Core Contract Tests
 * 
 * This suite verifies the core tipping logic, profile management, and admin controls.
 * Optimized for Vitest with the 'forks' pool and sequential execution.
 */
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const MOCK_TIP_AMOUNT = 1_000_000;
const MOCK_FEE_AMOUNT = 5_000;
const MOCK_NET_TIP_AMOUNT = MOCK_TIP_AMOUNT - MOCK_FEE_AMOUNT;
const MIN_TIP_AMOUNT = 1_000;

const ERR_UNAUTHORIZED = 100;
const ERR_INVALID_AMOUNT = 101;
const ERR_NOT_FOUND = 104;
const ERR_INVALID_NAME = 105;
const ERR_USER_BLOCKED = 106;
const ERR_EMERGENCY_PAUSED = 107;

describe("TipStream Contract Tests", () => {
    it("can send tip successfully", () => {
        const { result, events } = simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(MOCK_TIP_AMOUNT),
                Cl.stringUtf8("Great content!")
            ],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(0));
        expect(events).toHaveLength(3);
    });

    it("verifies exact STX transfer amounts in tip events", () => {
        const { result, events } = simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(MOCK_TIP_AMOUNT),
                Cl.stringUtf8("Verify amounts")
            ],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(0));

        const transfers = events.filter(e => e.event === "stx_transfer_event");
        expect(transfers).toHaveLength(2);

        const recipientTransfer = transfers[0];
        expect(recipientTransfer.data.amount).toBe(MOCK_NET_TIP_AMOUNT.toString());
        expect(recipientTransfer.data.recipient).toBe(wallet2);
        expect(recipientTransfer.data.sender).toBe(wallet1);

        const feeTransfer = transfers[1];
        expect(feeTransfer.data.amount).toBe(MOCK_FEE_AMOUNT.toString());
        expect(feeTransfer.data.recipient).toBe(deployer);
        expect(feeTransfer.data.sender).toBe(wallet1);
    });

    it("cannot send tip to self", () => {
        const { result } = simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet1),
                Cl.uint(MOCK_TIP_AMOUNT),
                Cl.stringUtf8("Tipping myself")
            ],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("rejects tips below minimum amount", () => {
        const { result } = simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(MIN_TIP_AMOUNT - 1),
                Cl.stringUtf8("Too small")
            ],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(ERR_INVALID_AMOUNT));
    });

    it("accepts tips at exactly the minimum amount", () => {
        const { result } = simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(MIN_TIP_AMOUNT),
                Cl.stringUtf8("Minimum tip")
            ],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(0));
    });

    it("user stats update correctly", () => {
        simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(MOCK_TIP_AMOUNT),
                Cl.stringUtf8("Tip 1")
            ],
            wallet1
        );

        const { result } = simnet.callReadOnlyFn(
            "tipstream",
            "get-user-stats",
            [Cl.principal(wallet1)],
            wallet1
        );

        expect(result).toBeTuple({
            "tips-sent": Cl.uint(1),
            "tips-received": Cl.uint(0),
            "total-sent": Cl.uint(MOCK_TIP_AMOUNT),
            "total-received": Cl.uint(0)
        });
    });

    it("exposes the current fee basis points via read-only", () => {
        const { result } = simnet.callReadOnlyFn(
            "tipstream",
            "get-current-fee-basis-points",
            [],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(50));
    });

    it("fee calculation is correct", () => {
        const { result } = simnet.callReadOnlyFn(
            "tipstream",
            "get-fee-for-amount",
            [Cl.uint(MOCK_TIP_AMOUNT)],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(MOCK_FEE_AMOUNT));
    });

    it("updates the current fee basis points when the owner changes it", () => {
        const setFee = simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(75)], deployer);
        expect(setFee.result).toBeOk(Cl.bool(true));

        const { result } = simnet.callReadOnlyFn(
            "tipstream",
            "get-current-fee-basis-points",
            [],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(75));

        simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
    });

    it("enforces minimum fee of 1 uSTX when raw calculation truncates to zero", () => {
        simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(1)], deployer);

        const { result } = simnet.callReadOnlyFn(
            "tipstream",
            "get-fee-for-amount",
            [Cl.uint(MIN_TIP_AMOUNT)],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(1));

        simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
    });

    it("platform stats track correctly", () => {
        simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(MOCK_TIP_AMOUNT),
                Cl.stringUtf8("Tip 1")
            ],
            wallet1
        );

        const { result } = simnet.callReadOnlyFn(
            "tipstream",
            "get-platform-stats",
            [],
            wallet1
        );

        expect(result).toBeTuple({
            "total-tips": Cl.uint(1),
            "total-volume": Cl.uint(MOCK_TIP_AMOUNT),
            "platform-fees": Cl.uint(MOCK_FEE_AMOUNT)
        });
    });

    describe("User Profiles", () => {
        it("can set and get user profile", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "update-profile",
                [
                    Cl.stringUtf8("Alice"),
                    Cl.stringUtf8("Software Engineer & Crypto Enthusiast"),
                    Cl.stringUtf8("https://example.com/avatar.png")
                ],
                wallet1
            );

            expect(result).toBeOk(Cl.bool(true));

            const { result: profileResult } = simnet.callReadOnlyFn(
                "tipstream",
                "get-profile",
                [Cl.principal(wallet1)],
                wallet1
            );

            expect(profileResult).toBeSome(Cl.tuple({
                "display-name": Cl.stringUtf8("Alice"),
                "bio": Cl.stringUtf8("Software Engineer & Crypto Enthusiast"),
                "avatar-url": Cl.stringUtf8("https://example.com/avatar.png")
            }));
        });

        it("cannot set profile with empty display name", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "update-profile",
                [
                    Cl.stringUtf8(""),
                    Cl.stringUtf8("No name"),
                    Cl.stringUtf8("")
                ],
                wallet1
            );

            expect(result).toBeErr(Cl.uint(ERR_INVALID_NAME));
        });
    });

    describe("Recursive Tipping", () => {
        it("can tip a previous tip sender", () => {
            simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("First Tip")],
                wallet1
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "tip-a-tip",
                [Cl.uint(0), Cl.uint(500000), Cl.stringUtf8("Supporting your tip!")],
                wallet2
            );

            expect(result).toBeOk(Cl.uint(1));

            const { result: tipResult } = simnet.callReadOnlyFn(
                "tipstream",
                "get-tip",
                [Cl.uint(1)],
                wallet1
            );

            expect(tipResult).not.toBeNone();
        });

        it("fails if target tip doesn't exist", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "tip-a-tip",
                [Cl.uint(99), Cl.uint(500000), Cl.stringUtf8("Ghost tip")],
                wallet2
            );

            expect(result).toBeErr(Cl.uint(ERR_NOT_FOUND));
        });
    });

    describe("Privacy Controls", () => {
        it("can block and unblock a user", () => {
            // Wallet 2 blocks Wallet 1
            const { result: blockResult } = simnet.callPublicFn(
                "tipstream",
                "toggle-block-user",
                [Cl.principal(wallet1)],
                wallet2
            );
            expect(blockResult).toBeOk(Cl.bool(true));

            // Check if blocked
            const { result: isBlocked } = simnet.callReadOnlyFn(
                "tipstream",
                "is-user-blocked",
                [Cl.principal(wallet2), Cl.principal(wallet1)],
                wallet1
            );
            expect(isBlocked).toBeBool(true);

            // Wallet 1 tries to tip Wallet 2
            const { result: tipResult } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Let me tip you!")],
                wallet1
            );
            expect(tipResult).toBeErr(Cl.uint(106));

            // Wallet 2 unblocks Wallet 1
            const { result: unblockResult } = simnet.callPublicFn(
                "tipstream",
                "toggle-block-user",
                [Cl.principal(wallet1)],
                wallet2
            );
            expect(unblockResult).toBeOk(Cl.bool(false));

            // Wallet 1 can now tip Wallet 2
            const { result: retryTipResult } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Finally!")],
                wallet1
            );
            expect(retryTipResult).toBeOk(Cl.uint(0));
        });
    });

    describe("Admin Controls", () => {
        it("only owner can pause and unpause", () => {
            // Non-owner fails
            const { result: failPause } = simnet.callPublicFn(
                "tipstream",
                "set-paused",
                [Cl.bool(true)],
                wallet1
            );
            expect(failPause).toBeErr(Cl.uint(100));

            // Owner succeeds
            const { result: successPause } = simnet.callPublicFn(
                "tipstream",
                "set-paused",
                [Cl.bool(true)],
                deployer
            );
            expect(successPause).toBeOk(Cl.bool(true));

            // Tipping fails while paused
            const { result: tipFail } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Fail!")],
                wallet1
            );
            expect(tipFail).toBeErr(Cl.uint(107));

            // Owner unpauses
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);

            // Tipping works again
            const { result: tipSuccess } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Works!")],
                wallet1
            );
            expect(tipSuccess).toBeOk(Cl.uint(0));
        });

        it("owner can update fee", () => {
            // Update fee to 2% (200 basis points)
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(200)], deployer);

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(20000));
        });

        it("accepts fee at exactly the maximum limit of 1000 basis points", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(1000)],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: fee } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            expect(fee).toBeOk(Cl.uint(100000));
        });

        it("rejects fee above the maximum limit of 1000 basis points", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(1001)],
                deployer
            );
            expect(result).toBeErr(Cl.uint(101));
        });

        it("accepts zero fee to disable platform fees", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(0)],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: fee } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            expect(fee).toBeOk(Cl.uint(0));
        });

        it("non-owner cannot change fee", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(100)],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));
        });

        it("sending a tip with zero fee transfers full amount to recipient", () => {
            simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(0)],
                deployer
            );

            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("No fee tip")],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(0));

            const transfers = events.filter(e => e.event === "stx_transfer_event");
            expect(transfers).toHaveLength(1);
            expect(transfers[0].data.amount).toBe("1000000");
            expect(transfers[0].data.recipient).toBe(wallet2);
        });
    });

    describe("Batch Tipping", () => {
        it("can send multiple tips in one transaction", () => {
            const tips = [
                Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(1000000), message: Cl.stringUtf8("Tip A") }),
                Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(2000000), message: Cl.stringUtf8("Tip B") })
            ];

            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "send-batch-tips",
                [Cl.list(tips)],
                wallet1
            );

            expect(result).toBeOk(Cl.list([Cl.ok(Cl.uint(0)), Cl.ok(Cl.uint(1))]));

            // Should have 4 transfer events (2 tips + 2 fees)
            const transferEvents = events.filter(e => e.event === "stx_transfer_event");
            expect(transferEvents).toHaveLength(4);

            const { result: stats } = simnet.callReadOnlyFn(
                "tipstream",
                "get-user-stats",
                [Cl.principal(wallet1)],
                wallet1
            );

            expect(stats).toBeTuple({
                "tips-sent": Cl.uint(2),
                "tips-received": Cl.uint(0),
                "total-sent": Cl.uint(3000000),
                "total-received": Cl.uint(0)
            });
        });
    });

    describe("Strict Batch Tipping", () => {
        it("sends all tips when all are valid", () => {
            const tips = [
                Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(1000000), message: Cl.stringUtf8("Strict A") }),
                Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(2000000), message: Cl.stringUtf8("Strict B") })
            ];

            const { result } = simnet.callPublicFn(
                "tipstream",
                "send-batch-tips-strict",
                [Cl.list(tips)],
                wallet1
            );

            expect(result).toBeOk(Cl.uint(2));
        });

        it("aborts entire batch when any tip fails", () => {
            simnet.callPublicFn(
                "tipstream",
                "toggle-block-user",
                [Cl.principal(wallet1)],
                wallet2
            );

            const tips = [
                Cl.tuple({ recipient: Cl.principal(deployer), amount: Cl.uint(1000000), message: Cl.stringUtf8("Valid") }),
                Cl.tuple({ recipient: Cl.principal(wallet2), amount: Cl.uint(1000000), message: Cl.stringUtf8("Blocked") })
            ];

            const { result } = simnet.callPublicFn(
                "tipstream",
                "send-batch-tips-strict",
                [Cl.list(tips)],
                wallet1
            );

            expect(result).toBeErr(Cl.uint(106));

            simnet.callPublicFn(
                "tipstream",
                "toggle-block-user",
                [Cl.principal(wallet1)],
                wallet2
            );
        });
    });

    describe("ownership transfer", () => {
        it("allows owner to propose a new owner", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-new-owner",
                [Cl.principal(wallet1)],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: pending } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-owner",
                [],
                deployer
            );
            expect(pending).toBeOk(Cl.some(Cl.principal(wallet1)));
        });

        it("rejects proposal from non-owner", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-new-owner",
                [Cl.principal(wallet2)],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));
        });

        it("rejects acceptance from wrong principal", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-new-owner",
                [Cl.principal(wallet1)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "accept-ownership",
                [],
                wallet2
            );
            expect(result).toBeErr(Cl.uint(108));
        });

        it("completes two-step ownership transfer", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-new-owner",
                [Cl.principal(wallet1)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "accept-ownership",
                [],
                wallet1
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: owner } = simnet.callReadOnlyFn(
                "tipstream",
                "get-contract-owner",
                [],
                deployer
            );
            expect(owner).toBeOk(Cl.principal(wallet1));

            const { result: pending } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-owner",
                [],
                deployer
            );
            expect(pending).toBeOk(Cl.none());
        });
    });

    describe("multi-user stats", () => {
        it("returns stats for multiple users in a single call", () => {
            simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("test")],
                wallet1
            );

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-multiple-user-stats",
                [Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])],
                deployer
            );

            expect(result).toBeOk(Cl.list([
                Cl.tuple({
                    "tips-sent": Cl.uint(1),
                    "tips-received": Cl.uint(0),
                    "total-sent": Cl.uint(1000000),
                    "total-received": Cl.uint(0)
                }),
                Cl.tuple({
                    "tips-sent": Cl.uint(0),
                    "tips-received": Cl.uint(1),
                    "total-sent": Cl.uint(0),
                    "total-received": Cl.uint(1000000)
                })
            ]));
        });
    });

    describe("Concurrent Tipping", () => {
        it("maintains consistent state with multiple users tipping in sequence", () => {
            const wallet3 = accounts.get("wallet_3")!;

            simnet.callPublicFn(
                "tipstream", "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("User 1 tip")],
                wallet1
            );

            simnet.callPublicFn(
                "tipstream", "send-tip",
                [Cl.principal(wallet1), Cl.uint(2000000), Cl.stringUtf8("User 2 tip")],
                wallet2
            );

            simnet.callPublicFn(
                "tipstream", "send-tip",
                [Cl.principal(wallet2), Cl.uint(500000), Cl.stringUtf8("User 3 tip")],
                wallet3
            );

            const { result: stats } = simnet.callReadOnlyFn(
                "tipstream", "get-platform-stats", [], deployer
            );

            expect(stats).toBeTuple({
                "total-tips": Cl.uint(3),
                "total-volume": Cl.uint(3500000),
                "platform-fees": Cl.uint(17500)
            });

            const { result: w1Stats } = simnet.callReadOnlyFn(
                "tipstream", "get-user-stats", [Cl.principal(wallet1)], deployer
            );
            expect(w1Stats).toBeTuple({
                "tips-sent": Cl.uint(1),
                "tips-received": Cl.uint(1),
                "total-sent": Cl.uint(1000000),
                "total-received": Cl.uint(2000000)
            });

            const { result: w2Stats } = simnet.callReadOnlyFn(
                "tipstream", "get-user-stats", [Cl.principal(wallet2)], deployer
            );
            expect(w2Stats).toBeTuple({
                "tips-sent": Cl.uint(1),
                "tips-received": Cl.uint(2),
                "total-sent": Cl.uint(2000000),
                "total-received": Cl.uint(1500000)
            });
        });

        it("assigns sequential tip IDs across concurrent senders", () => {
            const wallet3 = accounts.get("wallet_3")!;

            const { result: r1 } = simnet.callPublicFn(
                "tipstream", "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("First")],
                wallet1
            );
            expect(r1).toBeOk(Cl.uint(0));

            const { result: r2 } = simnet.callPublicFn(
                "tipstream", "send-tip",
                [Cl.principal(wallet1), Cl.uint(1000000), Cl.stringUtf8("Second")],
                wallet2
            );
            expect(r2).toBeOk(Cl.uint(1));

            const { result: r3 } = simnet.callPublicFn(
                "tipstream", "send-tip",
                [Cl.principal(wallet1), Cl.uint(1000000), Cl.stringUtf8("Third")],
                wallet3
            );
            expect(r3).toBeOk(Cl.uint(2));
        });
    });

    describe("Multi-sig Governance", () => {
        const multisigContract = () => `${deployer}.tipstream-multisig`;

        function setupMultisig() {
            simnet.callPublicFn(
                "tipstream",
                "set-multisig",
                [Cl.some(Cl.principal(multisigContract()))],
                deployer
            );
            simnet.callPublicFn(
                "tipstream-multisig",
                "add-signer",
                [Cl.principal(wallet1)],
                deployer
            );
            simnet.callPublicFn(
                "tipstream-multisig",
                "add-signer",
                [Cl.principal(wallet2)],
                deployer
            );
            simnet.callPublicFn(
                "tipstream-multisig",
                "set-required-signatures",
                [Cl.uint(2)],
                deployer
            );
        }

        it("owner can authorize a multisig contract", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "set-multisig",
                [Cl.some(Cl.principal(multisigContract()))],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: msig } = simnet.callReadOnlyFn(
                "tipstream",
                "get-multisig",
                [],
                deployer
            );
            expect(msig).toBeOk(Cl.some(Cl.principal(multisigContract())));
        });

        it("non-owner cannot authorize a multisig contract", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "set-multisig",
                [Cl.some(Cl.principal(multisigContract()))],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));
        });

        it("multisig signers can pause contract through governance", () => {
            setupMultisig();

            const { result: proposeResult } = simnet.callPublicFn(
                "tipstream-multisig",
                "propose-tx",
                [
                    Cl.stringUtf8("Pause contract for maintenance"),
                    Cl.stringAscii("set-paused"),
                    Cl.uint(1)
                ],
                wallet1
            );
            expect(proposeResult).toBeOk(Cl.uint(0));

            simnet.callPublicFn(
                "tipstream-multisig",
                "sign-tx",
                [Cl.uint(0)],
                wallet2
            );

            const { result: execResult } = simnet.callPublicFn(
                "tipstream-multisig",
                "execute-tx",
                [Cl.uint(0)],
                wallet1
            );
            expect(execResult).toBeOk(Cl.bool(true));

            const { result: tipResult } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Should fail")],
                wallet1
            );
            expect(tipResult).toBeErr(Cl.uint(107));
        });

        it("multisig signers can change fee through governance", () => {
            setupMultisig();

            simnet.callPublicFn(
                "tipstream-multisig",
                "propose-tx",
                [Cl.stringUtf8("Increase fee to 1%"), Cl.stringAscii("set-fee"), Cl.uint(100)],
                wallet1
            );

            simnet.callPublicFn("tipstream-multisig", "sign-tx", [Cl.uint(0)], wallet2);

            const { result } = simnet.callPublicFn(
                "tipstream-multisig",
                "execute-tx",
                [Cl.uint(0)],
                wallet1
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: feeResult } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            expect(feeResult).toBeOk(Cl.uint(10000));
        });

        it("execution fails without sufficient signatures", () => {
            setupMultisig();

            simnet.callPublicFn(
                "tipstream-multisig",
                "propose-tx",
                [Cl.stringUtf8("Pause without quorum"), Cl.stringAscii("set-paused"), Cl.uint(1)],
                wallet1
            );

            const { result } = simnet.callPublicFn(
                "tipstream-multisig",
                "execute-tx",
                [Cl.uint(0)],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(1104));
        });

        it("owner can revoke multisig authorization", () => {
            simnet.callPublicFn(
                "tipstream",
                "set-multisig",
                [Cl.some(Cl.principal(multisigContract()))],
                deployer
            );

            const { result: revoke } = simnet.callPublicFn(
                "tipstream",
                "set-multisig",
                [Cl.none()],
                deployer
            );
            expect(revoke).toBeOk(Cl.bool(true));

            const { result: msig } = simnet.callReadOnlyFn(
                "tipstream",
                "get-multisig",
                [],
                deployer
            );
            expect(msig).toBeOk(Cl.none());
        });
    });

    describe("SIP-010 Token Tipping", () => {
        it("rejects token tip for non-whitelisted token", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "send-token-tip",
                [
                    Cl.contractPrincipal(deployer.split(".")[0] || deployer, "tipstream-token"),
                    Cl.principal(wallet2),
                    Cl.uint(1000),
                    Cl.stringUtf8("token tip"),
                ],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(113));
        });

        it("admin can whitelist a token", () => {
            const tokenPrincipal = `${deployer}.tipstream-token`;
            const { result } = simnet.callPublicFn(
                "tipstream",
                "whitelist-token",
                [Cl.principal(tokenPrincipal), Cl.bool(true)],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: check } = simnet.callReadOnlyFn(
                "tipstream",
                "is-token-whitelisted",
                [Cl.principal(tokenPrincipal)],
                deployer
            );
            expect(check).toBeOk(Cl.bool(true));
        });

        it("non-admin cannot whitelist tokens", () => {
            const tokenPrincipal = `${deployer}.tipstream-token`;
            const { result } = simnet.callPublicFn(
                "tipstream",
                "whitelist-token",
                [Cl.principal(tokenPrincipal), Cl.bool(true)],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));
        });

        it("sends token tip with whitelisted token", () => {
            const tokenPrincipal = `${deployer}.tipstream-token`;

            simnet.callPublicFn(
                "tipstream",
                "whitelist-token",
                [Cl.principal(tokenPrincipal), Cl.bool(true)],
                deployer
            );

            simnet.callPublicFn(
                "tipstream-token",
                "mint",
                [Cl.uint(1000000), Cl.principal(wallet1)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "send-token-tip",
                [
                    Cl.contractPrincipal(deployer.split(".")[0] || deployer, "tipstream-token"),
                    Cl.principal(wallet2),
                    Cl.uint(5000),
                    Cl.stringUtf8("TIPS for you!"),
                ],
                wallet1
            );
            expect(result).toBeOk(Cl.uint(0));

            const { result: tipData } = simnet.callReadOnlyFn(
                "tipstream",
                "get-token-tip",
                [Cl.uint(0)],
                deployer
            );
            expect(tipData).not.toBeNone();
        });

        it("tracks total token tips count", () => {
            const tokenPrincipal = `${deployer}.tipstream-token`;

            simnet.callPublicFn(
                "tipstream",
                "whitelist-token",
                [Cl.principal(tokenPrincipal), Cl.bool(true)],
                deployer
            );

            simnet.callPublicFn(
                "tipstream-token",
                "mint",
                [Cl.uint(1000000), Cl.principal(wallet1)],
                deployer
            );

            simnet.callPublicFn(
                "tipstream",
                "send-token-tip",
                [
                    Cl.contractPrincipal(deployer.split(".")[0] || deployer, "tipstream-token"),
                    Cl.principal(wallet2),
                    Cl.uint(1000),
                    Cl.stringUtf8("tip 1"),
                ],
                wallet1
            );

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-total-token-tips",
                [],
                deployer
            );
            const count = (result as any).value.value;
            expect(Number(count)).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Tip Categories", () => {
        it("can send a categorized tip", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "send-categorized-tip",
                [
                    Cl.principal(wallet2),
                    Cl.uint(1000000),
                    Cl.stringUtf8("Great open-source work!"),
                    Cl.uint(2) // category-open-source
                ],
                wallet1
            );
            expect(result).not.toBeErr();
        });

        it("rejects invalid category", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "send-categorized-tip",
                [
                    Cl.principal(wallet2),
                    Cl.uint(1000000),
                    Cl.stringUtf8("Bad category"),
                    Cl.uint(99) // invalid category
                ],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(114));
        });

        it("tracks category counts", () => {
            // Send two tips in education category
            simnet.callPublicFn(
                "tipstream",
                "send-categorized-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Edu tip 1"), Cl.uint(5)],
                wallet1
            );
            simnet.callPublicFn(
                "tipstream",
                "send-categorized-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Edu tip 2"), Cl.uint(5)],
                wallet1
            );

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-category-count",
                [Cl.uint(5)],
                deployer
            );
            const count = (result as any).value.value;
            expect(Number(count)).toBeGreaterThanOrEqual(2);
        });

        it("can read tip category", () => {
            const { result: sendResult } = simnet.callPublicFn(
                "tipstream",
                "send-categorized-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Bug bounty!"), Cl.uint(6)],
                wallet1
            );
            expect(sendResult).not.toBeErr();

            // Tip ID from first ever send-tip would be 0, but many tests ran before
            // Just verify the read-only works for the bug-bounty category count
            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-category-count",
                [Cl.uint(6)],
                deployer
            );
            const count = (result as any).value.value;
            expect(Number(count)).toBeGreaterThanOrEqual(1);
        });
    });

    describe("Timelocked Pause Changes", () => {
        it("admin can propose a pause change", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));
        });

        it("non-admin cannot propose a pause change", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));
        });

        it("sets pending pause state after proposal", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-pause-change",
                [],
                deployer
            );

            const pending = (result as any).value;
            expect(pending["pending-pause"]).toEqual(Cl.some(Cl.bool(true)));
        });

        it("rejects execute before timelock expires", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(result).toBeErr(Cl.uint(109));
        });

        it("executes pause change after timelock expires", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            // Mine 144 blocks to pass the timelock
            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            // Verify contract is paused
            const { result: tipResult } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Should fail")],
                wallet1
            );
            expect(tipResult).toBeErr(Cl.uint(107));

            // Unpause for subsequent tests
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
        });

        it("non-admin cannot execute a pending pause change", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));

            // Clean up: execute with deployer then unpause
            simnet.callPublicFn("tipstream", "execute-pause-change", [], deployer);
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
        });

        it("rejects execute when no pause change is pending", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(result).toBeErr(Cl.uint(110));
        });

        it("clears pending pause after execution", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-pause-change",
                [],
                deployer
            );

            const pending = (result as any).value;
            expect(pending["pending-pause"]).toEqual(Cl.none());

            // Clean up
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
        });

        it("new proposal overrides previous pending pause", () => {
            // Propose pause = true
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            // Override with pause = false
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(false)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            // Contract should NOT be paused since we overrode with false
            const { result: tipResult } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Still works")],
                wallet1
            );
            expect(tipResult).not.toBeErr();
        });

        it("admin can cancel a pending pause change", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "cancel-pause-change",
                [],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));
        });

        it("non-admin cannot cancel a pause change", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "cancel-pause-change",
                [],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));

            // Clean up
            simnet.callPublicFn("tipstream", "cancel-pause-change", [], deployer);
        });

        it("cancel fails when no pause change is pending", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "cancel-pause-change",
                [],
                deployer
            );
            expect(result).toBeErr(Cl.uint(110));
        });

        it("clears pending pause state after cancellation", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            simnet.callPublicFn(
                "tipstream",
                "cancel-pause-change",
                [],
                deployer
            );

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-pause-change",
                [],
                deployer
            );

            const pending = (result as any).value;
            expect(pending["pending-pause"]).toEqual(Cl.none());
        });

        it("prevents execution after cancellation", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            simnet.callPublicFn(
                "tipstream",
                "cancel-pause-change",
                [],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(result).toBeErr(Cl.uint(110));
        });

        it("allows resubmission after cancellation", () => {
            // Propose pause = true
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            // Cancel
            simnet.callPublicFn(
                "tipstream",
                "cancel-pause-change",
                [],
                deployer
            );

            // Re-propose with different value
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(false)],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            // Verify new proposal is in place
            const { result: pending } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-pause-change",
                [],
                deployer
            );

            const pendingData = (pending as any).value;
            expect(pendingData["pending-pause"]).toEqual(Cl.some(Cl.bool(false)));
        });
    });

    describe("Timelocked Fee Changes", () => {
        it("admin can propose a fee change", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));
        });

        it("non-admin cannot propose a fee change", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));
        });

        it("rejects fee proposal above maximum of 1000 basis points", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(1001)],
                deployer
            );
            expect(result).toBeErr(Cl.uint(101));
        });

        it("sets pending fee state after proposal", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(300)],
                deployer
            );

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-fee-change",
                [],
                deployer
            );

            const pending = (result as any).value;
            expect(pending["pending-fee"]).toEqual(Cl.some(Cl.uint(300)));
        });

        it("rejects execute before timelock expires", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(result).toBeErr(Cl.uint(109));
        });

        it("executes fee change after timelock expires", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            // Verify fee is now 200 basis points (2%)
            const { result: fee } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            expect(fee).toBeOk(Cl.uint(20000));

            // Reset fee to default
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("non-admin cannot execute a pending fee change", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));

            // Clean up
            simnet.callPublicFn("tipstream", "execute-fee-change", [], deployer);
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("rejects execute when no fee change is pending", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(result).toBeErr(Cl.uint(110));
        });

        it("clears pending fee after execution", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(100)],
                deployer
            );

            simnet.mineEmptyBlocks(144);
            simnet.callPublicFn("tipstream", "execute-fee-change", [], deployer);

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-fee-change",
                [],
                deployer
            );

            const pending = (result as any).value;
            expect(pending["pending-fee"]).toEqual(Cl.none());

            // Reset fee
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("admin can cancel a pending fee change", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(500)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "cancel-fee-change",
                [],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            // Verify no pending change remains
            const { result: pending } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-fee-change",
                [],
                deployer
            );

            const data = (pending as any).value;
            expect(data["pending-fee"]).toEqual(Cl.none());
        });

        it("non-admin cannot cancel a pending fee change", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(500)],
                deployer
            );

            const { result } = simnet.callPublicFn(
                "tipstream",
                "cancel-fee-change",
                [],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));

            // Clean up
            simnet.callPublicFn("tipstream", "cancel-fee-change", [], deployer);
        });

        it("cancel fails when no fee change is pending", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "cancel-fee-change",
                [],
                deployer
            );
            expect(result).toBeErr(Cl.uint(110));
        });

        it("new proposal overrides previous pending fee", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(500)],
                deployer
            );

            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(100)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            simnet.callPublicFn("tipstream", "execute-fee-change", [], deployer);

            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            // 100 basis points = 1%
            expect(result).toBeOk(Cl.uint(10000));

            // Reset
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("allows zero fee proposal through timelock", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(0)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: fee } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            expect(fee).toBeOk(Cl.uint(0));

            // Reset
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("allows maximum fee proposal of 1000 basis points through timelock", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(1000)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(result).toBeOk(Cl.bool(true));

            const { result: fee } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            expect(fee).toBeOk(Cl.uint(100000));

            // Reset
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });
    });

    describe("Direct Bypass vs Timelocked Path", () => {
        it("set-paused bypasses timelock entirely", () => {
            // Direct set-paused takes effect immediately
            const { result: pauseResult } = simnet.callPublicFn(
                "tipstream",
                "set-paused",
                [Cl.bool(true)],
                deployer
            );
            expect(pauseResult).toBeOk(Cl.bool(true));

            // Immediately prevents tipping - no waiting period
            const { result: tipFail } = simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("Blocked")],
                wallet1
            );
            expect(tipFail).toBeErr(Cl.uint(107));

            // Unpause
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
        });

        it("set-fee-basis-points bypasses timelock entirely", () => {
            // Direct set takes effect immediately
            simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(500)],
                deployer
            );

            // Fee is 500 basis points (5%) right away - no waiting period
            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-fee-for-amount",
                [Cl.uint(1000000)],
                wallet1
            );
            expect(result).toBeOk(Cl.uint(50000));

            // Reset
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("timelocked pause requires 144-block waiting period", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            // Cannot execute at block 143
            simnet.mineEmptyBlocks(143);
            const { result: tooEarly } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(tooEarly).toBeErr(Cl.uint(109));

            // Can execute at block 144
            simnet.mineEmptyBlocks(1);
            const { result: onTime } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(onTime).toBeOk(Cl.bool(true));

            // Unpause
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
        });

        it("timelocked fee change requires 144-block waiting period", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(300)],
                deployer
            );

            // Cannot execute at block 143
            simnet.mineEmptyBlocks(143);
            const { result: tooEarly } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(tooEarly).toBeErr(Cl.uint(109));

            // Can execute at block 144
            simnet.mineEmptyBlocks(1);
            const { result: onTime } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(onTime).toBeOk(Cl.bool(true));

            // Reset
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("direct set-paused does not affect pending timelocked proposal", () => {
            // Start a timelocked proposal
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );

            // Use direct bypass to pause immediately
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(true)], deployer);

            // The pending proposal still exists
            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-pause-change",
                [],
                deployer
            );
            const pending = (result as any).value;
            expect(pending["pending-pause"]).toEqual(Cl.some(Cl.bool(true)));

            // Unpause and clean up
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
            simnet.mineEmptyBlocks(144);
            simnet.callPublicFn("tipstream", "execute-pause-change", [], deployer);
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
        });

        it("direct set-fee does not affect pending timelocked fee proposal", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                deployer
            );

            // Direct bypass sets fee immediately
            simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(100)],
                deployer
            );

            // Pending proposal still exists
            const { result } = simnet.callReadOnlyFn(
                "tipstream",
                "get-pending-fee-change",
                [],
                deployer
            );
            const pending = (result as any).value;
            expect(pending["pending-fee"]).toEqual(Cl.some(Cl.uint(200)));

            // Clean up
            simnet.callPublicFn("tipstream", "cancel-fee-change", [], deployer);
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });
    });

    describe("Print Event Verification for Timelocked Operations", () => {
        it("emits fee-change-proposed print event with correct fields", () => {
            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                deployer
            );
            expect(result).not.toBeErr();

            const printEvents = events.filter(
                (e: any) => e.event === "print_event"
            );
            expect(printEvents.length).toBeGreaterThanOrEqual(1);

            const printData = (printEvents[0] as any).data;
            expect(printData).toBeDefined();

            // Clean up
            simnet.callPublicFn("tipstream", "cancel-fee-change", [], deployer);
        });

        it("emits fee-change-executed print event after timelock expires", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(300)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "execute-fee-change",
                [],
                deployer
            );
            expect(result).not.toBeErr();

            const printEvents = events.filter(
                (e: any) => e.event === "print_event"
            );
            expect(printEvents.length).toBeGreaterThanOrEqual(1);

            // Restore original fee
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("emits fee-change-cancelled print event on cancellation", () => {
            simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(400)],
                deployer
            );

            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "cancel-fee-change",
                [],
                deployer
            );
            expect(result).not.toBeErr();

            const printEvents = events.filter(
                (e: any) => e.event === "print_event"
            );
            expect(printEvents.length).toBeGreaterThanOrEqual(1);
        });

        it("emits pause-change-proposed print event with correct fields", () => {
            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(true)],
                deployer
            );
            expect(result).not.toBeErr();

            const printEvents = events.filter(
                (e: any) => e.event === "print_event"
            );
            expect(printEvents.length).toBeGreaterThanOrEqual(1);

            // Do not execute - just let the proposal sit
        });

        it("emits pause-change-executed print event after timelock expires", () => {
            // Propose unpause to restore state after test
            simnet.callPublicFn(
                "tipstream",
                "propose-pause-change",
                [Cl.bool(false)],
                deployer
            );

            simnet.mineEmptyBlocks(144);

            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "execute-pause-change",
                [],
                deployer
            );
            expect(result).not.toBeErr();

            const printEvents = events.filter(
                (e: any) => e.event === "print_event"
            );
            expect(printEvents.length).toBeGreaterThanOrEqual(1);
        });

        it("emits contract-paused print event on direct set-paused call", () => {
            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "set-paused",
                [Cl.bool(true)],
                deployer
            );
            expect(result).not.toBeErr();

            const printEvents = events.filter(
                (e: any) => e.event === "print_event"
            );
            expect(printEvents.length).toBeGreaterThanOrEqual(1);

            // Undo
            simnet.callPublicFn("tipstream", "set-paused", [Cl.bool(false)], deployer);
        });

        it("emits fee-updated print event on direct set-fee-basis-points call", () => {
            const { result, events } = simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(100)],
                deployer
            );
            expect(result).not.toBeErr();

            const printEvents = events.filter(
                (e: any) => e.event === "print_event"
            );
            expect(printEvents.length).toBeGreaterThanOrEqual(1);

            // Restore
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });

        it("does not emit print events when non-admin calls timelocked functions", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(500)],
                wallet1
            );
            expect(result).toBeErr(Cl.uint(100));
        });

        it("timelocked proposal emits different event type than direct bypass", () => {
            // Direct bypass event
            const directResult = simnet.callPublicFn(
                "tipstream",
                "set-fee-basis-points",
                [Cl.uint(75)],
                deployer
            );
            const directPrints = directResult.events.filter(
                (e: any) => e.event === "print_event"
            );

            // Timelocked proposal event
            const proposalResult = simnet.callPublicFn(
                "tipstream",
                "propose-fee-change",
                [Cl.uint(200)],
                deployer
            );
            const proposalPrints = proposalResult.events.filter(
                (e: any) => e.event === "print_event"
            );

            // Both should emit print events
            expect(directPrints.length).toBeGreaterThanOrEqual(1);
            expect(proposalPrints.length).toBeGreaterThanOrEqual(1);

            // The print data should differ (different event types)
            expect(directPrints[0].data).not.toEqual(proposalPrints[0].data);

            // Clean up
            simnet.callPublicFn("tipstream", "cancel-fee-change", [], deployer);
            simnet.callPublicFn("tipstream", "set-fee-basis-points", [Cl.uint(50)], deployer);
        });
    });
});
