/**
 * client:settled: hydrate a demo once the page change has finished.
 *
 * A page change runs for 580ms. Hydrating a React demo in the middle of it costs frames, so a
 * demo that arrives by navigation waits for 'pf:done' (Base.astro) and then for an idle moment.
 * On a first load there is no page change to wait for and it hydrates at once.
 *
 *   <HeroMap client:settled />
 *   <Demo client:settled={{ rootMargin: '600px' }} />   and only once it is near the screen
 */
export default (load, options, el) => {
  const hydrate = async () => {
    const run = await load();
    await run();
  };

  const whenNear = (fn) => {
    const margin = options && options.value && typeof options.value === 'object' ? options.value.rootMargin : null;
    if (!margin || !('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { rootMargin: margin });
    // the island element has no box of its own, so watch what is inside it
    for (const child of el.children) io.observe(child);
  };

  const whenSettled = (fn) => {
    const nav = window.__pfNav;
    if (!nav || !nav.nav || nav.done) return fn();
    let called = false;
    const go = () => {
      if (called) return;
      called = true;
      document.removeEventListener('pf:done', go);
      if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 400 });
      else setTimeout(fn, 60);
    };
    document.addEventListener('pf:done', go);
    setTimeout(go, 2500); // never leave a demo waiting
  };

  whenSettled(() => whenNear(hydrate));
};
