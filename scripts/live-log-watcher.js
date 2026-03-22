#!/usr/bin/env node
/**
 * live-log-watcher.js — Arena Tutor-style play-by-play log
 *
 * Produces clean, readable game output:
 *   Turn 1: QuLeR
 *   Precombat Main
 *     QuLeR played Mountain
 *     QuLeR cast Play with Fire
 *     Play with Fire dealt 2 damage to RedTheOrigin
 *     RedTheOrigin's life total is down to 23
 *
 * Usage: node scripts/live-log-watcher.js [--backfill N]
 *   --backfill N  Read last N MB of log on start (default: 0, live only)
 */

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(
  process.env.LOCALAPPDATA || '',
  '..', 'LocalLow', 'Wizards Of The Coast', 'MTGA', 'Player.log'
);
const POLL_MS = 300;
const BACKFILL_MB = (() => {
  const idx = process.argv.indexOf('--backfill');
  return idx >= 0 ? parseFloat(process.argv[idx + 1]) || 5 : 0;
})();

// ── Card Name Database ──────────────────────────────────────────────────────

const cardDb = {};
try {
  const dbPath = path.join(__dirname, '..', 'data', 'arena_grp_ids.json');
  const raw = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const cards = raw.cards || {};
  for (const [id, name] of Object.entries(cards)) {
    cardDb[id] = name;
  }
  console.log(`\x1b[90mLoaded ${Object.keys(cardDb).length} card names from arena_grp_ids.json\x1b[0m`);
} catch (e) {
  console.log(`\x1b[33mWarning: Could not load arena_grp_ids.json — card names may show as grpId:NNNNN\x1b[0m`);
}

// ── State ───────────────────────────────────────────────────────────────────

let lastSize = 0;
let pendingBuffer = '';

// Player/match state
let playerSeatId = 0;
let opponentSeatId = 0;
let playerName = '';
let opponentName = '';
let playerTeamId = 0;
let matchId = '';

// Game state
let currentTurn = 0;
let currentActivePlayer = 0;
let currentPhase = '';
let currentStep = '';
let lifeTotals = {};        // seatId → life
let instanceMap = {};       // instanceId → { grpId, name, ownerSeatId, zoneId }
let zoneMap = {};           // zoneId → { type, ownerSeatId }
let idChanges = {};         // newId → origId (ObjectIdChanged chain)
let printedTurnHeader = 0;  // last turn header printed
let printedPhaseKey = '';   // last phase/step combo printed
let resultPrinted = false;  // prevent duplicate result output
let pendingTurnLine = '';   // buffered turn header (emitted on first action)
let pendingPhaseLine = '';  // buffered phase header (emitted on first action)
let pendingDraws = [];      // [{ instanceId, ownerSeatId }] — draws awaiting name resolution
let gameStarted = false;

// ── Output ──────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[90m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const WHITE = '\x1b[37m';

function emit(text) {
  console.log(text);
}

function flushPendingHeaders() {
  if (pendingTurnLine) {
    emit(pendingTurnLine);
    pendingTurnLine = '';
  }
  if (pendingPhaseLine) {
    emit(pendingPhaseLine);
    pendingPhaseLine = '';
  }
}

function emitAction(text) {
  flushPendingHeaders();
  emit(`  ${text}`);
}

function seatToName(seatId) {
  if (seatId === playerSeatId) return playerName || 'You';
  if (seatId === opponentSeatId) return opponentName || 'Opponent';
  return `Seat${seatId}`;
}

/** Possessive form: "QuLeR's" but "Your" not "You's" */
function seatPossessive(seatId) {
  const name = seatToName(seatId);
  return name === 'You' ? 'Your' : `${name}'s`;
}

/** Verb conjugation: "You play" but "QuLeR plays" */
function seatVerb(seatId, thirdPerson, secondPerson) {
  const name = seatToName(seatId);
  return name === 'You' ? `You ${secondPerson}` : `${name} ${thirdPerson}`;
}

function resolveCardName(grpId) {
  if (!grpId || grpId <= 0) return null;
  const name = cardDb[String(grpId)];
  if (name) return name;
  return null;
}

function instanceName(instanceId) {
  const inst = instanceMap[instanceId];
  if (!inst) return null;
  if (typeof inst.name === 'string' && inst.name) return inst.name;
  const resolved = resolveCardName(inst.grpId);
  if (resolved) {
    inst.name = resolved;
    return resolved;
  }
  return `grpId:${inst.grpId}`;
}

function resolveGrpIdChain(instanceId) {
  // Direct lookup
  const inst = instanceMap[instanceId];
  if (inst && inst.grpId > 0) return inst.grpId;
  // Walk ObjectIdChanged chain
  let current = instanceId;
  const visited = new Set();
  while (idChanges[current] !== undefined) {
    const prev = idChanges[current];
    if (visited.has(prev)) break;
    visited.add(prev);
    const prevInst = instanceMap[prev];
    if (prevInst && prevInst.grpId > 0) return prevInst.grpId;
    current = prev;
  }
  return 0;
}

function instanceNameResolved(instanceId) {
  // Try direct
  const direct = instanceName(instanceId);
  if (direct && !direct.startsWith('grpId:')) return direct;
  // Try chain walking
  const grpId = resolveGrpIdChain(instanceId);
  if (grpId > 0) {
    const name = resolveCardName(grpId);
    if (name) return name;
    return `grpId:${grpId}`;
  }
  return direct || `instance:${instanceId}`;
}

function instanceOwner(instanceId) {
  const inst = instanceMap[instanceId];
  if (inst) return inst.ownerSeatId;
  // Walk chain
  let current = instanceId;
  const visited = new Set();
  while (idChanges[current] !== undefined) {
    const prev = idChanges[current];
    if (visited.has(prev)) break;
    visited.add(prev);
    const prevInst = instanceMap[prev];
    if (prevInst) return prevInst.ownerSeatId;
    current = prev;
  }
  return 0;
}

// ── Phase/Step Mapping ──────────────────────────────────────────────────────

const PHASE_NAMES = {
  'Phase_Main1': 'Precombat Main',
  'Phase_Main2': 'Postcombat Main',
};

const STEP_NAMES = {
  'Step_Draw': 'Draw Step',
  'Step_DeclareAttack': 'Declare Attackers',
  'Step_DeclareBlock': 'Declare Blockers',
  'Step_FirstStrikeDamage': 'First Strike Damage',
  'Step_CombatDamage': 'Combat Damage',
  'Step_End': 'End Step',
};

// Steps to suppress — they rarely have visible actions and just add noise
// Steps to suppress — they rarely have visible actions and just add noise
const SUPPRESSED_STEPS = new Set([
  'Step_Upkeep', 'Step_BeginCombat', 'Step_EndCombat', 'Step_Cleanup',
  'Step_Untap',
]);

function emitTurnAndPhase(turnNumber, activePlayer, phase, step) {
  // Turn header
  if (turnNumber > 0 && turnNumber !== printedTurnHeader ||
      (turnNumber === printedTurnHeader && activePlayer !== currentActivePlayer && turnNumber > 0)) {
    // New turn or new player's turn within same turn number
    if (activePlayer !== currentActivePlayer || turnNumber !== printedTurnHeader) {
      printedTurnHeader = turnNumber;
      currentActivePlayer = activePlayer;
      const name = seatToName(activePlayer);
      pendingTurnLine = `${BOLD}${CYAN}Turn ${turnNumber}: ${name}${RESET}`;
      pendingPhaseLine = '';
      printedPhaseKey = ''; // Reset phase tracking for new turn header
    }
  }

  // Phase/step header
  if (SUPPRESSED_STEPS.has(step)) {
    currentTurn = turnNumber;
    currentPhase = phase;
    currentStep = step;
    return;
  }
  let phaseLabel = '';
  if (PHASE_NAMES[phase]) {
    phaseLabel = PHASE_NAMES[phase];
  } else if (STEP_NAMES[step]) {
    phaseLabel = STEP_NAMES[step];
  }

  if (phaseLabel) {
    const key = `${turnNumber}:${activePlayer}:${phase}:${step}`;
    if (key !== printedPhaseKey) {
      printedPhaseKey = key;
      pendingPhaseLine = `${YELLOW}${phaseLabel}${RESET}`;
    }
  }

  currentTurn = turnNumber;
  currentPhase = phase;
  currentStep = step;
}

// ── JSON Block Extraction ───────────────────────────────────────────────────

const METHOD_WITH_PARENS = /(?:==>|<==)\s+(\w+(?:\.\w+)*)\s*\([^)]*\)\s*:\s*(\{.*)/;
const METHOD_NEW_FORMAT = /\[UnityCrossThreadLogger\]\s*(?:==>|<==)\s+(\w+(?:\.\w+)*)\s+(\{.*)/;
const STANDALONE_WITH_PREFIX = /\[UnityCrossThreadLogger\]\s*(\{.*)/;
const BARE_JSON = /^(\s*\{.*)/;

function collectJson(start, lines, nextIdx) {
  let result = start;
  let depth = (result.match(/\{/g) || []).length - (result.match(/\}/g) || []).length;
  let idx = nextIdx;
  while (depth > 0 && idx < lines.length) {
    result += '\n' + lines[idx];
    depth += (lines[idx].match(/\{/g) || []).length - (lines[idx].match(/\}/g) || []).length;
    idx++;
    if (idx - nextIdx > 500) break;
  }
  return { json: result, consumed: idx - nextIdx };
}

function extractJsonBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    let method = null, jsonStart = null;

    const m1 = METHOD_WITH_PARENS.exec(line);
    if (m1) { method = m1[1]; jsonStart = m1[2]; }

    if (!method) {
      const m2 = METHOD_NEW_FORMAT.exec(line);
      if (m2) { method = m2[1]; jsonStart = m2[2]; }
    }

    if (!method) {
      const m3 = STANDALONE_WITH_PREFIX.exec(line);
      if (m3 && m3[1].startsWith('{')) { method = 'standalone'; jsonStart = m3[1]; }
    }

    if (!method) {
      const m4 = BARE_JSON.exec(line);
      if (m4) {
        const { json } = collectJson(m4[1], lines, i + 1);
        try {
          const data = JSON.parse(json);
          if (typeof data === 'object' && data !== null &&
              ('greToClientEvent' in data || 'matchGameRoomStateChangedEvent' in data ||
               'authenticateResponse' in data || 'clientToMatchServiceMessageType' in data)) {
            method = 'standalone';
            jsonStart = m4[1];
          }
        } catch {}
      }
    }

    if (method && jsonStart) {
      const { json, consumed } = collectJson(jsonStart, lines, i + 1);
      try {
        const data = JSON.parse(json);
        if (typeof data.request === 'string') {
          try { data._parsed_request = JSON.parse(data.request); } catch {}
        }
        blocks.push([method, data]);
      } catch {}
      i += 1 + consumed;
      continue;
    }

    i++;
  }
  return blocks;
}

// ── GRE Message Processing ──────────────────────────────────────────────────

function processGSM(gsm) {
  // ── Step 0: Clean up deleted instances ──────────────────────────────────
  const deletedIds = gsm.diffDeletedInstanceIds || [];
  for (const delId of deletedIds) {
    delete instanceMap[delId];
  }

  // ── Step 1: Parse zones ─────────────────────────────────────────────────
  const zones = gsm.zones || [];
  for (const z of zones) {
    const zoneId = z.zoneId;
    const type = z.type || '';
    const owner = z.ownerSeatId || 0;
    zoneMap[zoneId] = { type, ownerSeatId: owner };
  }

  // ── Step 2: Parse gameObjects ───────────────────────────────────────────
  const gameObjects = gsm.gameObjects || [];
  for (const go of gameObjects) {
    const instanceId = go.instanceId;
    const grpId = go.grpId;
    if (!instanceId || !grpId) continue;

    const name = (typeof go.name === 'string' && go.name) ? go.name : resolveCardName(grpId) || null;
    instanceMap[instanceId] = {
      grpId,
      name,
      ownerSeatId: go.ownerSeatId || 0,
      zoneId: go.zoneId || 0,
    };
  }

  // Flush pending draws that can now be resolved
  if (pendingDraws.length > 0) {
    const remaining = [];
    for (const pd of pendingDraws) {
      const cardName = instanceNameResolved(pd.instanceId);
      if (cardName && !cardName.startsWith('instance:') && !cardName.startsWith('grpId:')) {
        if (pd.ownerSeatId === playerSeatId) {
          emitAction(`${WHITE}${seatToName(pd.ownerSeatId)} drew ${cardName}${RESET}`);
        } else {
          emitAction(`${DIM}${seatToName(pd.ownerSeatId)} drew a card${RESET}`);
        }
      } else {
        remaining.push(pd);
      }
    }
    pendingDraws = remaining;
  }

  // ── Turn/Phase info (BEFORE annotations so headers appear before actions) ─
  const ti = gsm.turnInfo;
  if (ti) {
    const tn = ti.turnNumber || 0;
    const ap = ti.activePlayer || 0;
    const phase = ti.phase || '';
    const step = ti.step || '';
    emitTurnAndPhase(tn, ap, phase, step);
  }

  // ── Step 3: Annotations ─────────────────────────────────────────────────
  const annotations = gsm.annotations || [];

  // 3a: ObjectIdChanged — must process before ZoneTransfer
  for (const ann of annotations) {
    const types = ann.type || [];
    if (!types.includes('AnnotationType_ObjectIdChanged')) continue;
    const details = ann.details || [];
    const origDetail = details.find(d => d.key === 'orig_id');
    const newDetail = details.find(d => d.key === 'new_id');
    const origId = origDetail?.valueInt32?.[0];
    const newId = newDetail?.valueInt32?.[0];
    if (origId && newId) {
      idChanges[newId] = origId;
      // Copy instance data to new id
      const orig = instanceMap[origId];
      if (orig) {
        instanceMap[newId] = { ...orig };
      }
    }
  }

  // 3b: Shuffle — bulk remap
  for (const ann of annotations) {
    const types = ann.type || [];
    if (!types.includes('AnnotationType_Shuffle')) continue;
    const details = ann.details || [];
    const oldIdsD = details.find(d => d.key === 'OldIds');
    const newIdsD = details.find(d => d.key === 'NewIds');
    const oldIds = oldIdsD?.valueInt32 || [];
    const newIds = newIdsD?.valueInt32 || [];
    if (oldIds.length === 0 || oldIds.length !== newIds.length) continue;
    for (let si = 0; si < oldIds.length; si++) {
      const oldId = oldIds[si], newId = newIds[si];
      if (!oldId || !newId || oldId === newId) continue;
      idChanges[newId] = oldId;
      const orig = instanceMap[oldId];
      if (orig) instanceMap[newId] = { ...orig };
    }
  }

  // 3c: ZoneTransfer — card movements
  for (const ann of annotations) {
    const types = ann.type || [];
    if (!types.includes('AnnotationType_ZoneTransfer')) continue;

    const details = ann.details || [];
    const srcDetail = details.find(d => d.key === 'zone_src');
    const dstDetail = details.find(d => d.key === 'zone_dest');
    const catDetail = details.find(d => d.key === 'category');
    const srcZoneId = srcDetail?.valueInt32?.[0] || 0;
    const dstZoneId = dstDetail?.valueInt32?.[0] || 0;
    const category = catDetail?.valueString?.[0] || '';

    if (srcZoneId === dstZoneId) continue;

    const srcZone = zoneMap[srcZoneId];
    const dstZone = zoneMap[dstZoneId];
    const srcType = srcZone?.type || '';
    const dstType = dstZone?.type || '';

    for (const instId of (ann.affectedIds || [])) {
      const cardName = instanceNameResolved(instId);
      // Owner: try instance first, then destination zone owner, then source zone owner
      let owner = instanceOwner(instId);
      if (!owner && dstZone) owner = dstZone.ownerSeatId;
      if (!owner && srcZone) owner = srcZone.ownerSeatId;
      const ownerName = seatToName(owner);

      if (category === 'PlayLand') {
        emitAction(`${GREEN}${ownerName} played ${cardName}${RESET}`);
      } else if (category === 'CastSpell') {
        emitAction(`${GREEN}${ownerName} cast ${cardName}${RESET}`);
      } else if (category === 'Draw') {
        const isResolved = cardName && !cardName.startsWith('instance:') && !cardName.startsWith('grpId:');
        if (owner === playerSeatId) {
          if (isResolved) {
            emitAction(`${WHITE}${ownerName} drew ${cardName}${RESET}`);
          } else {
            // Buffer for later resolution (gameObject often arrives in next GSM)
            pendingDraws.push({ instanceId: instId, ownerSeatId: owner });
          }
        } else {
          emitAction(`${DIM}${ownerName} drew a card${RESET}`);
        }
      } else if (category === 'Discard') {
        emitAction(`${RED}${ownerName} discarded ${cardName}${RESET}`);
      } else if (category === 'Destroy') {
        emitAction(`${RED}${cardName} was destroyed${RESET}`);
      } else if (category === 'Sacrifice') {
        emitAction(`${RED}${ownerName} sacrificed ${cardName}${RESET}`);
      } else if (category === 'Exile') {
        emitAction(`${MAGENTA}${cardName} was exiled${RESET}`);
      } else if (category === 'SBA_Damage' || category === 'SBA_Deathtouch') {
        emitAction(`${RED}${cardName} died${RESET}`);
      } else if (category === 'Resolve') {
        // Spell resolving — usually silent, unless stack → battlefield for permanents
        if (dstType === 'ZoneType_Battlefield') {
          // Permanent resolved onto battlefield — no extra output needed (cast already shown)
        } else if (dstType === 'ZoneType_Graveyard' && srcType === 'ZoneType_Stack') {
          // Instant/sorcery resolved and went to graveyard — silent (cast already shown)
        }
      } else if (category === 'Countered') {
        emitAction(`${RED}${cardName} was countered${RESET}`);
      } else if (category === 'ReturnToHand') {
        emitAction(`${CYAN}${cardName} returned to ${ownerName}'s hand${RESET}`);
      } else if (category === 'Put') {
        // Token creation or other puts — often to battlefield
        if (dstType === 'ZoneType_Battlefield' && srcType === 'ZoneType_Limbo') {
          emitAction(`${GREEN}${cardName} entered the battlefield${RESET}`);
        }
      }
      // Other categories: Reveal, Scry, Mill — handled below or ignored
    }
  }

  // 3d: TriggeringObject
  for (const ann of annotations) {
    const types = ann.type || [];
    if (!types.includes('AnnotationType_TriggeringObject')) continue;
    if (ann.affectorId) {
      const name = instanceNameResolved(ann.affectorId);
      if (name && !name.startsWith('instance:')) {
        emitAction(`${CYAN}${name}'s ability triggered${RESET}`);
      }
    }
  }

  // 3e: DamageDealt
  for (const ann of annotations) {
    const types = ann.type || [];
    if (!types.includes('AnnotationType_DamageDealt')) continue;
    const details = ann.details || [];
    const dmgDetail = details.find(d => d.key === 'damage');
    if (!dmgDetail?.valueInt32?.length) continue;
    const damage = dmgDetail.valueInt32[0];
    const sourceName = ann.affectorId ? instanceNameResolved(ann.affectorId) : 'unknown source';
    for (const targetId of (ann.affectedIds || [])) {
      // Target could be a player (seatId) or a creature (instanceId)
      let targetName;
      const targetInst = instanceMap[targetId];
      if (targetInst && targetInst.grpId > 0) {
        targetName = instanceNameResolved(targetId);
      } else if (targetId === playerSeatId || targetId === opponentSeatId) {
        // Low IDs that match seat IDs = player damage
        targetName = seatToName(targetId);
      } else {
        // Could be an untracked instance — try resolving, fall back to player guess
        targetName = instanceNameResolved(targetId);
        if (targetName.startsWith('instance:') || targetName.startsWith('grpId:')) {
          // Heuristic: if the target has no card identity, it's likely a player avatar
          // Arena uses seatId 1 and 2 for players, but sometimes wraps them in instances
          targetName = targetId <= 2 ? seatToName(targetId) : targetName;
        }
      }
      emitAction(`${RED}${sourceName} dealt ${damage} damage to ${targetName}${RESET}`);
    }
  }

  // 3f: ModifiedLife — emit life change line
  for (const ann of annotations) {
    const types = ann.type || [];
    if (!types.includes('AnnotationType_ModifiedLife')) continue;
    const details = ann.details || [];
    const lifeDetail = details.find(d => d.key === 'life');
    if (!lifeDetail?.valueInt32?.length) continue;
    const delta = lifeDetail.valueInt32[0];
    const seatDetail = details.find(d => d.key === 'systemSeatId');
    const seatId = seatDetail?.valueInt32?.[0] || ann.affectedIds?.[0] || 0;
    if (!seatId) continue;

    const prev = lifeTotals[seatId] ?? 20;
    const newLife = prev + delta;
    lifeTotals[seatId] = newLife;
    const poss = seatPossessive(seatId);
    if (delta < 0) {
      emitAction(`${YELLOW}${poss} life total is down to ${newLife}${RESET}`);
    } else if (delta > 0) {
      emitAction(`${YELLOW}${poss} life total is up to ${newLife}${RESET}`);
    }
  }

  // ── Players array (authoritative life, ~10% of diffs) ──────────────────
  const players = gsm.players || [];
  for (const p of players) {
    const seatId = p.systemSeatNumber || p.systemSeatId || p.controllerSeatId || p.seatId;
    const lifeTotal = p.lifeTotal;
    if (seatId && lifeTotal !== undefined) {
      const prev = lifeTotals[seatId];
      if (prev !== undefined && prev !== lifeTotal) {
        // Life changed but we didn't get a ModifiedLife annotation — emit it
        const poss = seatPossessive(seatId);
        if (lifeTotal < prev) {
          emitAction(`${YELLOW}${poss} life total is down to ${lifeTotal}${RESET}`);
        } else if (lifeTotal > prev) {
          emitAction(`${YELLOW}${poss} life total is up to ${lifeTotal}${RESET}`);
        }
      }
      lifeTotals[seatId] = lifeTotal;
    }
  }

  // ── Game result (inline in gsm.gameInfo) ───────────────────────────────
  // Only emit once per result — guard with resultPrinted to avoid dupes
  // from MatchGameRoomStateType_MatchCompleted arriving later.
  const gi = gsm.gameInfo;
  if (gi && gi.results && !resultPrinted && playerTeamId > 0) {
    const gameResult = gi.results.find(r => r.scope === 'MatchScope_Game')
                    || gi.results.find(r => r.scope === 'MatchScope_Match');
    if (gameResult) {
      resultPrinted = true;
      const reason = gameResult.reason || '';
      const winTeam = gameResult.winningTeamId;
      if (reason === 'ResultReason_Concede') {
        const loserSeat = winTeam === playerTeamId ? opponentSeatId : playerSeatId;
        emitAction(`${RED}${seatToName(loserSeat)} conceded${RESET}`);
      }
      if (winTeam !== undefined) {
        const winner = winTeam === playerTeamId ? playerSeatId : opponentSeatId;
        emitAction(`${BOLD}${GREEN}${seatToName(winner)} won!${RESET}`);
      }
    }
  }
}

// ── Top-level message handlers ──────────────────────────────────────────────

function processBlock(method, data) {
  // ── Authentication (player name) ────────────────────────────────────────
  if (data.authenticateResponse) {
    const name = data.authenticateResponse.screenName;
    if (name) playerName = name;
  }

  // ── MatchGameRoomStateChangedEvent (player names, match start/end) ──────
  if (data.matchGameRoomStateChangedEvent) {
    const ev = data.matchGameRoomStateChangedEvent;
    const roomInfo = ev.gameRoomInfo || ev;
    const config = roomInfo.gameRoomConfig;
    const stateType = roomInfo.stateType || '';

    if (config) {
      if (config.matchId) matchId = config.matchId;

      const reserved = config.reservedPlayers || [];
      for (const rp of reserved) {
        const rpName = rp.playerName || '';
        const rpSeatId = rp.systemSeatId;
        const rpTeamId = rp.teamId;

        if (rpName === playerName || (!playerName && rpSeatId === 1)) {
          playerName = rpName || playerName;
          playerSeatId = rpSeatId || playerSeatId;
          playerTeamId = rpTeamId || playerTeamId;
        } else {
          opponentName = rpName || opponentName;
          opponentSeatId = rpSeatId || opponentSeatId;
        }
      }

      if (stateType === 'MatchGameRoomStateType_Playing' && !gameStarted) {
        gameStarted = true;
        emit('');
        emit(`${BOLD}${MAGENTA}══════════════════════════════════════${RESET}`);
        emit(`${BOLD}${MAGENTA}  ${playerName || 'You'} vs ${opponentName || 'Opponent'}${RESET}`);
        emit(`${BOLD}${MAGENTA}══════════════════════════════════════${RESET}`);
      }
    }

    // Match completed — only print if we haven't already shown per-game result
    if (stateType === 'MatchGameRoomStateType_MatchCompleted') {
      const finalResult = roomInfo.finalMatchResult;
      if (finalResult && finalResult.resultList && playerTeamId > 0) {
        for (const r of finalResult.resultList) {
          if (r.scope === 'MatchScope_Match') {
            const winTeam = r.winningTeamId;
            if (winTeam !== undefined) {
              const winner = winTeam === playerTeamId ? playerSeatId : opponentSeatId;
              emit('');
              emit(`${BOLD}${MAGENTA}══════════════════════════════════════${RESET}`);
              emit(`${BOLD}${GREEN}  ${seatToName(winner)} won the match!${RESET}`);
              const pLife = lifeTotals[playerSeatId] ?? '?';
              const oLife = lifeTotals[opponentSeatId] ?? '?';
              emit(`${DIM}  Final life: ${playerName || 'You'} ${pLife} — ${opponentName || 'Opponent'} ${oLife}${RESET}`);
              emit(`${BOLD}${MAGENTA}══════════════════════════════════════${RESET}`);
              emit('');
            }
          }
        }
      }
      resetGameState();
    }
  }

  // ── GRE messages ────────────────────────────────────────────────────────
  if (data.greToClientEvent) {
    const messages = data.greToClientEvent.greToClientMessages || [];
    for (const msg of messages) {
      const msgType = msg.type || '';

      // ConnectResp — seat assignment
      if (msg.connectResp) {
        const cr = msg.connectResp;
        playerSeatId = cr.seatId || cr.systemSeatId || playerSeatId || 1;
        opponentSeatId = playerSeatId === 1 ? 2 : 1;
        // Reset life
        lifeTotals[playerSeatId] = 20;
        lifeTotals[opponentSeatId] = 20;
      }

      // Die roll results
      if (msgType === 'GREMessageType_DieRollResultsResp' && msg.dieRollResultsResp) {
        const rolls = msg.dieRollResultsResp.playerDieRolls || [];
        emit('');
        for (const roll of rolls) {
          const seatId = roll.systemSeatId || 0;
          const value = roll.rollValue || 0;
          emitAction(`${WHITE}${seatToName(seatId)} rolled a ${value}${RESET}`);
        }
        // Determine who plays first
        if (rolls.length >= 2) {
          const sorted = [...rolls].sort((a, b) => (b.rollValue || 0) - (a.rollValue || 0));
          const firstSeat = sorted[0].systemSeatId;
          emitAction(`${WHITE}${seatVerb(firstSeat, 'plays', 'play')} first.${RESET}`);
        }
      }

      // Mulligan request
      if (msgType === 'GREMessageType_MulliganReq' && msg.mulliganReq) {
        const seatId = msg.mulliganReq.systemSeatId || msg.mulliganReq.seatId || 0;
        // We'll see the response in the client message
      }

      // Game state message
      if (msg.gameStateMessage) {
        processGSM(msg.gameStateMessage);
      }
    }
  }

  // ── Client-to-server messages (mulligan decisions) ──────────────────────
  if (data.clientToMatchServiceMessageType || data.payload || method === 'ClientToMatchServiceMessage') {
    // Payload can be the direct GRE message or nested
    const payload = data.payload || data._parsed_request || data;
    const ctg = (typeof payload === 'object') ? payload : null;

    if (ctg) {
      // Direct payload format: { type: "ClientMessageType_MulliganResp", mulliganResp: { decision: ... } }
      if (ctg.type === 'ClientMessageType_MulliganResp' && ctg.mulliganResp) {
        const decision = ctg.mulliganResp.decision || '';
        if (decision === 'MulliganOption_Mulligan') {
          emitAction(`${RED}${playerName || 'You'} mulligans.${RESET}`);
        } else if (decision === 'MulliganOption_AcceptHand') {
          emitAction(`${GREEN}${playerName || 'You'} keeps.${RESET}`);
        }
      }
      // Nested format: { clientToGREMessage: { type: ..., mulliganResp: ... } }
      if (ctg.clientToGREMessage?.type === 'ClientMessageType_MulliganResp' && ctg.clientToGREMessage?.mulliganResp) {
        const decision = ctg.clientToGREMessage.mulliganResp.decision || '';
        if (decision === 'MulliganOption_Mulligan') {
          emitAction(`${RED}${playerName || 'You'} mulligans.${RESET}`);
        } else if (decision === 'MulliganOption_AcceptHand') {
          emitAction(`${GREEN}${playerName || 'You'} keeps.${RESET}`);
        }
      }
    }
  }
}

function resetGameState() {
  currentTurn = 0;
  currentActivePlayer = 0;
  currentPhase = '';
  currentStep = '';
  lifeTotals = {};
  instanceMap = {};
  zoneMap = {};
  idChanges = {};
  printedTurnHeader = 0;
  printedPhaseKey = '';
  pendingTurnLine = '';
  pendingPhaseLine = '';
  pendingDraws = [];
  resultPrinted = false;
  gameStarted = false;
  matchId = '';
}

// ── File Watching ───────────────────────────────────────────────────────────

function processChunk(text) {
  // Prepend any pending incomplete data from last read
  const full = pendingBuffer + text;
  pendingBuffer = '';

  const blocks = extractJsonBlocks(full);
  for (const [method, data] of blocks) {
    processBlock(method, data);
  }

  // If the text doesn't end with a newline and has an unclosed brace, save remainder
  // (This handles split JSON objects across reads)
  const lastNewline = full.lastIndexOf('\n');
  if (lastNewline < full.length - 1) {
    const remainder = full.substring(lastNewline + 1);
    const opens = (remainder.match(/\{/g) || []).length;
    const closes = (remainder.match(/\}/g) || []).length;
    if (opens > closes) {
      pendingBuffer = remainder;
    }
  }
}

function startWatching() {
  if (!fs.existsSync(LOG_PATH)) {
    console.log(`${RED}Player.log not found at: ${LOG_PATH}${RESET}`);
    console.log(`${DIM}Make sure MTGA is installed and has been run at least once.${RESET}`);
    process.exit(1);
  }

  const stat = fs.statSync(LOG_PATH);

  // Backfill mode: read last N MB to catch up on current match
  if (BACKFILL_MB > 0) {
    const readSize = Math.min(BACKFILL_MB * 1024 * 1024, stat.size);
    const fd = fs.openSync(LOG_PATH, 'r');
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
    fs.closeSync(fd);
    // Skip to first complete line
    let startOffset = 0;
    if (stat.size > readSize) {
      for (let j = 0; j < buf.length; j++) {
        if (buf[j] === 0x0A) { startOffset = j + 1; break; }
      }
    }
    const backfillText = buf.toString('utf-8', startOffset);
    console.log(`${DIM}Backfilling last ${(readSize / 1024 / 1024).toFixed(1)} MB...${RESET}`);
    processChunk(backfillText);
    console.log(`${DIM}Backfill complete. Watching for new events...${RESET}`);
    console.log('');
  }

  lastSize = stat.size;
  console.log(`${DIM}Watching: ${LOG_PATH}${RESET}`);
  console.log(`${DIM}File size: ${(lastSize / 1024 / 1024).toFixed(1)} MB${RESET}`);
  console.log(`${DIM}Waiting for Arena events... (play a game!)${RESET}`);
  console.log(`${DIM}Press Ctrl+C to stop${RESET}`);
  console.log('');

  setInterval(() => {
    try {
      const stat = fs.statSync(LOG_PATH);
      if (stat.size < lastSize) {
        // Log was rotated
        console.log(`${DIM}Log file rotated, resetting...${RESET}`);
        lastSize = 0;
        resetGameState();
        return;
      }
      if (stat.size <= lastSize) return;

      const readSize = stat.size - lastSize;
      const fd = fs.openSync(LOG_PATH, 'r');
      const buf = Buffer.alloc(readSize);
      fs.readSync(fd, buf, 0, readSize, lastSize);
      fs.closeSync(fd);

      lastSize = stat.size;
      processChunk(buf.toString('utf-8'));
    } catch {
      // File might be locked temporarily
    }
  }, POLL_MS);
}

// ── Start ───────────────────────────────────────────────────────────────────

console.log(`${BOLD}${MAGENTA}`);
console.log('╔══════════════════════════════════════════════════╗');
console.log('║   The Black Grimoire — Arena Play-by-Play Log   ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log(`${RESET}`);

startWatching();
