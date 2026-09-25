/**
 * The failure explorer's scenes: one demo name each, in the order the explorer plays them.
 * Every name routes to the product's scripted resolver (src/lib/dns/testNames.ts), so the outcome
 * on screen is the product's own. `from` is portfolio copy, checked against
 * domainclaim-case-study/04_GROUND_TRUTH.md.
 *
 * move: whose move is next once the check lands. 'you' = the person, 'time' = waiting, 'done'.
 */
export const GROUPS = [
  { move: 'you', label: 'YOUR MOVE' },
  { move: 'time', label: 'WAITING' },
  { move: 'done', label: 'PASSES' },
];

export const SCENES = [
  {
    id: 'value-mismatch',
    name: 'value-mismatch.test',
    move: 'you',
    from: 'A partial paste, or a record left over from an earlier claim. The value found is shown above the one to use, with the difference marked.',
    source: 'Friction log, Sep 14: the value could not be read against the panel.',
    tests: 'evaluate.test.ts · difference.test.ts',
  },
  {
    id: 'appended-zone',
    name: 'appended-zone.test',
    move: 'you',
    from: 'Most DNS panels add your domain to the name you type, so a full name gets saved twice. The check looks one level down, finds it, and gives the short name to use.',
    source: 'Measured on Squarespace, Sep 12. Its panel also refuses the trailing dot the usual advice suggests.',
    tests: 'diagnose.test.ts · evaluate.test.ts',
  },
  {
    id: 'no-txt',
    name: 'no-txt-at-name.test',
    move: 'you',
    from: 'The name exists with another kind of record on it. Usually the record was saved as the wrong type.',
    source: 'Failure catalogue from the research pass.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'zone-not-found',
    name: 'zone-not-found.test',
    move: 'you',
    from: 'The check walks up from the name until a level has nameservers. None at any level means no DNS host is set for the domain.',
    source: 'RFC 1034: a subdomain can be delegated, so the zone is found by walking up.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'expired',
    name: 'expired.test',
    move: 'you',
    from: 'A record is valid for seven days and carries its expiry in the value. An expired claim asks DNS nothing and offers a new record.',
    source: 'IETF domain verification draft: stating how long a token is valid is its one MUST.',
    tests: 'evaluate.test.ts · messages.test.ts',
  },
  {
    id: 'held',
    name: 'verified.test',
    label: 'held elsewhere',
    heldElsewhere: true,
    move: 'you',
    from: 'The demo first gives this name to a second account. This account then proves control, and the one-owner rule in the database refuses the verify. Proof alone never moves a name.',
    source: 'RFC decision: claiming is separate from proving.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'not-found',
    name: 'record-not-found.test',
    move: 'time',
    from: 'The first check on a new claim always misses, because nobody has added the record yet. A cross here would report the product working as a fault, so the step waits.',
    source: 'Friction log, Sep 14: a cross was shown on a step nobody had acted on.',
    tests: 'steps.test.ts · evaluate.test.ts',
  },
  {
    id: 'other-txt',
    name: 'other-txt.test',
    move: 'time',
    from: "Another service's record answers at this name, often through a wildcard. Only a DomainClaim record counts as finding the record.",
    source: 'Wildcard behaviour from the research pass (ISC).',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'unreachable',
    name: 'nameservers-unreachable.test',
    move: 'time',
    from: 'No nameserver answered inside two seconds. From one place, slow and down look the same, so this waits and asks again.',
    source: 'Measured, Sep 12: a dead nameserver costs a four second timeout.',
    tests: 'evaluate.test.ts · trace.test.ts',
  },
  {
    id: 'one-dead',
    name: 'one-dead-nameserver.test',
    move: 'done',
    from: 'One of three nameservers hangs. Every server is asked at once, the other two answer, and the claim verifies. The person claiming the name could not fix the dead one, so it is not reported.',
    source: 'Measured timeouts, Sep 12.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'crowded',
    name: 'crowded-name.test',
    move: 'done',
    from: 'The record sits beside SPF and Google records at the same name. The check matches any record, in any order.',
    source: 'Measured, Sep 12: record order is not stable between resolvers.',
    tests: 'evaluate.test.ts · txt.test.ts',
  },
  {
    id: 'flaky',
    name: 'flaky.test',
    move: 'done',
    from: 'The record flips on every check. Ownership keeps being checked after it is proved: a name whose record stops answering moves to At risk, and back when it returns. Press Check now to flip it.',
    source: 'Research: verified status decays silently when a DNS migration drops the record.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'verified',
    name: 'verified.test',
    move: 'done',
    from: 'All three nameservers return the record. Five steps, then Verified.',
    source: '',
    tests: 'evaluate.test.ts · stream.test.ts',
  },
];
