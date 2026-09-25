// Entry of the demo document: the product's stylesheet, then the app or the sign-in demo.
import '../vendor/src/app/globals.css';
import FrameApp from './FrameApp';

const FrameEntry = () => {
  const view = new URLSearchParams(window.location.search).get('view') === 'signin' ? 'signin' : 'app';
  return <FrameApp view={view} />;
};

export default FrameEntry;
