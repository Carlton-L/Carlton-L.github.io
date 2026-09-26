/**
 * The states the failure explorer walks through, in order. Each runs one demo name through the
 * product's own check (src/lib/dns/testNames.ts scripts the name), so what the frame shows is the
 * product's answer. Titles and text are portfolio copy, checked against
 * domainclaim-case-study/04_GROUND_TRUTH.md.
 *
 * move: whose move is next once the check lands. 'time' = waiting, 'you' = the person, 'done'.
 */
export const MOVES = {
  time: 'WAITING',
  you: 'YOUR MOVE',
  done: 'PASSES',
};

export const SCENES = [
  {
    id: 'not-found',
    name: 'record-not-found.test',
    move: 'time',
    title: 'The record is not there yet',
    text: 'The first check on a new claim always misses, because nobody has added the record yet. A cross here would report the product working as a fault, so the step waits and the check asks again.',
    source: 'Friction log, Sep 14: a cross was shown on a step nobody had acted on.',
    tests: 'steps.test.ts · evaluate.test.ts',
  },
  {
    id: 'other-txt',
    name: 'other-txt.test',
    move: 'time',
    title: 'Another service’s record is at the name',
    text: 'A wildcard often answers every name with some other service’s record. Only a DomainClaim record counts as finding the record, so this waits like an empty name.',
    source: 'Wildcard behaviour, from the research pass.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'unreachable',
    name: 'nameservers-unreachable.test',
    move: 'time',
    title: 'The nameservers do not answer',
    text: 'No nameserver answered inside two seconds. From one place, slow and down look the same, so this waits and asks again.',
    source: 'Measured, Sep 12: a dead nameserver costs a four second timeout.',
    tests: 'evaluate.test.ts · trace.test.ts',
  },
  {
    id: 'value-mismatch',
    name: 'value-mismatch.test',
    move: 'you',
    title: 'The value does not match',
    text: 'A partial paste, or a record left over from an earlier claim. The value found sits above the one to use, with the difference marked.',
    source: 'Friction log, Sep 14: the value could not be read against the panel.',
    tests: 'evaluate.test.ts · difference.test.ts',
  },
  {
    id: 'appended-zone',
    name: 'appended-zone.test',
    move: 'you',
    title: 'The domain was added to the name twice',
    text: 'Most DNS panels add your domain to the name you type, so a full name gets saved twice. The check looks one level down, finds it, and gives the short name to use.',
    source: 'Measured on Squarespace, Sep 12. Its panel also refuses the trailing dot the usual advice suggests.',
    tests: 'diagnose.test.ts · evaluate.test.ts',
  },
  {
    id: 'no-txt',
    name: 'no-txt-at-name.test',
    move: 'you',
    title: 'The record was saved as another type',
    text: 'The name exists with another kind of record on it. Keep that record and add the TXT record beside it.',
    source: 'Failure catalogue, from the research pass.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'zone-not-found',
    name: 'zone-not-found.test',
    move: 'you',
    title: 'The domain has no DNS host',
    text: 'The check walks up from the name until a level has nameservers. None at any level means no DNS host is set for the domain yet.',
    source: 'RFC 1034: a subdomain can be delegated, so the zone is found by walking up.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'expired',
    name: 'expired.test',
    move: 'you',
    title: 'The record expired',
    text: 'A record is valid for seven days and carries its expiry in the value. An expired claim asks DNS nothing and offers a new record.',
    source: 'IETF domain verification draft: stating how long a token is valid is its one MUST.',
    tests: 'evaluate.test.ts · messages.test.ts',
  },
  {
    id: 'held',
    name: 'verified.test',
    heldElsewhere: true,
    move: 'you',
    title: 'Another account holds the name',
    text: 'The demo first gives this name to a second account. This account then proves control, and the one-owner rule in the database refuses the verify. Proof alone never moves a name.',
    source: 'RFC decision: claiming is separate from proving.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'one-dead',
    name: 'one-dead-nameserver.test',
    move: 'done',
    title: 'One nameserver is down',
    text: 'One of three nameservers hangs. Every server is asked at once, the other two answer, and the claim verifies. The person claiming the name could not fix the dead one, so it is not reported.',
    source: 'Measured timeouts, Sep 12.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'crowded',
    name: 'crowded-name.test',
    move: 'done',
    title: 'The record shares the name',
    text: 'The record sits beside SPF and Google records at the same name. The check matches any record, in any order.',
    source: 'Measured, Sep 12: record order is not stable between resolvers.',
    tests: 'evaluate.test.ts · txt.test.ts',
  },
  {
    id: 'flaky',
    name: 'flaky.test',
    move: 'done',
    title: 'The record went missing, then came back',
    text: 'Ownership keeps being checked after it is proved. A name whose record stops answering moves to At risk, and back when the record returns. This record flips on every check: press Check now to see it.',
    source: 'Research: verified status decays silently when a DNS migration drops the record.',
    tests: 'evaluate.test.ts',
  },
  {
    id: 'verified',
    name: 'verified.test',
    move: 'done',
    title: 'Verified',
    text: 'All three nameservers return the record. Five steps pass, and the name is held by this account.',
    source: '',
    tests: 'evaluate.test.ts · stream.test.ts',
  },
];
