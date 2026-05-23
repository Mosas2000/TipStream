import { useState } from 'react';
import { Bell, Mail, RotateCcw } from 'lucide-react';
import { useNotificationPreferences } from '../context/NotificationPreferencesContext';
import {
  CHANNELS,
  EVENT_TYPES,
  CHANNEL_LABELS,
  EVENT_LABELS,
} from '../lib/notificationPreferences';

function Toggle({ id, checked, onChange, disabled }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function PreferenceRow({ label, description, checked, onChange, id }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <Toggle id={id} checked={checked} onChange={onChange} />
    </div>
  );
}

const EVENT_DESCRIPTIONS = {
  [EVENT_TYPES.TIP_RECEIVED]: 'When someone sends you a tip',
  [EVENT_TYPES.TIP_SENT]: 'When your tip is confirmed on-chain',
  [EVENT_TYPES.SCHEDULED_TIP_EXECUTED]: 'When a scheduled tip runs successfully',
  [EVENT_TYPES.SCHEDULED_TIP_FAILED]: 'When a scheduled tip cannot be executed',
  [EVENT_TYPES.REFUND_REQUESTED]: 'When a refund is requested on a tip',
  [EVENT_TYPES.REFUND_RESOLVED]: 'When a refund request is approved or rejected',
};

export default function NotificationPreferences({ addToast }) {
  const {
    preferences,
    toggleChannel,
    toggleEvent,
    setEmail,
    resetToDefaults,
  } = useNotificationPreferences();

  const [emailInput, setEmailInput] = useState(preferences.email || '');
  const [emailError, setEmailError] = useState('');

  const emailEnabled = preferences.channels[CHANNELS.EMAIL];

  const handleEmailChange = (value) => {
    setEmailInput(value);
    if (!value) {
      setEmailError('');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(value)) {
      setEmailError('Enter a valid email address');
    } else if (value.length > 254) {
      setEmailError('Email must be 254 characters or fewer');
    } else {
      setEmailError('');
    }
  };

  const handleEmailSave = () => {
    if (emailError) return;
    setEmail(emailInput.trim() || null);
    addToast?.('Email address saved', 'success');
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') handleEmailSave();
  };

  const handleReset = () => {
    resetToDefaults();
    setEmailInput('');
    setEmailError('');
    addToast?.('Notification preferences reset to defaults', 'info');
  };

  return (
    <div
      data-testid="notification-preferences"
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
            <Bell className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Notification Preferences
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Control which events notify you and how
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Reset notification preferences to defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="space-y-6">
        <section aria-labelledby="channels-heading">
          <h3
            id="channels-heading"
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1"
          >
            Channels
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <PreferenceRow
              id="channel-in-app"
              label={CHANNEL_LABELS[CHANNELS.IN_APP]}
              description="Show notifications in the bell menu"
              checked={preferences.channels[CHANNELS.IN_APP]}
              onChange={(val) => toggleChannel(CHANNELS.IN_APP, val)}
            />
            <PreferenceRow
              id="channel-email"
              label={CHANNEL_LABELS[CHANNELS.EMAIL]}
              description="Send notifications to your email address"
              checked={preferences.channels[CHANNELS.EMAIL]}
              onChange={(val) => toggleChannel(CHANNELS.EMAIL, val)}
            />
          </div>

          {emailEnabled && (
            <div className="mt-3 pl-0">
              <label
                htmlFor="notification-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Email address
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    id="notification-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="you@example.com"
                    maxLength={254}
                    aria-describedby={emailError ? 'notification-email-error' : undefined}
                    aria-invalid={emailError ? 'true' : undefined}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all bg-white dark:bg-gray-800 dark:text-white ${
                      emailError
                        ? 'border-red-300 dark:border-red-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                </div>
                <button
                  onClick={handleEmailSave}
                  disabled={!!emailError}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
              {emailError && (
                <p
                  id="notification-email-error"
                  role="alert"
                  className="mt-1 text-xs text-red-500"
                >
                  {emailError}
                </p>
              )}
              {preferences.email && !emailError && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Saved: {preferences.email}
                </p>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="events-heading">
          <h3
            id="events-heading"
            className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1"
          >
            Event types
          </h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Object.values(EVENT_TYPES).map((eventType) => (
              <PreferenceRow
                key={eventType}
                id={`event-${eventType}`}
                label={EVENT_LABELS[eventType]}
                description={EVENT_DESCRIPTIONS[eventType]}
                checked={preferences.events[eventType]}
                onChange={(val) => toggleEvent(eventType, val)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
