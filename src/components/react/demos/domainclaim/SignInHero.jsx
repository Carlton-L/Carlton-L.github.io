/**
 * The product's own home-page demo, running from its own code: claim acme.dev, copy the record,
 * check once too early, then watch it verify. Drawn at the size the product draws it (780 x 590).
 */
import DemoFrame from '../_shared/DemoFrame.jsx';
import DomainClaimFrame from './DomainClaimFrame.jsx';
import './domainclaim.css';

export default function SignInHero() {
  return (
    <DemoFrame title="VERIFY.scn · the product's home-page demo" label="live" fill={false}>
      <DomainClaimFrame view="signin" width={780} height={590} fixedDesktop interactive={false} title="DomainClaim demo" />
    </DemoFrame>
  );
}
