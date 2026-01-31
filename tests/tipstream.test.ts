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
});
