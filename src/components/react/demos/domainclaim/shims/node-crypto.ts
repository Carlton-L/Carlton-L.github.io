// Port shim for `node:crypto`, for the one function the claims code uses. Same entropy source the
// browser gives any secure random value.
export const randomBytes = (size: number): Uint8Array => crypto.getRandomValues(new Uint8Array(size));
