import type { Detector, ForgeConfig, TreeNode, DetectorEvents } from "./types.js";
import { DetectorEventEmitter } from "./events.js";
import { Logger } from "./logger.js";

export class DetectorManager {
  private eventEmitter = new DetectorEventEmitter();
  private logger: Logger;

  constructor(private cfg: ForgeConfig) {
    this.logger = new Logger(cfg.logging, cfg.targetDir);
  }

  on<T extends keyof DetectorEvents>(event: T, handler: (data: DetectorEvents[T]) => void) {
    this.eventEmitter.on(event, handler);
  }

  off<T extends keyof DetectorEvents>(event: T, handler: (data: DetectorEvents[T]) => void) {
    this.eventEmitter.off(event, handler);
  }

  private validateHooks(detector: Detector): void {
    if (!detector.hooks) return;

    const hookNames = [
      'preDetect', 'postDetect',
      'preValidate', 'postValidate',
      'prePrompt', 'postPrompt',
      'preGenerate', 'postGenerate',
      'preProcess', 'postProcess',
      'onError', 'onComplete'
    ] as const;

    for (const hookName of hookNames) {
      const hook = detector.hooks[hookName];
      if (hook && typeof hook !== 'function') {
        throw new Error(`Invalid hook '${hookName}' in detector '${detector.id}'. Hook must be a function.`);
      }
    }
  }

  private validateDetector(detector: Detector): void {
    // Required fields
    if (!detector.id) {
      throw new Error('Detector must have an id');
    }
    if (typeof detector.match !== 'function') {
      throw new Error(`Detector '${detector.id}' must have a match function`);
    }
    if (typeof detector.prompt !== 'function') {
      throw new Error(`Detector '${detector.id}' must have a prompt function`);
    }
    if (typeof detector.generate !== 'function') {
      throw new Error(`Detector '${detector.id}' must have a generate function`);
    }

    // Optional fields
    if (detector.validate && typeof detector.validate !== 'function') {
      throw new Error(`Invalid validate function in detector '${detector.id}'`);
    }
    if (detector.postProcess && typeof detector.postProcess !== 'function') {
      throw new Error(`Invalid postProcess function in detector '${detector.id}'`);
    }

    // Validate hooks
    this.validateHooks(detector);
  }

  async runDetector(detector: Detector, node: TreeNode): Promise<boolean> {
    try {
      // Validate detector structure
      this.validateDetector(detector);

      // Start
      await detector.hooks?.preDetect?.();
      await this.eventEmitter.emit('init:start', { detectorId: detector.id, node });
      await detector.hooks?.postDetect?.();

      // Validate
      if (detector.validate) {
        await detector.hooks?.preValidate?.();
        const isValid = await detector.validate(node, this.cfg);
        await this.eventEmitter.emit('init:validate', { detectorId: detector.id, node, isValid });
        await detector.hooks?.postValidate?.();
        if (!isValid) return false;
      }

      // Prompt
      await detector.hooks?.prePrompt?.();
      const confirmed = await detector.prompt(node);
      await this.eventEmitter.emit('init:prompt', { detectorId: detector.id, node, confirmed });
      await detector.hooks?.postPrompt?.();
      if (!confirmed) return false;

      // Generate
      await detector.hooks?.preGenerate?.();
      const result = await detector.generate(node, this.cfg);
      await this.eventEmitter.emit('init:generate', { 
        detectorId: detector.id, 
        node, 
        actions: result.actions 
      });
      await detector.hooks?.postGenerate?.();

      // Post Process
      if (detector.postProcess) {
        await detector.hooks?.preProcess?.();
        await detector.postProcess(node, this.cfg);
        await detector.hooks?.postProcess?.();
      }

      // Complete
      await this.eventEmitter.emit('init:complete', { 
        detectorId: detector.id, 
        node, 
        success: true 
      });
      await detector.hooks?.onComplete?.();

      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.eventEmitter.emit('init:error', { 
        detectorId: detector.id, 
        node, 
        error: err 
      });
      await detector.hooks?.onError?.(err);
      this.logger.error(`Detector ${detector.id} failed:`, { error: err.message });
      return false;
    }
  }

  clearEventHandlers() {
    this.eventEmitter.clearHandlers();
  }
}
