import { OAuthConfig } from "../types.ts";
import { getCryptoKeyPair } from "../../config.ts";

export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export async function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): Promise<boolean> {
  const generatedChallenge = await generateCodeChallenge(codeVerifier);
  return generatedChallenge === codeChallenge;
}

export async function generateJWT(payload: any, config: OAuthConfig): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iss: config.issuerUrl,
    iat: now,
    exp: now + config.accessTokenTtl
  };

  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(jwtPayload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Use cached CryptoKey objects for auto-generated keys, or import for user-provided keys
  const cryptoKeys = getCryptoKeyPair();
  let privateKey: CryptoKey;
  
  if (cryptoKeys && config.jwtPrivateKey.startsWith('{')) {
    // Auto-generated keys - use cached CryptoKey
    privateKey = cryptoKeys.privateKey;
  } else {
    // User-provided keys - import them
    privateKey = await importPrivateKey(config.jwtPrivateKey);
  }
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${unsignedToken}.${signatureB64}`;
}

export async function verifyJWT(token: string, config: OAuthConfig): Promise<any> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid JWT format');
  }

  const publicKey = await importPublicKey(config.jwtPublicKey);
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  const signature = new Uint8Array(
    atob(signatureB64).split('').map(c => c.charCodeAt(0))
  );

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signature,
    new TextEncoder().encode(unsignedToken)
  );

  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  const payload = JSON.parse(atob(payloadB64));
  
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT token expired');
  }

  return payload;
}

async function importPrivateKey(privateKey: string): Promise<CryptoKey> {
  // Handle JWK format (auto-generated keys) vs PEM format (user-provided)
  if (privateKey.startsWith('{')) {
    // JWK format - parse and import
    const jwk = JSON.parse(privateKey);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  } else {
    // PEM format - existing logic
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    return await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
  }
}

async function importPublicKey(publicKey: string): Promise<CryptoKey> {
  // Handle JWK format (auto-generated keys) vs PEM format (user-provided)
  if (publicKey.startsWith('{')) {
    // JWK format - parse and import
    const jwk = JSON.parse(publicKey);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );
  } else {
    // PEM format - existing logic
    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemContents = publicKey
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
      false,
      ['verify']
    );
  }
}

export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const privateKeyDer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const publicKeyDer = await crypto.subtle.exportKey('spki', keyPair.publicKey);

  const privateKeyB64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyDer)));
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyDer)));

  const privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKeyB64}\n-----END PRIVATE KEY-----`;
  const publicKey = `-----BEGIN PUBLIC KEY-----\n${publicKeyB64}\n-----END PUBLIC KEY-----`;

  return { publicKey, privateKey };
}