// Port shim for `server-only`. In the product this import makes `next build` fail if a client file
// reaches a server module. Here the "server" runs in the demo's own document, so it is empty.
export {};
