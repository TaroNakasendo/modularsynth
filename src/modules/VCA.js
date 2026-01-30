import { BaseModule } from './BaseModule.js';

export class VCA extends BaseModule {
  constructor() {
    super('VCA');
    
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0; // Default silent, needs CV or knob
    
    // Knobs
    this.addKnob('GAIN', this.gainNode.gain, 0, 1, 0);
    
    // Jacks
    this.addJack('IN', 'in', { node: this.gainNode });
    this.addJack('CV', 'in', { param: this.gainNode.gain });
    this.addJack('OUT', 'out', this.gainNode);
  }
}
