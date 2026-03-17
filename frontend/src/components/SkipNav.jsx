/**
 * SkipNav -- keyboard-accessible "Skip to content" link.
 *
 * Visually hidden until focused, this link lets keyboard users jump
 * past the header and navigation straight to the main content area.
 * The target element must have id="main-content".
 */
export default function SkipNav() {
  return (
    <a
      href="#main-content"
      onClick={() => {
        const el = document.getElementById('main-content');
        if (el && typeof el.focus === 'function') {
          window.setTimeout(() => el.focus(), 0);
        }
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-orange-500 focus:text-white focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-orange-300"
    >
      Skip to content
    </a>
  );
}
