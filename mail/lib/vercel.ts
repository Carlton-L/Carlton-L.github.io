// The request and response types Vercel's Node runtime passes to a function in api/. Vercel
// supplies the runtime at deploy (and to `vercel dev`); this project only needs the types, so
// they live here and @vercel/node is not a dependency. Only the members api/ and lib/ use.
import type { IncomingMessage, ServerResponse } from 'node:http';

export type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body: any;
};

export type VercelResponse = ServerResponse & {
  status(code: number): VercelResponse;
  send(body: unknown): VercelResponse;
  json(body: unknown): VercelResponse;
};
