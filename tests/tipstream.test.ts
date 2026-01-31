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
});
