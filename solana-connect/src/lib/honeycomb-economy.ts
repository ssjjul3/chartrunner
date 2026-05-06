/**
 * ChartRunner × Honeycomb Protocol — game-economy adapter
 * ========================================================
 *
 * Honeycomb provides on-chain primitives for the parts of ChartRunner that
 * `chartrunner_registry` is currently re-inventing in-house: characters,
 * missions, resources, recipes, staking. Every primitive is routed through
 * Honeycomb's Edge Client and stored as state-compressed accounts (Merkle
 * tree leaves), giving us 99.5%+ cost reduction vs. plain Solana accounts
 * (per docs.honeycombprotocol.com — Cost Comparison page).
 *
 * SOURCE OF TRUTH:
 *   docs.honeycombprotocol.com
 *   github.com/honeycomb-protocol/edge-client (npm: @honeycomb-protocol/edge-client)
 *
 * STATUS:
 *   v0.9.10 — call signatures land per the docs surface. Stubs throw at
 *   runtime so the rest of the React app keeps type-checking; flip to the
 *   real Edge Client by uncommenting the imports below after
 *   `npm install @honeycomb-protocol/edge-client` succeeds. Same
 *   documentation-as-code pattern as phoenix-rise.ts and
 *   magicblock-ephemeral.ts.
 *
 * USAGE FROM THE GAME:
 *   The HTML prototype hits /solana-connect/?action=honey-* with the
 *   payload encoded in the URL. The React action handler in App.tsx
 *   parses, calls a function from this file, asks the wallet adapter to
 *   sign-and-send, and bounces back to /play/?honeyAction=ok&sig=<tx>.
 *   Same redirect-and-return pattern as crRegistry.recordRun.
 *
 * INSTALL:
 *   npm install @honeycomb-protocol/edge-client \
 *               @solana/wallet-adapter-react \
 *               @solana/wallet-adapter-base \
 *               bs58
 *
 * MAPPING — what Honeycomb replaces in ChartRunner today:
 *   chartrunner_registry::Profile        → Honeycomb User + Profile
 *   chartrunner_registry::record_run     → NectarMissions participate/recall
 *   $CRDS / $RUN balance                 → ResourceManager mint/burn
 *   ghost / leaderboard achievements     → CharacterManager traits
 *   builder royalties / staking rewards  → NectarStaking pools
 *
 * Once this adapter is wired, large parts of chartrunner_registry can be
 * deprecated — Honeycomb already ships the on-chain accounting we need.
 */

import { type PublicKey, type Transaction } from '@solana/web3.js';

// Real imports — uncomment after `npm install @honeycomb-protocol/edge-client`
// succeeds. As of 2026-05-06 we keep them stubbed so the React app builds
// before the package lands in our lockfile.
//
// import createEdgeClient, {
//   RewardKind,
//   ResourceManagerPermissionInput,
//   CharacterManagerPermissionInput,
//   NectarMissionsPermissionInput,
//   NectarStakingPermissionInput,
// } from '@honeycomb-protocol/edge-client';
// import { sendClientTransactions } from '@honeycomb-protocol/edge-client/client/walletHelpers';
// import { useWallet } from '@solana/wallet-adapter-react';
// import base58 from 'bs58';

// ─── Local enum stubs ─────────────────────────────────────────────────────
// Mirror the @honeycomb-protocol/edge-client exports so the rest of this
// file type-checks. Replace with the real imports above once the package
// is installable.

export const RewardKind = {
  Resource: 'Resource' as const,
  Xp:       'Xp'       as const,
};

export const ResourceManagerPermissionInput = {
  CreateResources: 'CreateResources' as const,
  MintResources:   'MintResources'   as const,
  BurnResources:   'BurnResources'   as const,
  ClaimFaucet:     'ClaimFaucet'     as const,
  CreateRecipe:    'CreateRecipe'    as const,
};

export const CharacterManagerPermissionInput = {
  ManageAssemblerConfig:  'ManageAssemblerConfig'  as const,
  ManageCharacterModels:  'ManageCharacterModels'  as const,
  AssignCharacterTraits:  'AssignCharacterTraits'  as const,
};

export const NectarMissionsPermissionInput = {
  ManageMissionPool:           'ManageMissionPool'           as const,
  WithdrawMissionPoolRewards:  'WithdrawMissionPoolRewards'  as const,
};

export const NectarStakingPermissionInput = {
  ManageStakingPool:           'ManageStakingPool'           as const,
  WithdrawStakingPoolRewards:  'WithdrawStakingPoolRewards'  as const,
};

type EdgeClientStub = {
  authRequest:                          (..._a: any[]) => Promise<any>;
  authConfirm:                          (..._a: any[]) => Promise<any>;
  createNewProfileTransaction:          (..._a: any[]) => Promise<any>;
  createCreateMissionPoolTransaction:   (..._a: any[]) => Promise<any>;
  createCreateMissionTransaction:       (..._a: any[]) => Promise<any>;
  createParticipateMissionTransaction:  (..._a: any[]) => Promise<any>;
  createRecallMissionTransaction:       (..._a: any[]) => Promise<any>;
  createCreateCharacterTransaction:     (..._a: any[]) => Promise<any>;
  createMintResourceTransaction:        (..._a: any[]) => Promise<any>;
  createBurnResourceTransaction:        (..._a: any[]) => Promise<any>;
  createDelegateAuthorityTransaction:   (..._a: any[]) => Promise<any>;
};

function createEdgeClientStub(_: string): EdgeClientStub {
  const fail = (_label: string) => () => {
    throw new Error('install @honeycomb-protocol/edge-client');
  };
  return {
    authRequest:                         fail('authRequest'),
    authConfirm:                         fail('authConfirm'),
    createNewProfileTransaction:         fail('createNewProfileTransaction'),
    createCreateMissionPoolTransaction:  fail('createCreateMissionPoolTransaction'),
    createCreateMissionTransaction:      fail('createCreateMissionTransaction'),
    createParticipateMissionTransaction: fail('createParticipateMissionTransaction'),
    createRecallMissionTransaction:      fail('createRecallMissionTransaction'),
    createCreateCharacterTransaction:    fail('createCreateCharacterTransaction'),
    createMintResourceTransaction:       fail('createMintResourceTransaction'),
    createBurnResourceTransaction:       fail('createBurnResourceTransaction'),
    createDelegateAuthorityTransaction:  fail('createDelegateAuthorityTransaction'),
  };
}
async function sendClientTransactions(
  _client: EdgeClientStub,
  _wallet: any,
  _txResponse: any,
): Promise<{ signature: string }> {
  throw new Error('install @honeycomb-protocol/edge-client');
}

// ─── Configuration ─────────────────────────────────────────────────────────
// Honeynet (devnet-equivalent test RPC) endpoints. ChartRunner runs on
// Honeynet during the Frontier hackathon and rotates to mainnet after
// the audit + first paid match.
//   Edge Client RPC : https://edge.test.honeycombprotocol.com
//   Honeynet RPC    : https://rpc.test.honeycombprotocol.com
//   Faucet (SOL)    : `solana airdrop <amount> <wallet> -u https://rpc.test.honeycombprotocol.com`

export const HONEYCOMB_EDGE_URL = 'https://edge.test.honeycombprotocol.com';
export const HONEYCOMB_RPC_URL  = 'https://rpc.test.honeycombprotocol.com';

// ChartRunner's project address on Honeycomb — replace with the real
// PublicKey once we run the create-project flow on Honeynet. Until then
// this is a placeholder; transactions referencing it will fail.
export const CHARTRUNNER_PROJECT_ADDRESS_PLACEHOLDER =
  'CRPHoneyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// Resource handles used by the game. The real PublicKeys land here after
// `createResource` runs once during project bootstrap (see scripts/bootstrap).
export const HC_RESOURCE_CRDS_PLACEHOLDER = 'CRDSResourceXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
export const HC_RESOURCE_RUN_PLACEHOLDER  = 'RUNResourceXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

// ─── Edge Client construction ─────────────────────────────────────────────
// The Edge Client is a single object that fronts every Honeycomb service
// (Hive Control, Resource Manager, Character Manager, Nectar Missions,
// Nectar Staking). One instance per app is enough.

export function createHoneycombEdgeClient(edgeUrl: string = HONEYCOMB_EDGE_URL): EdgeClientStub {
  // Real call (after install):
  //   return createEdgeClient(edgeUrl);
  return createEdgeClientStub(edgeUrl);
}

// ─── Authentication ───────────────────────────────────────────────────────
// 2-step process per docs.honeycombprotocol.com → Edge Client → Authenticating.
//   1. authRequest(userPublicKey)        → returns a message to sign
//   2. wallet.signMessage(message)        → user approves in their wallet
//   3. authConfirm(wallet, signature)     → returns an accessToken
// The accessToken is stamped onto subsequent Edge Client calls via
// `fetchOptions.headers.authorization = 'Bearer ${accessToken}'`.

export async function honeycombAuthenticate(
  client: EdgeClientStub,
  wallet: { publicKey: PublicKey | null; signMessage?: (m: Uint8Array) => Promise<Uint8Array> },
): Promise<{ accessToken: string; userPublicKey: string }> {
  if (!wallet.publicKey || !wallet.signMessage) {
    throw new Error('honeycombAuthenticate: wallet not connected or does not support signMessage');
  }
  const userPublicKey = wallet.publicKey.toString();

  // Step 1 — request the auth message
  const authReq = await client.authRequest({ wallet: userPublicKey });
  const message: string = authReq?.authRequest?.message
                       ?? authReq?.authRequest
                       ?? '';

  // Step 2 — sign it
  const encoded   = new TextEncoder().encode(message);
  const signedRaw = await wallet.signMessage(encoded);
  // base58.encode(signedRaw) once bs58 is imported
  const signature = honeycombBase58Stub(signedRaw);

  // Step 3 — confirm and pull the access token
  const confirm = await client.authConfirm({ wallet: userPublicKey, signature });
  const accessToken: string = confirm?.authConfirm?.accessToken ?? confirm?.accessToken;
  if (!accessToken) throw new Error('honeycombAuthenticate: no accessToken in authConfirm response');

  return { accessToken, userPublicKey };
}
function honeycombBase58Stub(_b: Uint8Array): string {
  throw new Error('install bs58 (and uncomment the real base58.encode call)');
}

// ─── Profile creation ─────────────────────────────────────────────────────
// One Honeycomb Profile per (project, wallet) pair. Created once after
// auth, then reused. The Profile holds the trader's display name, bio,
// pfp URL, and (downstream) their character + resource balances.

export async function honeycombCreateProfile(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    userPublicKey: string;
    project?: string;
    name: string;
    bio?: string;
    pfp?: string;
  },
): Promise<{ tx: Transaction | string; serialized: any }> {
  const project = args.project ?? CHARTRUNNER_PROJECT_ADDRESS_PLACEHOLDER;
  const resp = await client.createNewProfileTransaction({
    project,
    info: {
      name: args.name,
      bio:  args.bio ?? '',
      pfp:  args.pfp ?? '',
    },
    payer: args.userPublicKey,
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
  return { tx: resp?.createNewProfileTransaction?.tx ?? resp?.tx, serialized: resp };
}

// ─── Mission lifecycle ────────────────────────────────────────────────────
// One ChartRunner trading session = one Honeycomb mission. Lifecycle:
//
//   1. (admin, once)  createMissionPool({ project, characterModel })
//   2. (admin, once)  createMission({ pool, name, cost, duration, rewards })
//   3. (player)       participateMission({ mission, character })
//                       — locks the character + cost for `duration` seconds
//   4. (player)       recallMission({ mission, character })
//                       — after `duration`, returns the character + claims rewards
//
// In ChartRunner terms: "play a Nectar mission" ↔ "submit a run for grading".
// The reward is paid out as a Honeycomb resource (XP, $CRDS, $RUN, …).

export async function honeycombCreateMissionPool(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    project?: string;
    payer: string;
    authority: string;
    characterModel: string;
    name?: string;
  },
) {
  const project = args.project ?? CHARTRUNNER_PROJECT_ADDRESS_PLACEHOLDER;
  return client.createCreateMissionPoolTransaction({
    data: {
      name:           args.name ?? 'ChartRunner Mission Pool',
      project,
      payer:          args.payer,
      authority:      args.authority,
      characterModel: args.characterModel,
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

export async function honeycombCreateMission(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    missionPool: string;
    project?: string;
    payer: string;
    authority: string;
    name: string;
    /** Cost the player pays to enter — resource address + amount as decimal string. */
    cost: { address: string; amount: string };
    /** Mission duration in seconds, decimal string. */
    durationSec: string;
    /** Reward kind + payout. Use RewardKind.Resource or RewardKind.Xp. */
    rewards: Array<{ kind: keyof typeof RewardKind; min: string; max: string; resource?: string }>;
    /** Minimum XP required to enter this mission. */
    minXp?: string;
  },
) {
  return client.createCreateMissionTransaction({
    data: {
      name:           args.name,
      project:        args.project ?? CHARTRUNNER_PROJECT_ADDRESS_PLACEHOLDER,
      cost:           args.cost,
      duration:       args.durationSec,
      minXp:          args.minXp ?? '0',
      rewards:        args.rewards.map(r => ({
        kind: r.kind,
        min:  r.min,
        max:  r.max,
        resource: r.resource ?? null,
      })),
      missionPool:    args.missionPool,
      authority:      args.authority,
      payer:          args.payer,
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

export async function honeycombParticipateMission(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    mission: string;
    character: string;
    payer: string;
    /** ChartRunner-side run metadata (asset, score, sharpe). Stored as
     *  on-chain payload; participate() commits the entry, recall() pays
     *  out reward based on this. */
    runPayload?: { asset: string; score: number; sharpeX100: number };
  },
) {
  return client.createParticipateMissionTransaction({
    data: {
      mission:   args.mission,
      character: args.character,
      payer:     args.payer,
      payload:   args.runPayload ?? null,
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

export async function honeycombRecallMission(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    mission: string;
    character: string;
    payer: string;
  },
) {
  return client.createRecallMissionTransaction({
    data: {
      mission:   args.mission,
      character: args.character,
      payer:     args.payer,
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

// ─── Character creation ───────────────────────────────────────────────────
// ChartRunner mints one Honeycomb character per trader. Traits hold
// progression: rank, primitives unlocked, ghost-quality multiplier.
// Characters are state-compressed (Merkle-tree leaves), so creation
// costs ~0.0024 SOL → ~0.0000 SOL after compression (99.83% reduction
// per Cost Comparison page).

export async function honeycombCreateCharacter(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    characterModel: string;
    owner: string;          // wallet that will own the character
    payer: string;          // wallet that pays the (tiny, compressed) tx cost
    traits?: Record<string, string>;
  },
) {
  return client.createCreateCharacterTransaction({
    data: {
      characterModel: args.characterModel,
      owner:          args.owner,
      payer:          args.payer,
      attributes:     args.traits ?? {
        rank:        'Bronze',
        primitives:  'bracket,oco',
        ghostFactor: '1.00',
      },
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

// ─── Resource mint / burn ─────────────────────────────────────────────────
// $CRDS and $RUN are Honeycomb resources, not raw SPL tokens — they cost
// ~0.0000001 SOL per mint at the compressed scale. The ChartRunner backend
// is the delegated authority for MintResources and BurnResources (see
// honeycombDelegateChartRunnerAuthority below).
//
// Mint   = "this run earned 250 $CRDS"
// Burn   = "the player just exchanged 1000 $CRDS for 1 $RUN"
// Faucet = "first-time player gets 100 $CRDS to start"

export async function honeycombMintResource(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    resource: string;     // e.g. HC_RESOURCE_CRDS_PLACEHOLDER
    owner: string;        // recipient
    amount: string;       // decimal string in resource's native units
    authority: string;    // delegated MintResources authority
    payer: string;
  },
) {
  return client.createMintResourceTransaction({
    data: {
      resource:  args.resource,
      owner:     args.owner,
      amount:    args.amount,
      authority: args.authority,
      payer:     args.payer,
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

export async function honeycombBurnResource(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    resource: string;
    owner: string;
    amount: string;
    authority: string;    // delegated BurnResources authority (or owner)
    payer: string;
  },
) {
  return client.createBurnResourceTransaction({
    data: {
      resource:  args.resource,
      owner:     args.owner,
      amount:    args.amount,
      authority: args.authority,
      payer:     args.payer,
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

// ─── Delegation Permissions ───────────────────────────────────────────────
// One-time admin call. The ChartRunner backend wallet gets delegated:
//   ResourceManager.{CreateResources, MintResources, BurnResources, ClaimFaucet, CreateRecipe}
//   CharacterManager.{ManageCharacterModels, AssignCharacterTraits}
//   NectarMissions.{ManageMissionPool, WithdrawMissionPoolRewards}
// so the prototype can mint $CRDS / assign traits / settle missions on
// behalf of players without round-tripping every action through the
// project owner's seed phrase.

export async function honeycombDelegateChartRunnerAuthority(
  client: EdgeClientStub,
  args: {
    accessToken: string;
    project?: string;
    authority: string;       // project owner (signer)
    delegate: string;        // ChartRunner backend wallet
    payer: string;
  },
) {
  return client.createDelegateAuthorityTransaction({
    authority: args.authority,
    delegate:  args.delegate,
    project:   args.project ?? CHARTRUNNER_PROJECT_ADDRESS_PLACEHOLDER,
    payer:     args.payer,
    serviceDelegations: {
      ResourceManager: [
        { permission: ResourceManagerPermissionInput.CreateResources },
        { permission: ResourceManagerPermissionInput.MintResources   },
        { permission: ResourceManagerPermissionInput.BurnResources   },
        { permission: ResourceManagerPermissionInput.ClaimFaucet     },
        { permission: ResourceManagerPermissionInput.CreateRecipe    },
      ],
      CharacterManager: [
        { index: 0, permission: CharacterManagerPermissionInput.ManageCharacterModels },
        { index: 0, permission: CharacterManagerPermissionInput.AssignCharacterTraits  },
      ],
      NectarMissions: [
        { permission: NectarMissionsPermissionInput.ManageMissionPool          },
        { permission: NectarMissionsPermissionInput.WithdrawMissionPoolRewards },
      ],
    },
  }, {
    fetchOptions: { headers: { authorization: `Bearer ${args.accessToken}` } },
  });
}

// ─── Wallet send helper ───────────────────────────────────────────────────
// Wraps `sendClientTransactions(client, wallet, txResponse)` per
// docs.honeycombprotocol.com → Edge Client → Sending Serialized
// Transactions. Handles the case where the response is an array (mission
// + reward + recall coalesced) so the React caller never has to.

export async function honeycombSend(
  client: EdgeClientStub,
  wallet: any,
  txResponse: any,
): Promise<{ signature: string }> {
  return sendClientTransactions(client, wallet, txResponse);
}

// ─── End ──────────────────────────────────────────────────────────────────
