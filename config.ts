import {config as dotenvConfig} from "https://deno.land/x/dotenv@v3.2.2/mod.ts"
import * as path from "jsr:@std/path"
import {getCliAvailability} from "./lib/vtCli.ts"
import {Config, OAuthConfig} from "./lib/types.ts"
export async function loadConfig(remoteMode = false): Promise<Config> {
  if (remoteMode) {
    // For remote: expect token in request headers, use local prompt file
    const oauthConfig = await loadOAuthConfig();
    
    return {
      apiToken: null, // Will be set from headers
      apiBase: "https://api.val.town",
      cli: {
        preferCli: false,
        path: "vt",
      },
      prompts: {
        valleyPath: `${import.meta.dirname}/prompts/valley.txt`, // Use local file in deployment
        defaultValleyPath: `${import.meta.dirname}/prompts/valley.txt`,
      },
      oauth: oauthConfig,
    };
  }

  // Existing local config logic
  dotenvConfig({ export: true });

  const API_TOKEN = Deno.env.get("VAL_TOWN_API_TOKEN");
  if (!API_TOKEN) {
    console.error("Error: VAL_TOWN_API_TOKEN environment variable is required");
    Deno.exit(1);
  }

  // CLI preference configuration
  const PREFER_CLI = Deno.env.get("VAL_TOWN_PREFER_CLI") !== "false"; // Default to true
  const CLI_PATH = Deno.env.get("VAL_TOWN_CLI_PATH") || "vt"; // Default to "vt" in PATH
  // Prompt file paths (can be absolute or relative to CWD)
  const VALLEY_PROMPT_PATH = Deno.env.get("VALLEY_PROMPT_PATH");
  const useCliIfAvailable = PREFER_CLI ?? false;
  const cliAvailable = useCliIfAvailable && await getCliAvailability();
  const defaultPromptPath = `${import.meta.dirname}/prompts/${
    cliAvailable ? "valley.txt" : "valley_local.txt"
  }`;

  // Resolve paths relative to the current working directory if they're not absolute
  const resolvedValleyPath = VALLEY_PROMPT_PATH
    ? (path.isAbsolute(VALLEY_PROMPT_PATH)
      ? VALLEY_PROMPT_PATH
      : defaultPromptPath)
    : undefined;
  const oauthConfig = await loadOAuthConfig();

  return {
    apiToken: API_TOKEN,
    apiBase: "https://api.val.town",
    cli: {
      preferCli: PREFER_CLI,
      path: CLI_PATH,
    },
    prompts: {
      valleyPath: resolvedValleyPath,
      // Default paths included with the binary
      defaultValleyPath: defaultPromptPath,
    },
    oauth: oauthConfig,
  };
}

async function loadOAuthConfig(): Promise<OAuthConfig> {
  // OAuth is now enabled by default for frictionless setup
  const OAUTH_ENABLED = Deno.env.get("OAUTH_ENABLED") !== "false"; // Default to true
  
  if (!OAUTH_ENABLED) {
    return {
      enabled: false,
      issuerUrl: "",
      jwtPrivateKey: "",
      jwtPublicKey: "",
      encryptionKey: "",
      accessTokenTtl: 3600,
      refreshTokenTtl: 2592000,
    };
  }

  // Generate keys automatically if not provided
  const keyPair = await generateKeyPairIfNeeded();
  const encryptionKey = generateEncryptionKeyIfNeeded();

  const OAUTH_ACCESS_TOKEN_TTL = parseInt(Deno.env.get("OAUTH_ACCESS_TOKEN_TTL") || "3600");
  const OAUTH_REFRESH_TOKEN_TTL = parseInt(Deno.env.get("OAUTH_REFRESH_TOKEN_TTL") || "2592000");

  return {
    enabled: true,
    issuerUrl: "", // Will be set dynamically from request
    jwtPrivateKey: keyPair.privateKey,
    jwtPublicKey: keyPair.publicKey,
    encryptionKey: encryptionKey,
    accessTokenTtl: OAUTH_ACCESS_TOKEN_TTL,
    refreshTokenTtl: OAUTH_REFRESH_TOKEN_TTL,
  };
}

// Global key storage for session persistence - store actual CryptoKey objects
let _cryptoKeyPair: { privateKey: CryptoKey; publicKey: CryptoKey } | null = null;
let _keyPairStrings: { privateKey: string; publicKey: string } | null = null;
let _encryptionKey: string | null = null;

async function generateKeyPairIfNeeded(): Promise<{ privateKey: string; publicKey: string }> {
  // Use provided keys if available
  const OAUTH_JWT_PRIVATE_KEY = Deno.env.get("OAUTH_JWT_PRIVATE_KEY");
  const OAUTH_JWT_PUBLIC_KEY = Deno.env.get("OAUTH_JWT_PUBLIC_KEY");
  
  if (OAUTH_JWT_PRIVATE_KEY && OAUTH_JWT_PUBLIC_KEY) {
    return {
      privateKey: OAUTH_JWT_PRIVATE_KEY,
      publicKey: OAUTH_JWT_PUBLIC_KEY,
    };
  }

  // Generate keys if not cached
  if (!_keyPairStrings || !_cryptoKeyPair) {
    console.log("Generating RSA key pair for OAuth JWT signing...");
    
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );

    // Store the actual CryptoKey objects
    _cryptoKeyPair = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    };

    // Also store as JWK strings for metadata endpoints
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

    _keyPairStrings = {
      privateKey: JSON.stringify(privateKeyJwk),
      publicKey: JSON.stringify(publicKeyJwk),
    };
  }

  return _keyPairStrings;
}

// Export function to get actual CryptoKey objects for JWT signing
export function getCryptoKeyPair(): { privateKey: CryptoKey; publicKey: CryptoKey } | null {
  return _cryptoKeyPair;
}

function generateEncryptionKeyIfNeeded(): string {
  // Use provided key if available
  const OAUTH_ENCRYPTION_KEY = Deno.env.get("OAUTH_ENCRYPTION_KEY");
  if (OAUTH_ENCRYPTION_KEY) {
    return OAUTH_ENCRYPTION_KEY;
  }

  // Generate key if not cached
  if (!_encryptionKey) {
    console.log("Generating encryption key for OAuth data...");
    _encryptionKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  return _encryptionKey;
}