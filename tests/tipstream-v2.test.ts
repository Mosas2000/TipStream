/**
 * TipStream V2 Contract Tests
 * 
 * Verifies V2-specific enhancements including emergency authorities, 
 * cooldown enforcement, and extended pause controls.
 */
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const DEFAULT_FEE_BPS = 50;
const MOCK_TIP_AMOUNT = 1_000_000;

const ERR_EMERGENCY_PAUSED = 107;
const ERR_COOLDOWN_ACTIVE = 109;
const ERR_NO_PROPOSAL = 110;
const ERR_UNAUTHORIZED = 111;

describe("TipStream V2 Contract Tests", () => {
    it("exposes the current fee basis points via read-only", () => {
        const { result } = simnet.callReadOnlyFn("tipstream-v2", "get-current-fee-basis-points", [], deployer);

        expect(result).toBeOk(Cl.uint(DEFAULT_FEE_BPS));
    });

    it("reports the v2 contract version", () => {
        const { result } = simnet.callReadOnlyFn("tipstream-v2", "get-contract-version", [], deployer);

        expect(result).toBeOk(
            Cl.tuple({
                version: Cl.uint(2),
                name: Cl.stringAscii("tipstream-core-v2"),
            }),
        );
    });

    it("allows the owner to configure an emergency authority", () => {
        const { result } = simnet.callPublicFn(
            "tipstream-v2",
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        expect(result).toBeOk(Cl.bool(true));

        const { result: storedAuthority } = simnet.callReadOnlyFn(
            "tipstream-v2",
            "get-emergency-authority",
            [],
            deployer,
        );

        expect(storedAuthority).toBeOk(Cl.some(Cl.principal(wallet1)));
    });

    it("rejects emergency pause from unauthorized principals", () => {
        simnet.callPublicFn(
            "tipstream-v2",
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        const { result } = simnet.callPublicFn("tipstream-v2", "emergency-pause", [], wallet2);

        expect(result).toBeErr(Cl.uint(ERR_UNAUTHORIZED));
    });

    it("pauses immediately through the emergency authority and enforces cooldown", () => {
        simnet.callPublicFn(
            "tipstream-v2",
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        const firstPause = simnet.callPublicFn("tipstream-v2", "emergency-pause", [], wallet1);
        expect(firstPause.result).toBeOk(Cl.bool(true));

        const { result: pausedTip } = simnet.callPublicFn(
            "tipstream-v2",
            "send-tip",
            [Cl.principal(wallet2), Cl.uint(MOCK_TIP_AMOUNT), Cl.stringUtf8("Emergency paused")],
            wallet2,
        );
        expect(pausedTip).toBeErr(Cl.uint(ERR_EMERGENCY_PAUSED));

        const secondPause = simnet.callPublicFn("tipstream-v2", "emergency-pause", [], wallet1);
        expect(secondPause.result).toBeErr(Cl.uint(ERR_COOLDOWN_ACTIVE));
        // Mine enough blocks to satisfy the emergency cooldown period.
        // This is a high-latency operation in the simnet.
        const COOLDOWN_PERIOD_BLOCKS = 2016;
        simnet.mineEmptyBlocks(COOLDOWN_PERIOD_BLOCKS);

        const thirdPause = simnet.callPublicFn("tipstream-v2", "emergency-pause", [], wallet1);
        expect(thirdPause.result).toBeOk(Cl.bool(true));

        const { result: lastPauseHeight } = simnet.callReadOnlyFn(
            "tipstream-v2",
            "get-last-emergency-pause",
            [],
            deployer,
        );

        expect(lastPauseHeight).toBeDefined();
    });

    it("supports canceling pending pause changes", () => {
        const propose = simnet.callPublicFn(
            "tipstream-v2",
            "propose-pause-change",
            [Cl.bool(true)],
            deployer,
        );
        expect(propose.result).toBeOk(Cl.bool(true));

        const cancel = simnet.callPublicFn("tipstream-v2", "cancel-pause-change", [], deployer);
        expect(cancel.result).toBeOk(Cl.bool(true));

        const execute = simnet.callPublicFn("tipstream-v2", "execute-pause-change", [], deployer);
        expect(execute.result).toBeErr(Cl.uint(ERR_NO_PROPOSAL));
    });
});
