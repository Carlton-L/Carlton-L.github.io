/**
 * FailureView — the live demo: the product's claim screen in its own document (ProductFrame),
 * and under it the state card that picks which demo name it runs.
 *
 * Every box here has a fixed height, so a new state never changes the page's height.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import ProductFrame from '../_shared/ProductFrame.jsx';
import { SCENES } from './explorer-data.js';
import { useExplorer } from './explorer-store.js';
import StateCard from './StateCard.jsx';
import './domainclaim.css';

/** Drawn once a claim's title is on screen, so the visitor never sees the screens assemble. */
const claimDrawn = (doc) => (doc.querySelector('h1')?.textContent ?? '').trim().length > 0;

export default function FailureView() {
  const frame = useRef(null);
  const { index } = useExplorer();
  const [ready, setReady] = useState(false);

  const onEvent = useCallback((e) => {
    if (e.dc === 'ready') setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const s = SCENES[index];
    frame.current?.send({ dc: 'open', name: s.name, heldElsewhere: s.heldElsewhere === true });
  }, [ready, index]);

  return (
    <div>
      <DemoFrame title={`DEMO_NAMES.scn · ${SCENES[index].name}`} label="live" fill={false}>
        <ProductFrame
          ref={frame}
          src="/demos/domainclaim/"
          width={960}
          height={600}
          title="DomainClaim, running the state on the card"
          revealOn="opened"
          drawn={claimDrawn}
          onEvent={onEvent}
        />
        <StateCard />
      </DemoFrame>
    </div>
  );
}
