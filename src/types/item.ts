export type ItemCategory = 'healing' | 'capture' | 'keyItem';

export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'healPercent'; percent: number }
  | { type: 'fullHeal' }
  | { type: 'capture'; multiplier: number }
  | { type: 'keyItem' };

export interface ItemData {
  id: number;
  name: string;
  description: string;
  category: ItemCategory;
  effect: ItemEffect;
  price: number;
}
