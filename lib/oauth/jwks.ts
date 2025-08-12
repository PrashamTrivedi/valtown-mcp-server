import { OAuthConfig } from "../types.ts";

export interface JWK {
  kty: string;
  use: string;
  kid: string;
  alg: string;
  n: string;
  e: string;
}

export interface JWKSet {
  keys: JWK[];
}

export async function generateJWKS(config: OAuthConfig): Promise<JWKSet> {
  // Import the public key to extract parameters
  const publicKey = await importPublicKey(config.jwtPublicKey);
  
  // Export key to get raw key data
  const keyData = await crypto.subtle.exportKey("jwk", publicKey);
  
  const jwk: JWK = {
    kty: "RSA",
    use: "sig",
    kid: "valtown-mcp-2024", // Key ID for this deployment
    alg: "RS256",
    n: keyData.n!,
    e: keyData.e!
  };

  return {
    keys: [jwk]
  };
}

async function importPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = publicKeyPem
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true, // extractable - needed for JWK export
    ['verify']
  );
}