import { StateMachine } from './StateMachine';
import { GameState } from '../types/common';

export class GameStateManager {
  private fsm: StateMachine;
  private game: Phaser.Game;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.fsm = new StateMachine('game-state');

    this.fsm
      .addState(GameState.BOOT, {
        onEnter: () => this.game.scene.start('BootScene'),
      })
      .addState(GameState.OVERWORLD, {
        onEnter: () => this.game.scene.start('OverworldScene'),
        onExit: () => this.game.scene.stop('OverworldScene'),
      })
      .addState(GameState.BATTLE, {
        onEnter: () => {
          this.game.scene.pause('OverworldScene');
          this.game.scene.start('BattleScene');
        },
        onExit: () => {
          this.game.scene.stop('BattleScene');
          this.game.scene.resume('OverworldScene');
        },
      })
      .addState(GameState.MENU, {
        onEnter: () => {
          this.game.scene.pause('OverworldScene');
          this.game.scene.start('MenuScene');
        },
        onExit: () => {
          this.game.scene.stop('MenuScene');
          this.game.scene.resume('OverworldScene');
        },
      });
  }

  transitionTo(state: GameState): void {
    this.fsm.setState(state);
  }

  get currentState(): string | undefined {
    return this.fsm.currentStateName;
  }
}
