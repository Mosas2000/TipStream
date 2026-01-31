import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("TipStream Contract Tests", () => {
    it("can send tip successfully", () => {
        const { result, events } = simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(1000000),
                Cl.stringUtf8("Great content!")
            ],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(0));
        expect(events).toHaveLength(2);
    });

    it("cannot send tip to self", () => {
        const { result } = simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet1),
                Cl.uint(1000000),
                Cl.stringUtf8("Tipping myself")
            ],
            wallet1
        );

        expect(result).toBeErr(Cl.uint(101));
    });

    it("user stats update correctly", () => {
        simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(1000000),
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
            "total-sent": Cl.uint(1000000),
            "total-received": Cl.uint(0)
        });
    });

    it("fee calculation is correct", () => {
        const { result } = simnet.callReadOnlyFn(
            "tipstream",
            "get-fee-for-amount",
            [Cl.uint(1000000)],
            wallet1
        );

        expect(result).toBeOk(Cl.uint(5000));
    });

    it("platform stats track correctly", () => {
        simnet.callPublicFn(
            "tipstream",
            "send-tip",
            [
                Cl.principal(wallet2),
                Cl.uint(1000000),
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
            "total-volume": Cl.uint(1000000),
            "platform-fees": Cl.uint(5000)
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

            expect(result).toBeErr(Cl.uint(105));
        });
    });

    describe("Recursive Tipping", () => {
        it("can tip a previous tip sender", () => {
            // Wallet 1 tips Wallet 2
            simnet.callPublicFn(
                "tipstream",
                "send-tip",
                [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("First Tip")],
                wallet1
            );

            // Wallet 2 tips back Wallet 1 for their generous tip (tip-id 0)
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

            expect(tipResult).toBeSome(Cl.tuple({
                sender: Cl.principal(wallet2),
                recipient: Cl.principal(wallet1),
                amount: Cl.uint(500000),
                message: Cl.stringUtf8("Supporting your tip!"),
                "tip-height": Cl.uint(simnet.blockHeight)
            }));
        });

        it("fails if target tip doesn't exist", () => {
            const { result } = simnet.callPublicFn(
                "tipstream",
                "tip-a-tip",
                [Cl.uint(99), Cl.uint(500000), Cl.stringUtf8("Ghost tip")],
                wallet2
            );

            expect(result).toBeErr(Cl.uint(104));
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
});
