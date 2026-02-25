export interface TrainerData {
  party: TrainerPartyEntry[];
  visionRange: number;
  defeatFlag: string;
  reward?: TrainerReward;
}

export interface TrainerPartyEntry {
  speciesId: number;
  level: number;
}

export interface TrainerReward {
  items?: { itemId: number; quantity: number }[];
}
