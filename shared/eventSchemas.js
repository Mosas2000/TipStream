export const eventSchemas = {
  'tip-sent': {
    type: 'tip-sent',
    required: ['tip-id', 'sender', 'recipient', 'amount'],
    optional: ['fee', 'message', 'category'],
    defaults: {
      fee: '0',
      message: '',
      category: null,
    },
  },
  'tip-categorized': {
    type: 'tip-categorized',
    required: ['tip-id', 'category'],
    optional: [],
  },
  'token-tip-sent': {
    type: 'token-tip-sent',
    required: ['token-tip-id', 'sender', 'recipient', 'token-contract', 'amount'],
    optional: ['fee'],
    defaults: {
      fee: '0',
    },
  },
  'profile-updated': {
    type: 'profile-updated',
    required: ['user'],
    optional: ['display-name', 'bio', 'avatar-uri'],
  },
  'user-blocked': {
    type: 'user-blocked',
    required: ['blocker', 'blocked-user'],
    optional: [],
  },
  'user-unblocked': {
    type: 'user-unblocked',
    required: ['unblocker', 'unblocked-user'],
    optional: [],
  },
  'token-whitelist-updated': {
    type: 'token-whitelist-updated',
    required: ['token-contract', 'allowed'],
    optional: [],
  },
  'contract-paused': {
    type: 'contract-paused',
    required: ['paused'],
    optional: [],
  },
  'fee-updated': {
    type: 'fee-updated',
    required: ['new-fee'],
    optional: [],
  },
  'fee-change-proposed': {
    type: 'fee-change-proposed',
    required: ['new-fee', 'effective-height'],
    optional: [],
  },
  'fee-change-executed': {
    type: 'fee-change-executed',
    required: ['new-fee'],
    optional: [],
  },
  'fee-change-cancelled': {
    type: 'fee-change-cancelled',
    required: [],
    optional: [],
  },
  'pause-change-proposed': {
    type: 'pause-change-proposed',
    required: ['paused', 'effective-height'],
    optional: [],
  },
  'pause-change-executed': {
    type: 'pause-change-executed',
    required: ['paused'],
    optional: [],
  },
  'pause-change-cancelled': {
    type: 'pause-change-cancelled',
    required: [],
    optional: [],
  },
  'multisig-updated': {
    type: 'multisig-updated',
    required: ['multisig'],
    optional: [],
  },
  'ownership-proposed': {
    type: 'ownership-proposed',
    required: ['current-owner', 'proposed-owner'],
    optional: [],
  },
  'ownership-transferred': {
    type: 'ownership-transferred',
    required: ['new-owner'],
    optional: [],
  },
};

export function getEventSchema(eventType) {
  return eventSchemas[eventType] || null;
}

export function isValidEventType(eventType) {
  return eventType in eventSchemas;
}
