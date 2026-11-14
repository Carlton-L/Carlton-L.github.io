/**
 * EngineWorkflowView — the case study's workflow demo: the ported Engine Blocks prototype in its own
 * document (/demos/engine/, ProductFrame), drawn at 1100 × 780 and scaled to the VIEW (wider made the
 * board's text too small once scaled). On phones it draws at the real width, 960 tall.
 *
 * The frame has a fixed size at every width, so nothing the visitor does inside it changes the
 * page's height. A RECREATION on a made-up run (the Engine is recreation-only).
 */
import DemoFrame from '../_shared/DemoFrame.jsx';
import ProductFrame from '../_shared/ProductFrame.jsx';

export default function EngineWorkflowView() {
  return (
    <DemoFrame title="SMR_DATA_CENTRE_OUTLOOK.run · made-up run" label="recreation" fill={false}>
      <ProductFrame
        src="/demos/engine/"
        width={1100}
        height={780}
        phoneHeight={960}
        title="The Futurity Engine workflow view, recreated on a made-up run"
        revealOn="ready"
        messageKey="eng"
        drawn={(doc) => !!doc.querySelector('.react-flow__node')}
      />
    </DemoFrame>
  );
}
