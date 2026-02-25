import Phaser from 'phaser';
import type { BattleSprite } from '../rendering/MonsterSpriteRenderer';

export class BattleAnimator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Shake the attacker toward the defender, then snap back */
  animateAttack(
    attackerSprite: BattleSprite,
    defenderSprite: BattleSprite,
  ): Promise<void> {
    return new Promise(resolve => {
      const origX = attackerSprite.x;
      const origY = attackerSprite.y;

      const dx = (defenderSprite.x - attackerSprite.x) * 0.15;
      const dy = (defenderSprite.y - attackerSprite.y) * 0.15;

      this.scene.tweens.add({
        targets: attackerSprite,
        x: origX + dx,
        y: origY + dy,
        duration: 100,
        yoyo: true,
        ease: 'Power1',
        onComplete: () => {
          this.scene.tweens.add({
            targets: defenderSprite,
            alpha: 0.2,
            duration: 80,
            yoyo: true,
            repeat: 2,
            onComplete: () => resolve(),
          });
        },
      });
    });
  }

  /** Smoothly animate an HP bar width change */
  animateHPBar(
    bar: Phaser.GameObjects.Rectangle,
    fromHP: number,
    toHP: number,
    maxHP: number,
    maxBarWidth: number,
  ): Promise<void> {
    return new Promise(resolve => {
      const targetWidth = Math.max(0, (toHP / maxHP) * maxBarWidth);

      this.scene.tweens.add({
        targets: bar,
        displayWidth: targetWidth,
        duration: 400,
        ease: 'Linear',
        onUpdate: () => {
          const pct = bar.displayWidth / maxBarWidth;
          if (pct > 0.5) {
            bar.setFillStyle(0x44cc44);
          } else if (pct > 0.2) {
            bar.setFillStyle(0xcccc44);
          } else {
            bar.setFillStyle(0xcc4444);
          }
        },
        onComplete: () => resolve(),
      });
    });
  }

  /** Animate a monster fainting (slide down and fade out) */
  animateFaint(sprite: BattleSprite): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: sprite,
        y: sprite.y + 40,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * Catch attempt animation:
   * 1. Spirit orb arcs toward the wild monster
   * 2. Monster shrinks into the orb
   * 3. Orb drops and shakes N times
   * 4. Success: sparkle burst. Fail: monster pops back out.
   */
  animateCatchAttempt(
    wildSprite: BattleSprite,
    shakes: number,
    success: boolean,
  ): Promise<void> {
    return new Promise(resolve => {
      const targetX = wildSprite.x;
      const targetY = wildSprite.y;
      const savedAlpha = wildSprite.alpha;

      // Create the spirit orb (small circle)
      const orb = this.scene.add.circle(100, 450, 10, 0xee4444);
      orb.setStrokeStyle(2, 0xffffff);
      orb.setDepth(100);

      // Arc the orb toward the monster
      this.scene.tweens.add({
        targets: orb,
        x: targetX,
        y: targetY - 20,
        duration: 500,
        ease: 'Sine.easeOut',
        onComplete: () => {
          // Shrink the monster into the orb
          this.scene.tweens.add({
            targets: wildSprite,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
              // Orb drops down
              this.scene.tweens.add({
                targets: orb,
                y: targetY + 30,
                duration: 200,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                  // Shake sequence
                  this.doShakes(orb, shakes, () => {
                    if (success) {
                      // Sparkle burst
                      this.sparkle(orb.x, orb.y, () => {
                        orb.destroy();
                        resolve();
                      });
                    } else {
                      // Break free — monster pops back
                      orb.destroy();
                      wildSprite.setScale(1);
                      wildSprite.setAlpha(0);
                      this.scene.tweens.add({
                        targets: wildSprite,
                        alpha: savedAlpha,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 300,
                        ease: 'Back.easeOut',
                        onComplete: () => resolve(),
                      });
                    }
                  });
                },
              });
            },
          });
        },
      });

      // Arc motion — add a vertical offset during flight
      this.scene.tweens.add({
        targets: orb,
        y: targetY - 120,
        duration: 250,
        ease: 'Sine.easeOut',
        yoyo: true,
      });
    });
  }

  private doShakes(orb: Phaser.GameObjects.Arc, count: number, onDone: () => void): void {
    if (count <= 0) {
      this.scene.time.delayedCall(300, onDone);
      return;
    }

    const origX = orb.x;
    let shakesLeft = count;

    const shakeOnce = () => {
      this.scene.time.delayedCall(400, () => {
        this.scene.tweens.add({
          targets: orb,
          x: origX - 8,
          duration: 60,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            orb.x = origX;
            shakesLeft--;
            if (shakesLeft > 0) {
              shakeOnce();
            } else {
              this.scene.time.delayedCall(300, onDone);
            }
          },
        });
      });
    };

    shakeOnce();
  }

  /** Evolution animation: flash white, change color, sparkle */
  animateEvolution(
    sprite: BattleSprite,
    newColor: number,
  ): Promise<void> {
    return new Promise(resolve => {
      // Flash white 3 times
      let flashCount = 0;
      const flashTimer = this.scene.time.addEvent({
        delay: 300,
        repeat: 5,
        callback: () => {
          flashCount++;
          if (flashCount % 2 === 1) {
            this.setSpriteColor(sprite, 0xffffff);
          } else {
            this.setSpriteColor(sprite, newColor);
          }
        },
      });

      // After flashing, set final color and sparkle
      this.scene.time.delayedCall(1800, () => {
        flashTimer.destroy();
        this.setSpriteColor(sprite, newColor);
        this.sparkle(sprite.x, sprite.y, () => resolve());
      });
    });
  }

  /** Set color on either a Rectangle (setFillStyle) or Image (setTint) */
  private setSpriteColor(sprite: BattleSprite, color: number): void {
    if (sprite instanceof Phaser.GameObjects.Rectangle) {
      sprite.setFillStyle(color);
    } else if (sprite instanceof Phaser.GameObjects.Image) {
      sprite.setTint(color);
    }
  }

  private sparkle(x: number, y: number, onDone: () => void): void {
    const stars: Phaser.GameObjects.Star[] = [];
    const colors = [0xffee44, 0xffffff, 0x44eeff];

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const star = this.scene.add.star(x, y, 4, 2, 5, colors[i % 3]);
      star.setDepth(100);
      stars.push(star);

      this.scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 500,
        ease: 'Power2',
        onComplete: () => star.destroy(),
      });
    }

    this.scene.time.delayedCall(500, onDone);
  }
}
