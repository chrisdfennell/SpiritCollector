import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './types/common';
import { BootScene } from './scenes/BootScene';
import { OverworldScene } from './scenes/OverworldScene';
import { BattleScene } from './scenes/BattleScene';
import { BoxScene } from './scenes/BoxScene';
import { BagScene } from './scenes/BagScene';
import { ShopScene } from './scenes/ShopScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  pixelArt: true,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, OverworldScene, BattleScene, BoxScene, BagScene, ShopScene],
};

new Phaser.Game(config);
