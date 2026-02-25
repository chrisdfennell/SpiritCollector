export interface StateConfig {
  onEnter?: () => void;
  onUpdate?: (dt: number) => void;
  onExit?: () => void;
}

interface StateEntry extends StateConfig {
  name: string;
}

export class StateMachine {
  private id: string;
  private states = new Map<string, StateEntry>();
  private currentState?: StateEntry;
  private isChangingState = false;
  private changeStateQueue: string[] = [];

  constructor(id: string = 'fsm') {
    this.id = id;
  }

  addState(name: string, config?: StateConfig): this {
    this.states.set(name, {
      name,
      onEnter: config?.onEnter,
      onUpdate: config?.onUpdate,
      onExit: config?.onExit,
    });
    return this;
  }

  setState(name: string): void {
    if (!this.states.has(name)) {
      console.warn(`[${this.id}] State "${name}" does not exist.`);
      return;
    }

    if (this.isChangingState) {
      this.changeStateQueue.push(name);
      return;
    }

    this.isChangingState = true;

    if (this.currentState?.onExit) {
      this.currentState.onExit();
    }

    this.currentState = this.states.get(name);

    if (this.currentState?.onEnter) {
      this.currentState.onEnter();
    }

    this.isChangingState = false;

    // Process queued state changes
    if (this.changeStateQueue.length > 0) {
      const nextState = this.changeStateQueue.shift()!;
      this.setState(nextState);
    }
  }

  update(dt: number): void {
    if (this.currentState?.onUpdate) {
      this.currentState.onUpdate(dt);
    }
  }

  get currentStateName(): string | undefined {
    return this.currentState?.name;
  }
}
