// The demo document's root. Mirrors the product's layouts (root, then the app shell around a
// screen) and connects them to the in-page API. Portfolio-owned glue.
import type React from 'react';
import { useEffect, useState } from 'react';
import { SWRConfig } from 'swr';
import { createClaim } from '@/client/api';
import AppShell from '@/screens/AppShell/AppShell';
import ClaimScreen from '@/screens/ClaimScreen/ClaimScreen';
import DomainsScreen from '@/screens/DomainsScreen/DomainsScreen';
import SignInDemo from '@/screens/SignInDemo/SignInDemo';
import { navigate, startAt, useLocation } from '../shims/next-navigation';
import { resetAttempts } from '../shims/rate-limit';
import { resetStore, seedHeldElsewhere, seedVerified } from '../shims/store';
import { DEMO_USER } from '../shims/supabase-route';
import { installApi } from './api';

export type FrameCommand = { dc: 'open'; name: string; heldElsewhere?: boolean };
export type FrameEvent =
  | { dc: 'ready' }
  | { dc: 'opened'; name: string; id: string }
  | { dc: 'route'; pathname: string };

/** carlton.dev's icon is found live, the product's way; the others are saved with the demo. */
const SEEDED = ['carlton.dev', 'apple.com', 'microsoft.com'];

const post = (event: FrameEvent) => window.parent.postMessage(event, window.location.origin);

let installed = false;
const install = () => {
  if (installed) {
    return;
  }
  installed = true;
  installApi();
};

const Screen: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => post({ dc: 'route', pathname }), [pathname]);
  return pathname.startsWith('/claim/') ? <ClaimScreen key={pathname} /> : <DomainsScreen />;
};

const App: React.FC = () => {
  const [scene, setScene] = useState(0);
  useEffect(() => {
    const onMessage = async (message: MessageEvent<FrameCommand>) => {
      if (message.origin !== window.location.origin || message.data?.dc !== 'open') {
        return;
      }
      resetStore();
      resetAttempts();
      // The demo account's other claims, so the rail shows real site icons next to each scene.
      for (const name of SEEDED) {
        seedVerified(name, DEMO_USER.id);
      }
      if (message.data.heldElsewhere) {
        seedHeldElsewhere(message.data.name);
      }
      const created = await createClaim(message.data.name);
      if (created.ok) {
        startAt(`/claim/${created.id}`);
        setScene((n) => n + 1);
        post({ dc: 'opened', name: message.data.name, id: created.id });
      }
    };
    window.addEventListener('message', onMessage);
    post({ dc: 'ready' });
    return () => window.removeEventListener('message', onMessage);
  }, []);
  // Each scene starts with an empty cache, the way a fresh page load would. The product's own
  // SWRConfig sits inside the shell and keeps this cache.
  return (
    <SWRConfig key={scene} value={{ provider: () => new Map() }}>
      <AppShell>
        <Screen />
      </AppShell>
    </SWRConfig>
  );
};

/** `view=signin` is the home page's sign-in demo on its own; anything else is the app. */
const FrameApp: React.FC<{ view: 'signin' | 'app' }> = ({ view }) => {
  install();
  if (view === 'signin') {
    return <SignInDemo />;
  }
  return <App />;
};

export { navigate };
export default FrameApp;
