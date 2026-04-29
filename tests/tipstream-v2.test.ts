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

const CONTRACT_NAME = "tipstream-v2";

/** Default fee basis points for the protocol */
const DEFAULT_FEE_BPS = 50;
/** Standard mock tip amount for positive test cases */
const MOCK_TIP_AMOUNT = 1_000_000;

/** Error code: Unauthorized access attempt */
const ERR_EMERGENCY_PAUSED = 107;
/** Error code: Cooldown period is still active */
const ERR_COOLDOWN_ACTIVE = 109;
/** Error code: No proposal found for the requested operation */
const ERR_NO_PROPOSAL = 110;
/** Error code: Action rejected by authority check */
const ERR_UNAUTHORIZED = 111;

describe("TipStream V2 Contract Tests", () => {
    it("exposes the current fee basis points via read-only", () => {
        const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-current-fee-basis-points", [], deployer);

        expect(result).toBeOk(Cl.uint(DEFAULT_FEE_BPS));
    });

    it("reports the v2 contract version", () => {
        const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-contract-version", [], deployer);

        expect(result).toBeOk(
            Cl.tuple({
                version: Cl.uint(2),
                name: Cl.stringAscii("tipstream-core-v2"),
            }),
        );
    });

    it("allows the owner to configure an emergency authority", () => {
        const { result } = simnet.callPublicFn(
            CONTRACT_NAME,
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        expect(result).toBeOk(Cl.bool(true));

        const { result: storedAuthority } = simnet.callReadOnlyFn(
            CONTRACT_NAME,
            "get-emergency-authority",
            [],
            deployer,
        );

        expect(storedAuthority).toBeOk(Cl.some(Cl.principal(wallet1)));
    });

    it("rejects emergency pause from unauthorized principals", () => {
        simnet.callPublicFn(
            CONTRACT_NAME,
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        const { result } = simnet.callPublicFn(CONTRACT_NAME, "emergency-pause", [], wallet2);

        expect(result).toBeErr(Cl.uint(ERR_UNAUTHORIZED));
    });

    it("pauses immediately through the emergency authority and enforces cooldown", () => {
        simnet.callPublicFn(
            CONTRACT_NAME,
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        const firstPause = simnet.callPublicFn(CONTRACT_NAME, "emergency-pause", [], wallet1);
        expect(firstPause.result).toBeOk(Cl.bool(true));

        const { result: pausedTip } = simnet.callPublicFn(
            CONTRACT_NAME,
            "send-tip",
            [Cl.principal(wallet2), Cl.uint(MOCK_TIP_AMOUNT), Cl.stringUtf8("Emergency paused")],
            wallet2,
        );
        expect(pausedTip).toBeErr(Cl.uint(ERR_EMERGENCY_PAUSED));

        const secondPause = simnet.callPublicFn(CONTRACT_NAME, "emergency-pause", [], wallet1);
        expect(secondPause.result).toBeErr(Cl.uint(ERR_COOLDOWN_ACTIVE));
        // Mine enough blocks to satisfy the emergency cooldown period.
        // This is a high-latency operation in the simnet.
        const COOLDOWN_PERIOD_BLOCKS = 2016;
        simnet.mineEmptyBlocks(COOLDOWN_PERIOD_BLOCKS);

        const thirdPause = simnet.callPublicFn(CONTRACT_NAME, "emergency-pause", [], wallet1);
        expect(thirdPause.result).toBeOk(Cl.bool(true));

        const { result: lastPauseHeight } = simnet.callReadOnlyFn(
            CONTRACT_NAME,
            "get-last-emergency-pause",
            [],
            deployer,
        );

        expect(lastPauseHeight).toBeDefined();
    });

    it("supports canceling pending pause changes", () => {
        const propose = simnet.callPublicFn(
            CONTRACT_NAME,
            "propose-pause-change",
            [Cl.bool(true)],
            deployer,
        );
        expect(propose.result).toBeOk(Cl.bool(true));

        const cancel = simnet.callPublicFn(CONTRACT_NAME, "cancel-pause-change", [], deployer);
        expect(cancel.result).toBeOk(Cl.bool(true));

        const execute = simnet.callPublicFn(CONTRACT_NAME, "execute-pause-change", [], deployer);
        expect(execute.result).toBeErr(Cl.uint(ERR_NO_PROPOSAL));
    });

    // Tests for get-is-paused read-only function
    // This function provides direct access to the contract pause state
    it("returns false for is-paused when contract is running", () => {
        const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-is-paused", [], deployer);

        expect(result).toBeOk(Cl.bool(false));
    });

    it("returns true for is-paused after emergency pause", () => {
        simnet.callPublicFn(
            CONTRACT_NAME,
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        simnet.callPublicFn(CONTRACT_NAME, "emergency-pause", [], wallet1);

        const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-is-paused", [], deployer);

        expect(result).toBeOk(Cl.bool(true));
    });

    it("returns true for is-paused after executing pause proposal", () => {
        simnet.callPublicFn(
            CONTRACT_NAME,
            "propose-pause-change",
            [Cl.bool(true)],
            deployer,
        );

        simnet.mineEmptyBlocks(144);

        simnet.callPublicFn(CONTRACT_NAME, "execute-pause-change", [], deployer);

        const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-is-paused", [], deployer);

        expect(result).toBeOk(Cl.bool(true));
    });

    it("returns false for is-paused after executing unpause proposal", () => {
        simnet.callPublicFn(
            CONTRACT_NAME,
            "set-emergency-authority",
            [Cl.some(Cl.principal(wallet1))],
            deployer,
        );

        simnet.callPublicFn(CONTRACT_NAME, "emergency-pause", [], wallet1);

        simnet.callPublicFn(
            CONTRACT_NAME,
            "propose-pause-change",
            [Cl.bool(false)],
            deployer,
        );

        simnet.mineEmptyBlocks(144);

        simnet.callPublicFn(CONTRACT_NAME, "execute-pause-change", [], deployer);

        const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-is-paused", [], deployer);

        expect(result).toBeOk(Cl.bool(false));
    });
});
