export enum BattlePhase {
  INTRO = 'INTRO',
  PLAYER_CHOICE = 'PLAYER_CHOICE',
  EXECUTE_TURN = 'EXECUTE_TURN',
  CHECK_FAINT = 'CHECK_FAINT',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  RUN_AWAY = 'RUN_AWAY',
  CATCH_ATTEMPT = 'CATCH_ATTEMPT',
  FORCE_SWITCH = 'FORCE_SWITCH',
}

export interface BattleAction {
  type: 'attack' | 'catch' | 'switch' | 'run' | 'item';
  moveId?: number;
  switchToIndex?: number;
  catchMultiplier?: number;
}

export interface TurnResult {
  attackerName: string;
  defenderName: string;
  moveName: string;
  damage: number;
  isCritical: boolean;
  effectiveness: number; // 0, 0.5, 1, 2
  defenderRemainingHP: number;
  defenderFainted: boolean;
  missed: boolean;
}

export interface CatchResult {
  success: boolean;
  shakes: number; // 0-3, how many shakes before result
}
