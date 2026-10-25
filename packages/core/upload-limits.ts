export const IMAGE_ENGINE_MAX_BYTES = 10 * 1024 * 1024;
// Leave room for multipart headers under Vercel's 4.5 MB request/response limit.
export const VERCEL_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const hostedOnVercel = () => process.env.VERCEL === '1';
export const inlineImageLimit = () => hostedOnVercel() ? VERCEL_IMAGE_MAX_BYTES : IMAGE_ENGINE_MAX_BYTES;
