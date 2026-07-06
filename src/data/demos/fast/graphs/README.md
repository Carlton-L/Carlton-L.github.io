# FAST demo graphs — real drop-ins

Export a sanitized /graphs/simple download as JSON in the shape
`{ meta: { label, type, summary, indices? }, nodes: [...], links: [...] }`
and save it here as `<key>.json`. fast-network.js picks it up automatically:
same-named keys override the synthetic set, new keys join the traversal space
(reachable once some node carries `to: "<key>"`).

Sanitization checklist: no client names, no internal URLs, no user data;
replace ent_url values with public or example.org links.

Performance note: the demo's canvas force sim is O(n²) per frame — keep
drop-ins under ~150 nodes. The full digital-twin export is 1,947 nodes on
page 1; sample it (top-degree per type) before saving here.
