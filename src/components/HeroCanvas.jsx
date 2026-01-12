import { useEffect, useRef } from 'react';

// Import all images from the hero-images folder
const imageModules = import.meta.glob(
  '/public/hero-images/*.(png|jpg|jpeg|gif|webp|svg)',
  { eager: true, as: 'url' }
);
const IMAGES = Object.values(imageModules);

// Fallback colors if no images are available
const FALLBACK_COLORS = [
  '#252FF1',
  '#1a1f7a',
  '#EE6D71',
  '#b84d50',
  '#F7C385',
  '#c49460',
  '#2d3748',
  '#4a5568',
  '#1a202c',
  '#553c9a',
  '#2c5282',
  '#276749',
  '#744210',
  '#702459'
];

const MAX_ITEMS = 16;
const LIFETIME_MS = 4000;
const MOVEMENT_THRESHOLD = 64;
const IDLE_TIMEOUT_DESKTOP = 16000;
const IDLE_TIMEOUT_MOBILE = 2500;

function HeroCanvas() {
  const canvasRef = useRef(null);
  const zoneRef = useRef(null);
  const itemsRef = useRef([]);
  const imageIndexRef = useRef(0);
  const stateRef = useRef({
    lastX: null,
    lastY: null,
    accumulatedDistance: 0,
    pathX: 0,
    pathY: 0,
    pathAngle: Math.random() * Math.PI * 2,
    idleDistanceAccumulated: 0,
    isIdle: false,
    idleTimer: null,
    idleAnimationFrame: null
  });

  const getNextImage = () => {
    if (IMAGES.length === 0) return null;
    const image = IMAGES[imageIndexRef.current];
    imageIndexRef.current = (imageIndexRef.current + 1) % IMAGES.length;
    return image;
  };

  const getRandomColor = () =>
    FALLBACK_COLORS[Math.floor(Math.random() * FALLBACK_COLORS.length)];
  const getIdleTimeout = () =>
    window.innerWidth <= 900 ? IDLE_TIMEOUT_MOBILE : IDLE_TIMEOUT_DESKTOP;

  const createItem = (x, y) => {
    if (!canvasRef.current) return;

    const item = document.createElement('div');
    item.className = 'hero-canvas__item';

    const imageSrc = getNextImage();
    if (imageSrc) {
      item.style.backgroundImage = `url(${imageSrc})`;
      item.style.backgroundSize = 'cover';
      item.style.backgroundPosition = 'center';
    } else {
      item.style.backgroundColor = getRandomColor();
    }

    item.style.left = `${x - 40}px`;
    item.style.top = `${y - 40}px`;

    canvasRef.current.appendChild(item);
    const itemData = { element: item, createdAt: Date.now() };
    itemsRef.current.push(itemData);

    while (itemsRef.current.length > MAX_ITEMS) {
      const oldest = itemsRef.current.shift();
      oldest.element.classList.add('fading');
      setTimeout(() => oldest.element.remove(), 500);
    }

    setTimeout(() => {
      const index = itemsRef.current.findIndex((i) => i.element === item);
      if (index !== -1) itemsRef.current.splice(index, 1);
      item.classList.add('fading');
      setTimeout(() => item.remove(), 500);
    }, LIFETIME_MS);
  };

  const resetIdleTimer = () => {
    const state = stateRef.current;
    state.isIdle = false;
    if (state.idleTimer) clearTimeout(state.idleTimer);
    if (state.idleAnimationFrame)
      cancelAnimationFrame(state.idleAnimationFrame);

    state.idleTimer = setTimeout(startIdleAnimation, getIdleTimeout());
  };

  const startIdleAnimation = () => {
    const state = stateRef.current;
    state.isIdle = true;

    if (!zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();

    state.pathX = Math.random() * rect.width;
    state.pathY = Math.random() * rect.height;
    state.pathAngle = Math.random() * Math.PI * 2;
    state.idleDistanceAccumulated = 0;

    createItem(state.pathX, state.pathY);

    const stepSize = 1.5;

    const animate = () => {
      if (!state.isIdle || !zoneRef.current) return;

      const rect = zoneRef.current.getBoundingClientRect();

      state.pathAngle += (Math.random() - 0.5) * 0.2;
      state.pathX += Math.cos(state.pathAngle) * stepSize;
      state.pathY += Math.sin(state.pathAngle) * stepSize;
      state.idleDistanceAccumulated += stepSize;

      if (state.pathX < 40 || state.pathX > rect.width - 40) {
        state.pathAngle = Math.PI - state.pathAngle;
        state.pathX = Math.max(40, Math.min(rect.width - 40, state.pathX));
      }
      if (state.pathY < 40 || state.pathY > rect.height - 40) {
        state.pathAngle = -state.pathAngle;
        state.pathY = Math.max(40, Math.min(rect.height - 40, state.pathY));
      }

      if (state.idleDistanceAccumulated >= MOVEMENT_THRESHOLD) {
        createItem(state.pathX, state.pathY);
        state.idleDistanceAccumulated = 0;
      }

      state.idleAnimationFrame = requestAnimationFrame(animate);
    };

    state.idleAnimationFrame = requestAnimationFrame(animate);
  };

  const handleMove = (clientX, clientY) => {
    if (!zoneRef.current) return;

    const rect = zoneRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

    const state = stateRef.current;

    if (state.lastX !== null && state.lastY !== null) {
      const dx = x - state.lastX;
      const dy = y - state.lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      state.accumulatedDistance += distance;

      if (state.accumulatedDistance >= MOVEMENT_THRESHOLD) {
        createItem(x, y);
        state.accumulatedDistance = 0;
      }
    }

    state.lastX = x;
    state.lastY = y;
    resetIdleTimer();
  };

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;

    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onMouseLeave = () => {
      const state = stateRef.current;
      state.lastX = null;
      state.lastY = null;
      state.accumulatedDistance = 0;
      resetIdleTimer();
    };
    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    let lastScrollY = window.scrollY;
    let scrollAccumulated = 0;
    const SCROLL_THRESHOLD = 50;

    const onScroll = () => {
      const isMobile = window.innerWidth <= 900;
      if (!isMobile || !zoneRef.current) return;

      const rect = zoneRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const scrollDelta = Math.abs(window.scrollY - lastScrollY);
      scrollAccumulated += scrollDelta;
      lastScrollY = window.scrollY;

      if (scrollAccumulated >= SCROLL_THRESHOLD) {
        const state = stateRef.current;
        state.pathAngle += (Math.random() - 0.5) * 0.5;
        state.pathX += Math.cos(state.pathAngle) * 40;
        state.pathY += Math.sin(state.pathAngle) * 30;

        state.pathX = Math.max(40, Math.min(rect.width - 40, state.pathX));
        state.pathY = Math.max(40, Math.min(rect.height - 40, state.pathY));

        if (state.pathX === 40 || isNaN(state.pathX)) {
          state.pathX = Math.random() * (rect.width - 80) + 40;
          state.pathY = Math.random() * (rect.height - 80) + 40;
        }

        createItem(state.pathX, state.pathY);
        scrollAccumulated = 0;
      }
    };

    zone.addEventListener('mousemove', onMouseMove);
    zone.addEventListener('mouseenter', resetIdleTimer);
    zone.addEventListener('mouseleave', onMouseLeave);
    zone.addEventListener('touchmove', onTouchMove);
    zone.addEventListener('touchend', onMouseLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    resetIdleTimer();

    return () => {
      zone.removeEventListener('mousemove', onMouseMove);
      zone.removeEventListener('mouseenter', resetIdleTimer);
      zone.removeEventListener('mouseleave', onMouseLeave);
      zone.removeEventListener('touchmove', onTouchMove);
      zone.removeEventListener('touchend', onMouseLeave);
      window.removeEventListener('scroll', onScroll);

      const state = stateRef.current;
      if (state.idleTimer) clearTimeout(state.idleTimer);
      if (state.idleAnimationFrame)
        cancelAnimationFrame(state.idleAnimationFrame);
    };
  }, []);

  return (
    <>
      <div ref={canvasRef} className="hero-canvas" />
      <div ref={zoneRef} className="hero-interaction-zone" />
    </>
  );
}

export default HeroCanvas;
