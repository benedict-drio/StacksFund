import { describe, expect, it, beforeEach } from "vitest";
import { simnet } from "simnet";

const accounts = simnet.getAccounts();
const owner = accounts.get("wallet_1")!;
const alice = accounts.get("wallet_2")!;
const bob = accounts.get("wallet_3")!;
const carol = accounts.get("wallet_4")!;

describe("StacksFund Full Test Suite", () => {
  beforeEach(async () => {
    // Initialize contract before each test
    await simnet.txCall("StacksFund", "initialize", [], owner);
  });

  it("ensures simnet is well initialized", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it("handles deposits, withdrawals, and rewards", async () => {
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);
    await simnet.txCall("StacksFund", "deposit", [`u2000000`], bob);

    simnet.mineBlocks(10);

    const { result: aliceRewards } = await simnet.txCall(
      "StacksFund",
      "claim-rewards",
      [],
      alice
    );
    const { result: bobRewards } = await simnet.txCall(
      "StacksFund",
      "claim-rewards",
      [],
      bob
    );

    expect(aliceRewards).toBeGreaterThan(0);
    expect(bobRewards).toBeGreaterThan(0);
    expect(bobRewards).toBeGreaterThan(aliceRewards);

    simnet.mineBlocks(1440); // simulate lock period
    await simnet.txCall("StacksFund", "withdraw", [`u500000`], alice);

    const { result: aliceBalance } = await simnet.callReadOnlyFn(
      "StacksFund",
      "get-balance",
      [alice],
      alice
    );
    expect(aliceBalance).toBe(`u500000`);
  });

  it("prevents withdrawal before lock period", async () => {
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);

    const { result } = await simnet.txCall("StacksFund", "withdraw", [`u500000`], alice);
    expect(result).toBeErr(); // should fail due to lock
  });

  it("prevents over-withdrawal", async () => {
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);
    simnet.mineBlocks(1440); // simulate lock period

    const { result } = await simnet.txCall("StacksFund", "withdraw", [`u2000000`], alice);
    expect(result).toBeErr(); // cannot withdraw more than balance
  });

  it("prevents double voting", async () => {
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);

    const { result: proposalId } = await simnet.txCall(
      "StacksFund",
      "create-proposal",
      [`"Test Proposal"`, `u50000`, bob, `u5`],
      alice
    );

    await simnet.txCall("StacksFund", "vote", [proposalId, true], alice);
    const { result: doubleVote } = await simnet.txCall("StacksFund", "vote", [proposalId, true], alice);
    expect(doubleVote).toBeErr(); // second vote should fail
  });

  it("prevents executing proposal before expiry", async () => {
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);

    const { result: proposalId } = await simnet.txCall(
      "StacksFund",
      "create-proposal",
      [`"Early Execution Test"`, `u50000`, bob, `u10`],
      alice
    );

    await simnet.txCall("StacksFund", "vote", [proposalId, true], alice);

    // Attempt execution before proposal expires
    const { result } = await simnet.txCall("StacksFund", "execute-proposal", [proposalId], owner);
    expect(result).toBeErr();
  });

  it("accrues rewards correctly after governance actions", async () => {
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);

    simnet.mineBlocks(5);

    const { result: proposalId } = await simnet.txCall(
      "StacksFund",
      "create-proposal",
      [`"Minor fund test"`, `u50000`, bob, `u5`],
      alice
    );

    await simnet.txCall("StacksFund", "vote", [proposalId, true], alice);
    simnet.mineBlocks(5);
    await simnet.txCall("StacksFund", "execute-proposal", [proposalId], owner);

    simnet.mineBlocks(5);

    const { result: rewards } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);
    expect(rewards).toBeGreaterThan(0);
  });

  it("prevents claiming rewards without deposits", async () => {
    const { result } = await simnet.txCall("StacksFund", "claim-rewards", [], owner);
    expect(result).toBeErr();
  });

  it("distributes rewards proportionally across multiple depositors", async () => {
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);
    await simnet.txCall("StacksFund", "deposit", [`u2000000`], bob);
    await simnet.txCall("StacksFund", "deposit", [`u3000000`], carol);

    simnet.mineBlocks(10);

    const { result: aliceRewards } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);
    const { result: bobRewards } = await simnet.txCall("StacksFund", "claim-rewards", [], bob);
    const { result: carolRewards } = await simnet.txCall("StacksFund", "claim-rewards", [], carol);

    // Rewards should scale proportionally with deposit amount
    expect(bobRewards).toBeGreaterThan(aliceRewards);
    expect(carolRewards).toBeGreaterThan(bobRewards);

    const totalRewards = aliceRewards + bobRewards + carolRewards;
    expect(totalRewards).toBeGreaterThan(0);
  });
    it("calculates rewards correctly with overlapping deposits and withdrawals", async () => {
    // Step 1: Initial deposits
    await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);
    simnet.mineBlocks(5);

    await simnet.txCall("StacksFund", "deposit", [`u2000000`], bob);
    simnet.mineBlocks(5);

    // Step 2: First reward claim
    const { result: aliceRewards1 } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);
    const { result: bobRewards1 } = await simnet.txCall("StacksFund", "claim-rewards", [], bob);

    expect(aliceRewards1).toBeGreaterThan(0);
    expect(bobRewards1).toBeGreaterThan(0);
    expect(bobRewards1).toBeGreaterThan(aliceRewards1);

    // Step 3: Alice withdraws part of her deposit
    simnet.mineBlocks(1435); // simulate lock period
    await simnet.txCall("StacksFund", "withdraw", [`u500000`], alice);

    // Step 4: More deposits by Carol
    await simnet.txCall("StacksFund", "deposit", [`u3000000`], carol);
    simnet.mineBlocks(5);

    // Step 5: Claim rewards again after overlapping activity
    const { result: aliceRewards2 } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);
    const { result: bobRewards2 } = await simnet.txCall("StacksFund", "claim-rewards", [], bob);
    const { result: carolRewards2 } = await simnet.txCall("StacksFund", "claim-rewards", [], carol);

    // Rewards should reflect overlapping deposits and withdrawals
    expect(aliceRewards2).toBeGreaterThan(0);
    expect(bobRewards2).toBeGreaterThan(0);
    expect(carolRewards2).toBeGreaterThan(0);

    // Carol should earn the largest rewards because she deposited the most
    expect(carolRewards2).toBeGreaterThan(bobRewards2);
    expect(bobRewards2).toBeGreaterThan(aliceRewards2);
  });
   it("stops accruing rewards for withdrawn amounts", async () => {
  // Step 1: Alice deposits
  await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);
  simnet.mineBlocks(5);

  // Step 2: Claim initial rewards
  const { result: rewardsBefore } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);
  expect(rewardsBefore).toBeGreaterThan(0);

  // Step 3: Alice withdraws half of her deposit after lock period
  simnet.mineBlocks(1435); // simulate lock period
  await simnet.txCall("StacksFund", "withdraw", [`u500000`], alice);

  // Step 4: Mine more blocks to accrue rewards
  simnet.mineBlocks(10);
  const { result: rewardsAfter } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);

  // Alice should earn less in this period than if she had not withdrawn
  expect(rewardsAfter).toBeGreaterThan(0);
  expect(rewardsAfter).toBeLessThan(rewardsBefore * 2); // rough sanity check
});
it("distributes and adjusts rewards with multiple depositors and withdrawals", async () => {
  // Step 1: Alice, Bob, and Carol deposit
  await simnet.txCall("StacksFund", "deposit", [`u1000000`], alice);
  await simnet.txCall("StacksFund", "deposit", [`u2000000`], bob);
  await simnet.txCall("StacksFund", "deposit", [`u3000000`], carol);

  simnet.mineBlocks(5); // let rewards accumulate for a few blocks

  // Step 2: Initial reward claims
  const { result: aliceRewards1 } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);
  const { result: bobRewards1 } = await simnet.txCall("StacksFund", "claim-rewards", [], bob);
  const { result: carolRewards1 } = await simnet.txCall("StacksFund", "claim-rewards", [], carol);

  // Step 3: Rewards should be proportional
  expect(bobRewards1).toBeGreaterThan(aliceRewards1);
  expect(carolRewards1).toBeGreaterThan(bobRewards1);
  expect(carolRewards1).toBeGreaterThan(aliceRewards1);

  // Step 4: Alice withdraws half her deposit
  simnet.mineBlocks(1435); // simulate lock period
  await simnet.txCall("StacksFund", "withdraw", [`u500000`], alice);

  // Step 5: Carol withdraws part of her deposit
  simnet.mineBlocks(1435); // simulate lock period
  await simnet.txCall("StacksFund", "withdraw", [`u1500000`], carol);

  // Step 6: Bob does not withdraw; he continues to earn rewards
  simnet.mineBlocks(5); // allow more blocks to pass and rewards to accumulate

  // Step 7: Claim rewards again after withdrawals
  const { result: aliceRewards2 } = await simnet.txCall("StacksFund", "claim-rewards", [], alice);
  const { result: bobRewards2 } = await simnet.txCall("StacksFund", "claim-rewards", [], bob);
  const { result: carolRewards2 } = await simnet.txCall("StacksFund", "claim-rewards", [], carol);

  // Step 8: Check rewards again
  expect(aliceRewards2).toBeGreaterThan(0);
  expect(bobRewards2).toBeGreaterThan(0);
  expect(carolRewards2).toBeGreaterThan(0);

  // Alice should earn fewer rewards after withdrawing half her deposit
  expect(aliceRewards2).toBeLessThan(aliceRewards1);

  // Carol should earn fewer rewards after withdrawing a portion of her deposit
  expect(carolRewards2).toBeLessThan(carolRewards1);

  // Bob should still earn the most, as he didn't withdraw
  expect(bobRewards2).toBeGreaterThan(carolRewards2);
  expect(bobRewards2).toBeGreaterThan(aliceRewards2);

  // The total rewards should be more than zero, reflecting all deposits and withdrawals
  const totalRewards = aliceRewards2 + bobRewards2 + carolRewards2;
  expect(totalRewards).toBeGreaterThan(0);
});

});
