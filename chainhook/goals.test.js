import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryGoalStore, MemoryMessageStore } from './storage.js';

describe('MemoryGoalStore', () => {
  let store;

  beforeEach(() => {
    store = new MemoryGoalStore();
  });

  it('can upsert and retrieve a creator goal', async () => {
    const address = 'SP12345';
    const goalData = {
      goalTitle: 'Upgrade Studio Mic',
      goalTarget: 150,
      goalDescription: 'Help us buy a new microphone!',
      goalSlug: 'upgrade-mic',
      active: true,
    };

    const saved = await store.upsertGoal(address, goalData);
    assert.strictEqual(saved.creatorAddress, address);
    assert.strictEqual(saved.goalTitle, 'Upgrade Studio Mic');
    assert.strictEqual(saved.goalTarget, 150);
    assert.strictEqual(saved.goalSlug, 'upgrade-mic');
    assert.strictEqual(saved.currentProgress, 0);
    assert.strictEqual(saved.active, true);

    const retrieved = await store.getGoal(address);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.goalTitle, 'Upgrade Studio Mic');
  });

  it('returns null when goal does not exist', async () => {
    const goal = await store.getGoal('NON_EXISTENT');
    assert.strictEqual(goal, null);
  });

  it('can increment goal progress', async () => {
    const address = 'SP12345';
    const goalData = {
      goalTitle: 'Upgrade Studio Mic',
      goalTarget: 100,
      goalSlug: 'upgrade-mic',
    };

    await store.upsertGoal(address, goalData);
    
    // First increment
    const updated = await store.incrementGoalProgress(address, 25);
    assert.strictEqual(updated.currentProgress, 25);

    // Second increment
    const updated2 = await store.incrementGoalProgress(address, 35);
    assert.strictEqual(updated2.currentProgress, 60);

    const finalGoal = await store.getGoal(address);
    assert.strictEqual(finalGoal.currentProgress, 60);
  });

  it('returns null when incrementing progress of non-existent goal', async () => {
    const result = await store.incrementGoalProgress('NON_EXISTENT', 10);
    assert.strictEqual(result, null);
  });

  it('can delete a goal', async () => {
    const address = 'SP12345';
    const goalData = {
      goalTitle: 'Upgrade Studio Mic',
      goalTarget: 100,
      goalSlug: 'upgrade-mic',
    };

    await store.upsertGoal(address, goalData);
    const deleteResult = await store.deleteGoal(address);
    assert.strictEqual(deleteResult, true);

    const retrieved = await store.getGoal(address);
    assert.strictEqual(retrieved, null);
  });

  it('returns false when deleting a non-existent goal', async () => {
    const deleteResult = await store.deleteGoal('NON_EXISTENT');
    assert.strictEqual(deleteResult, false);
  });
});

describe('MemoryMessageStore', () => {
  let store;

  beforeEach(() => {
    store = new MemoryMessageStore();
  });

  it('can save and retrieve a tip message', async () => {
    const txId = '0xabc123';
    const message = 'Thanks for the stream! #goal-upgrade-mic';

    const saved = await store.saveMessage(txId, message);
    assert.strictEqual(saved, true);

    const retrieved = await store.getMessage(txId);
    assert.strictEqual(retrieved, message);
  });

  it('returns null for non-existent message transaction ID', async () => {
    const retrieved = await store.getMessage('0xdoesnotexist');
    assert.strictEqual(retrieved, null);
  });
});
