import type { DetectorEvents, DetectorEventHandler } from "./types.js";

export class DetectorEventEmitter {
  private handlers: {
    [K in keyof DetectorEvents]?: Array<DetectorEventHandler<K>>;
  } = {};

  private validateEventData<T extends keyof DetectorEvents>(event: T, data: DetectorEvents[T]) {
    const requiredFields: Record<T, string[]> = {
      'init:start': ['detectorId', 'node'],
      'init:validate': ['detectorId', 'node', 'isValid'],
      'init:prompt': ['detectorId', 'node', 'confirmed'],
      'init:generate': ['detectorId', 'node', 'actions'],
      'init:complete': ['detectorId', 'node', 'success'],
      'init:error': ['detectorId', 'node', 'error']
    } as Record<T, string[]>;

    const fields = requiredFields[event];
    for (const field of fields) {
      if (!(field in data)) {
        throw new Error(`Missing required field '${field}' in event '${event}'`);
      }
    }

    // Type-specific validations
    if (event === 'init:generate') {
      const genData = data as DetectorEvents['init:generate'];
      if (!Array.isArray(genData.actions)) {
        throw new Error(`Invalid actions in 'init:generate' event. Expected array, got ${typeof genData.actions}`);
      }
    }
    if (event === 'init:error') {
      const errData = data as DetectorEvents['init:error'];
      if (!(errData.error instanceof Error)) {
        throw new Error(`Invalid error in 'init:error' event. Expected Error instance`);
      }
    }
  }

  on<T extends keyof DetectorEvents>(event: T, handler: DetectorEventHandler<T>) {
    if (typeof handler !== 'function') {
      throw new Error(`Event handler for '${event}' must be a function`);
    }

    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event]?.push(handler as any);
  }

  off<T extends keyof DetectorEvents>(event: T, handler: DetectorEventHandler<T>) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event]?.filter(h => h !== handler) as any[];
  }

  async emit<T extends keyof DetectorEvents>(event: T, data: DetectorEvents[T]) {
    // Validate event data before emitting
    this.validateEventData(event, data);
    
    if (!this.handlers[event]) return;
    
    for (const handler of this.handlers[event] || []) {
      try {
        await (handler as DetectorEventHandler<T>)(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
        // Re-emit as error event if not already an error event
        if (event !== 'init:error') {
          await this.emit('init:error', {
            detectorId: data.detectorId,
            node: data.node,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
  }

  clearHandlers() {
    this.handlers = {};
  }
}
