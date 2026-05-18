/**
 * @module tipstreak-sdk/components/CopyButton
 *
 * A button that copies text to the clipboard with a visual confirmation state.
 * Falls back to `document.execCommand` for older browsers.
 *
 * Requires `lucide-react` as a peer dependency.
 *
 * @requires react
 * @requires lucide-react
 */

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

const COPIED_TIMEOUT_MS = 2000;

/**
 * Copy-to-clipboard button with a checkmark confirmation.
 *
 * @param {object} props
 * @param {string} props.text - Text to copy to clipboard
 * @param {string} [props.className=''] - Additional CSS classes
 *
 * @example
 * <CopyButton text="SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ" />
 */
export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      className={`inline-flex items-center transition-colors ${className}`}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
      ) : (
        <Copy className="w-4 h-4 opacity-60 hover:opacity-100" aria-hidden="true" />
      )}
    </button>
  );
}
