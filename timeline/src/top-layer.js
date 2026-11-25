let supportsDisplayTransitionCache;

/**
 * Runtime probe for discrete `display` transition support.
 * Uses the transition shorthand intentionally so browsers without full support
 * (e.g. Firefox < bug 1882408 fix) drop the declaration cleanly.
 */
export function canTransitionDisplay() {
  if (supportsDisplayTransitionCache !== undefined) return supportsDisplayTransitionCache;
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransitionCache = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransitionCache;
}

export function supportsTopLayerExit() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

export function cancelTopLayerClose(element) {
  if (!element) return;
  element.removeAttribute('data-closing');
}

/**
 * Close a modal <dialog> with animated exit support even on browsers
 * lacking native `overlay` + discrete `display` exit transitions.
 * Interruptible if reopened before animations settle.
 */
export async function closeTopLayer(element, onAfterClose) {
  if (!element || !element.open) return;
  if (!supportsTopLayerExit()) {
    element.setAttribute('data-closing', '');
    const animations =
      typeof element.getAnimations === 'function' ? element.getAnimations({ subtree: true }) : [];
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 420)),
      ]);
    }
    if (!element.hasAttribute('data-closing')) return;
    element.removeAttribute('data-closing');
  }
  if (element.open) {
    element.close();
  }
  onAfterClose?.();
}
