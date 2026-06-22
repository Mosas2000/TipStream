import { isDemoModeActive } from '../lib/demo-utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3100';

// Mock goals for demo mode fallback when no goal has been configured yet for the address
const DEFAULT_DEMO_GOALS = {
  'SP2DEMOADDRESS0000000000000000000000': {
    creatorAddress: 'SP2DEMOADDRESS0000000000000000000000',
    goalTitle: 'Upgrade Studio Setup',
    goalTarget: 150,
    goalDescription: 'We are raising funds to buy a new camera and microphone for higher quality streams!',
    goalSlug: 'studio-upgrade',
    currentProgress: 45,
    active: true,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'SPMWDB630R3200TJ3XSDPDWYCZ96THWSM6DK4D0': {
    creatorAddress: 'SPMWDB630R3200TJ3XSDPDWYCZ96THWSM6DK4D0',
    goalTitle: 'Buy a Coffee Machine',
    goalTarget: 50,
    goalDescription: 'Keep the code caffeinated! Upgrading the office espresso machine.',
    goalSlug: 'coffee',
    currentProgress: 12.5,
    active: true,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  'SP1P72Z3704VMT3DMHPP2CB8TGQWGDBHD3R0XG9K': {
    creatorAddress: 'SP1P72Z3704VMT3DMHPP2CB8TGQWGDBHD3R0XG9K',
    goalTitle: 'Fuzzing Suite Server',
    goalTarget: 500,
    goalDescription: 'Funding a dedicated rack server for running continuous smart contract fuzzing tests.',
    goalSlug: 'fuzz-server',
    currentProgress: 240,
    active: true,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
};

/**
 * Fetches the active tipping goal for a given creator address.
 * Supports demo mode localStorage and default mock fallbacks.
 * 
 * @param {string} address - Stacks address of the creator
 * @returns {Promise<object|null>}
 */
export async function fetchCreatorGoal(address) {
  if (isDemoModeActive()) {
    const localGoal = localStorage.getItem(`tipstream_demo_goal_${address}`);
    if (localGoal) {
      try {
        return JSON.parse(localGoal);
      } catch (e) {
        console.error('Error parsing local demo goal', e);
      }
    }
    // Return mock default if present for this address
    return DEFAULT_DEMO_GOALS[address] || null;
  }

  const url = `${API_BASE_URL}/api/goals/${address}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch creator goal');
  }

  const data = await response.json();
  return data.goal;
}

/**
 * Creates or updates a tipping goal for a creator.
 * 
 * @param {string} address - Stacks address of the creator
 * @param {object} goalData - Goal configuration details
 * @returns {Promise<object>}
 */
export async function updateCreatorGoal(address, goalData) {
  const payload = {
    goalTitle: goalData.goalTitle,
    goalTarget: Number(goalData.goalTarget),
    goalSlug: goalData.goalSlug,
    goalDescription: goalData.goalDescription || '',
    active: goalData.active ?? true,
  };

  if (isDemoModeActive()) {
    // Retrieve current progress to preserve it
    let currentProgress = 0;
    const existing = await fetchCreatorGoal(address);
    if (existing) {
      currentProgress = existing.currentProgress;
    }

    const updatedGoal = {
      creatorAddress: address,
      ...payload,
      currentProgress,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(`tipstream_demo_goal_${address}`, JSON.stringify(updatedGoal));
    return updatedGoal;
  }

  const url = `${API_BASE_URL}/api/goals/${address}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update creator goal');
  }

  const data = await response.json();
  return data.goal;
}

/**
 * Deletes/cancels the active tipping goal for a creator.
 * 
 * @param {string} address - Stacks address of the creator
 * @returns {Promise<boolean>}
 */
export async function deleteCreatorGoal(address) {
  if (isDemoModeActive()) {
    localStorage.removeItem(`tipstream_demo_goal_${address}`);
    return true;
  }

  const url = `${API_BASE_URL}/api/goals/${address}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete creator goal');
  }

  const data = await response.json();
  return data.deleted;
}

/**
 * Registers a tip message linked to a transaction ID.
 * This is called immediately after a successful transaction broadcast,
 * so the indexer can extract the hashtag and contribute to the goal once confirmed.
 * 
 * @param {string} txId - Stacks transaction ID
 * @param {string} message - Tip message
 * @returns {Promise<object>}
 */
export async function registerTipMessage(txId, message) {
  if (isDemoModeActive()) {
    // In demo mode, simulate adding to progress immediately for the mock storage
    // Extract recipient and hashtag to update progress in localStorage
    return { ok: true, saved: true };
  }

  const url = `${API_BASE_URL}/api/tips/message`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ txId, message }),
  });

  if (!response.ok) {
    throw new Error('Failed to register tip message');
  }

  return response.json();
}
