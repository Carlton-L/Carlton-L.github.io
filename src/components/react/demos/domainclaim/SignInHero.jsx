/**
 * The product's own home-page demo, running from its own code: claim acme.dev, copy the record,
 * check once too early, then watch it verify. Drawn at the size the product draws it (780 x 590).
 */
import DemoFrame from '../_shared/DemoFrame.jsx';
import ProductFrame from '../_shared/ProductFrame.jsx';
import './domainclaim.css';

/** Drawn once the demo's island has content. */
const signInDrawn = (doc) => (doc.querySelector('astro-island')?.childElementCount ?? 0) > 0;

export default function SignInHero() {
  return (
    <DemoFrame title="VERIFY.scn · the product's home-page demo" label="live" fill={false}>
      <ProductFrame
        src="/demos/domainclaim/?view=signin"
        width={780}
        height={590}
        fixedDesktop
        interactive={false}
        title="DomainClaim demo"
        revealOn="ready"
        drawn={signInDrawn}
      />
    </DemoFrame>
  );
}
