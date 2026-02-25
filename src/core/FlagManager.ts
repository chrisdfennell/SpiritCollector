export class FlagManager {
  private flags: Record<string, boolean> = {};

  constructor(initialFlags?: Record<string, boolean>) {
    if (initialFlags) this.flags = { ...initialFlags };
  }

  get(flag: string): boolean {
    return this.flags[flag] ?? false;
  }

  set(flag: string, value: boolean): void {
    this.flags[flag] = value;
  }

  toJSON(): Record<string, boolean> {
    return { ...this.flags };
  }

  static fromJSON(data: Record<string, boolean>): FlagManager {
    return new FlagManager(data);
  }
}
