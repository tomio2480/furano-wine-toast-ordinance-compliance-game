import {
  EXIT_ANIMATION_MS,
  FIRST_SPAWN_MS,
  GAME_DURATION_MS,
  HIT_SCORE,
  MISFIRE_SCORE,
  KANPAI_UNIT_SCORE,
  SLOTS,
  STAY_MS,
} from "../config";
import { difficultyAt } from "./difficulty";
import { COMPLIANT_DRINKS, NON_COMPLIANT_DRINKS, isCompliant, type DrinkId } from "./drinks";
import { kanpaiMode } from "./kanpai";
import { changeMode, createMeter, meterUnits, type KanpaiMeter } from "./meter";
import { pick, randomInt, type Random } from "./random";

export interface Participant {
  readonly id: number;
  readonly slotId: number;
  readonly drink: DrinkId;
  readonly appearedAtMs: number;
  readonly leaveAtMs: number;
}

export type ExitReason = "hit" | "misfire" | "timeout";

/** 退場の演出中の参加者．乾杯の判定には含めない． */
export interface Exit {
  readonly participant: Participant;
  readonly reason: ExitReason;
  readonly atMs: number;
}

/** プレイ中の状態．時間はプレイの経過時間（一時停止中は進まない）で表す． */
export interface GameState {
  readonly timeMs: number;
  /** 表示中の参加者（S）． */
  readonly participants: readonly Participant[];
  readonly exits: readonly Exit[];
  /** 乾杯ボタンが押されているか（H）． */
  readonly isHeld: boolean;
  readonly meter: KanpaiMeter;
  readonly hits: number;
  readonly misfires: number;
  readonly nextSpawnAtMs: number;
  readonly nextId: number;
}

export interface GameOptions {
  readonly firstSpawnAtMs?: number;
}

export function createGame(options: GameOptions = {}): GameState {
  return {
    timeMs: 0,
    participants: [],
    exits: [],
    isHeld: false,
    meter: createMeter(0),
    hits: 0,
    misfires: 0,
    nextSpawnAtMs: options.firstSpawnAtMs ?? FIRST_SPAWN_MS,
    nextId: 1,
  };
}

export function isTimeUp(state: GameState): boolean {
  return state.timeMs >= GAME_DURATION_MS;
}

/** 表示中の参加者から乾杯の状態を求め直し，変わっていれば区間を区切る． */
function syncMode(state: GameState): GameState {
  const drinks = state.participants.map((participant) => participant.drink);
  const mode = kanpaiMode(state.isHeld, drinks);
  return { ...state, meter: changeMode(state.meter, mode, state.timeMs) };
}

export function setHeld(state: GameState, isHeld: boolean): GameState {
  return syncMode({ ...state, isHeld });
}

export interface Arrival {
  readonly slotId: number;
  readonly drink: DrinkId;
  readonly stayMs: number;
}

/** 現在の時刻に参加者を出現させる． */
export function appear(state: GameState, arrival: Arrival): GameState {
  const participant: Participant = {
    id: state.nextId,
    slotId: arrival.slotId,
    drink: arrival.drink,
    appearedAtMs: state.timeMs,
    leaveAtMs: state.timeMs + arrival.stayMs,
  };
  return syncMode({
    ...state,
    participants: [...state.participants, participant],
    nextId: state.nextId + 1,
  });
}

const HIT_OUTCOME = { reason: "hit", hits: 1, misfires: 0 } as const;
const MISFIRE_OUTCOME = { reason: "misfire", hits: 0, misfires: 1 } as const;

/** 雪玉を参加者に当てる．命中の判定は押した時点で行う． */
export function throwAt(state: GameState, participantId: number): GameState {
  const target = state.participants.find((participant) => participant.id === participantId);
  if (target === undefined || isTimeUp(state)) {
    return state;
  }
  const outcome = isCompliant(target.drink) ? MISFIRE_OUTCOME : HIT_OUTCOME;
  return syncMode({
    ...state,
    participants: state.participants.filter((participant) => participant !== target),
    exits: [...state.exits, { participant: target, reason: outcome.reason, atMs: state.timeMs }],
    hits: state.hits + outcome.hits,
    misfires: state.misfires + outcome.misfires,
  });
}

function occupiedSlotIds(state: GameState): Set<number> {
  const exiting = state.exits.map((exit) => exit.participant);
  return new Set([...state.participants, ...exiting].map((participant) => participant.slotId));
}

function freeSlotIds(state: GameState): number[] {
  const occupied = occupiedSlotIds(state);
  return SLOTS.map((slot) => slot.id).filter((id) => !occupied.has(id));
}

function chooseDrink(random: Random, nonCompliantRatio: number): DrinkId {
  const pool = random() < nonCompliantRatio ? NON_COMPLIANT_DRINKS : COMPLIANT_DRINKS;
  return pick(random, pool);
}

/**
 * 出現の予定時刻に，次の予定を立ててから空いた枠へ参加者を出す．
 * 時間切れちょうどは結果へ移る直前のため，予定だけ進めて参加者は出さない．
 */
function spawn(state: GameState, random: Random): GameState {
  const phase = difficultyAt(state.timeMs);
  const scheduled = {
    ...state,
    nextSpawnAtMs: state.timeMs + randomInt(random, phase.spawnIntervalMs),
  };
  const freeSlots = freeSlotIds(state);
  const isCrowded = state.participants.length >= phase.maxVisible;
  if (isTimeUp(state) || isCrowded || freeSlots.length === 0) {
    return scheduled;
  }
  return appear(scheduled, {
    slotId: pick(random, freeSlots),
    drink: chooseDrink(random, phase.nonCompliantRatio),
    stayMs: randomInt(random, STAY_MS),
  });
}

function departDue(state: GameState): GameState {
  const isDue = (participant: Participant) => participant.leaveAtMs <= state.timeMs;
  const leaving = state.participants.filter(isDue);
  if (leaving.length === 0) {
    return state;
  }
  const exits = leaving.map((participant): Exit => ({
    participant,
    reason: "timeout",
    atMs: participant.leaveAtMs,
  }));
  return syncMode({
    ...state,
    participants: state.participants.filter((participant) => !isDue(participant)),
    exits: [...state.exits, ...exits],
  });
}

function spawnDue(state: GameState, random: Random): GameState {
  return state.nextSpawnAtMs <= state.timeMs ? spawn(state, random) : state;
}

/** 時刻を進め，演出の終わった退場者を片付ける． */
function moveTo(state: GameState, timeMs: number): GameState {
  const isAnimating = (exit: Exit) => timeMs - exit.atMs < EXIT_ANIMATION_MS;
  return { ...state, timeMs, exits: state.exits.filter(isAnimating) };
}

function nextEventAt(state: GameState): number {
  const departures = state.participants.map((participant) => participant.leaveAtMs);
  return Math.min(state.nextSpawnAtMs, ...departures);
}

/**
 * プレイの経過時間を toMs まで進める．制限時間を超えては進めない．
 * 退場と出現は，フレームの時刻ではなく予定の時刻ちょうどに処理する．
 */
export function advance(state: GameState, toMs: number, random: Random): GameState {
  const targetMs = Math.min(toMs, GAME_DURATION_MS);
  let current = state;
  for (let at = nextEventAt(current); at <= targetMs; at = nextEventAt(current)) {
    current = spawnDue(departDue(moveTo(current, at)), random);
  }
  return moveTo(current, Math.max(current.timeMs, targetMs));
}

export interface GameResult {
  readonly score: number;
  readonly hits: number;
  readonly misfires: number;
  readonly hitPoints: number;
  readonly misfirePoints: number;
  readonly kanpaiPlusPoints: number;
  readonly kanpaiMinusPoints: number;
  /** 加点区間の単位数．投稿文の乾杯秒数に使う． */
  readonly kanpaiPlusUnits: number;
}

/** 現在の得点と内訳を返す．進行中の区間は切り上げた暫定値で数える． */
export function summarize(state: GameState): GameResult {
  const units = meterUnits(state.meter, state.timeMs);
  const hitPoints = state.hits * HIT_SCORE;
  const misfirePoints = state.misfires * MISFIRE_SCORE;
  const kanpaiPlusPoints = units.plus * KANPAI_UNIT_SCORE.plus;
  const kanpaiMinusPoints = units.minus * KANPAI_UNIT_SCORE.minus;
  return {
    score: hitPoints + misfirePoints + kanpaiPlusPoints + kanpaiMinusPoints,
    hits: state.hits,
    misfires: state.misfires,
    hitPoints,
    misfirePoints,
    kanpaiPlusPoints,
    kanpaiMinusPoints,
    kanpaiPlusUnits: units.plus,
  };
}
