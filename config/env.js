const IS_PROD = process.env.NODE_ENV === 'production';

function requireProd(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required env var in production: ${name}`);
  }
  return String(v).trim();
}

/**
 * Validate environment for production. Call after dotenv loads.
 */
function validateProductionEnv() {
  if (!IS_PROD) return;
  requireProd('MONGODB_URI');
  requireProd('SESSION_SECRET');
}

module.exports = { IS_PROD, validateProductionEnv };
