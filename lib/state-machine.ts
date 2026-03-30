/**
 * Declarative Finite State Machine — PDCA workflow engine
 *
 * Transition table with guards (preconditions) and actions (side-effects).
 * Supports wildcard transitions (from: '*') and history tracking.
 */

export interface Transition {
  from: string;      // state name or '*' for any
  event: string;
  to: string;
  guard: string | null;
  actions: string[];
}

export interface MachineState {
  current: string;
  history: string[];
}

export interface SendResult {
  success: boolean;
  from: string;
  to: string;
  event: string;
  actions: string[];
  reason?: string;
}

export interface MachineOptions {
  guards?: Record<string, () => boolean>;
  onAction?: (action: string, from: string, to: string) => void;
}

export class StateMachine {
  private _current: string;
  private _history: string[] = [];
  private transitions: Transition[];
  private guards: Record<string, () => boolean>;
  private onAction?: (action: string, from: string, to: string) => void;

  constructor(transitions: Transition[], initial: string, opts?: MachineOptions) {
    this.transitions = transitions;
    this._current = initial;
    this.guards = opts?.guards ?? {};
    this.onAction = opts?.onAction;
  }

  get current(): string {
    return this._current;
  }

  get history(): string[] {
    return [...this._history];
  }

  send(event: string): SendResult {
    // Find matching transition (exact match first, then wildcard)
    const match =
      this.transitions.find(t => t.from === this._current && t.event === event) ??
      this.transitions.find(t => t.from === '*' && t.event === event);

    if (!match) {
      return {
        success: false,
        from: this._current,
        to: this._current,
        event,
        actions: [],
        reason: `No transition for event '${event}' in state '${this._current}'`,
      };
    }

    // Check guard
    if (match.guard) {
      const guardFn = this.guards[match.guard];
      if (guardFn && !guardFn()) {
        return {
          success: false,
          from: this._current,
          to: this._current,
          event,
          actions: [],
          reason: `guard '${match.guard}' failed`,
        };
      }
    }

    // Execute transition
    const from = this._current;
    this._history.push(from);
    this._current = match.to;

    // Execute actions
    for (const action of match.actions) {
      this.onAction?.(action, from, match.to);
    }

    return {
      success: true,
      from,
      to: match.to,
      event,
      actions: match.actions,
    };
  }
}
