// Motion engine.
//
// Every effect is progressive: the CSS hides nothing that this file cannot
// reveal, `.no-js` is removed only once we are running, and everything is a
// no-op when the visitor prefers reduced motion.

const MOTION_KEY = "arca-motion";

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function motionEnabled() {
  try {
    if (localStorage.getItem(MOTION_KEY) === "off") return false;
  } catch {
    /* storage blocked — fall through to the OS preference */
  }
  return !prefersReducedMotion();
}

export function setMotion(on) {
  try {
    localStorage.setItem(MOTION_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  document.documentElement.dataset.motion = on ? "on" : "off";
}

export function initMotionPreference() {
  document.documentElement.classList.remove("no-js");
  document.documentElement.dataset.motion = motionEnabled() ? "on" : "off";
}

// ---------------------------------------------------------------------------
// Scroll reveal
// ---------------------------------------------------------------------------

let revealObserver = null;

function ensureObserver() {
  if (revealObserver || !("IntersectionObserver" in window)) return revealObserver;
  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        // Drop the will-change hint once the transition has finished.
        setTimeout(() => entry.target.classList.add("done"), 1200);
        revealObserver.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  return revealObserver;
}

/** Wires reveals, staggers, word animations, counters and meters in `root`. */
export function observe(root = document) {
  const enabled = motionEnabled();
  const targets = root.querySelectorAll(".reveal, .stagger, .words");

  if (!enabled || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in"));
    root.querySelectorAll("[data-count]").forEach((el) => {
      el.textContent = formatCount(Number(el.dataset.count) || 0);
    });
    root.querySelectorAll(".meter > i").forEach((el) => {
      el.style.width = `${Math.min(100, Number(el.dataset.fill) || 0)}%`;
    });
    return;
  }

  const observer = ensureObserver();

  // Stagger children get their index as a custom property.
  root.querySelectorAll(".stagger").forEach((group) => {
    [...group.children].forEach((child, i) => child.style.setProperty("--i", String(i)));
  });

  // Split headline text into per-word spans once.
  root.querySelectorAll(".words:not([data-split])").forEach(splitWords);

  targets.forEach((el) => observer.observe(el));
  root.querySelectorAll("[data-count]").forEach(watchCounter);
  root.querySelectorAll(".meter > i").forEach(watchMeter);
}

function splitWords(el) {
  el.dataset.split = "1";
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = "";
  words.forEach((word, i) => {
    const outer = document.createElement("span");
    outer.className = "word";
    outer.style.setProperty("--w", String(i));
    const inner = document.createElement("span");
    inner.textContent = word;
    outer.append(inner);
    el.append(outer);
    if (i < words.length - 1) el.append(document.createTextNode(" "));
  });
}

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

const formatCount = (value) => new Intl.NumberFormat("en-GB").format(Math.round(value));

function watchCounter(el) {
  if (el.dataset.counted) return;
  const target = Number(el.dataset.count) || 0;
  el.textContent = "0";
  const observer = new IntersectionObserver(
    (entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      el.dataset.counted = "1";
      countUp(el, target);
    },
    { threshold: 0.4 }
  );
  observer.observe(el);
}

function countUp(el, target, duration = 1500) {
  if (target === 0) {
    el.textContent = "0";
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    // easeOutExpo — fast then settling, which reads as confident rather than mechanical.
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = formatCount(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function watchMeter(el) {
  const fill = Math.min(100, Math.max(0, Number(el.dataset.fill) || 0));
  const observer = new IntersectionObserver(
    (entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      requestAnimationFrame(() => {
        el.style.width = `${fill}%`;
      });
    },
    { threshold: 0.4 }
  );
  observer.observe(el);
}

// ---------------------------------------------------------------------------
// Pointer effects
// ---------------------------------------------------------------------------

// Delegated so it keeps working after the SPA re-renders, and skipped entirely
// on touch devices where hover has no meaning.
export function initPointerEffects() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let frame = 0;
  document.addEventListener(
    "pointermove",
    (event) => {
      if (!motionEnabled() || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const glow = event.target.closest?.(".glow");
        if (glow) {
          const rect = glow.getBoundingClientRect();
          glow.style.setProperty("--mx", `${event.clientX - rect.left}px`);
          glow.style.setProperty("--my", `${event.clientY - rect.top}px`);
        }
        const tilt = event.target.closest?.(".tilt");
        if (tilt) {
          const rect = tilt.getBoundingClientRect();
          tilt.style.setProperty("--tx", String((event.clientX - rect.left) / rect.width - 0.5));
          tilt.style.setProperty("--ty", String((event.clientY - rect.top) / rect.height - 0.5));
        }
      });
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerleave",
    (event) => {
      const tilt = event.target.closest?.(".tilt");
      if (tilt) {
        tilt.style.setProperty("--tx", "0");
        tilt.style.setProperty("--ty", "0");
      }
    },
    { capture: true, passive: true }
  );
}

// ---------------------------------------------------------------------------
// Sticky header state
// ---------------------------------------------------------------------------

export function initHeaderState() {
  const onScroll = () => {
    const header = document.querySelector(".site-header");
    if (header) header.classList.toggle("stuck", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// ---------------------------------------------------------------------------
// Page transitions
// ---------------------------------------------------------------------------

/** Runs `update`, using the View Transitions API where it is available. */
export function transition(update) {
  if (!motionEnabled() || !document.startViewTransition) {
    update();
    return;
  }
  document.startViewTransition(update);
}
