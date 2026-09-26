/**
 * FailureView — the live demo: the product's claim screen in its own document (DomainClaimFrame),
 * and under it the state card that picks which demo name it runs.
 *
 * Every box here has a fixed height, so a new state never changes the page's height.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import DemoFrame from '../_shared/DemoFrame.jsx';
import DomainClaimFrame from './DomainClaimFrame.jsx';
import { SCENES } from './explorer-data.js';
import { useExplorer } from './explorer-store.js';
import StateCard from './StateCard.jsx';
import './domainclaim.css';

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
        <DomainClaimFrame ref={frame} view="app" width={960} height={600} title="DomainClaim, running the state on the card" onEvent={onEvent} />
        <StateCard />
      </DemoFrame>
    </div>
  );
}
