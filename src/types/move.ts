import type { MonsterType } from './monster';

export type MoveCategory = 'physical' | 'special' | 'status';

export interface Move {
  id: number;
  name: string;
  type: MonsterType;
  power: number;       // 0 for status moves
  accuracy: number;    // 0-100
  category: MoveCategory;
  pp: number;          // power points
  description: string;
}
