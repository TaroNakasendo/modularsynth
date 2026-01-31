import { BaseModule } from './BaseModule.js';

export class VCF extends BaseModule {
  constructor() {
    super('VCF');
    
    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1000;
    this.filter.Q.value = 1;
    
    // Knobs
    this.addKnob('FREQ', this.filter.frequency, 20, 20000, 1000);
    this.addKnob('RES', this.filter.Q, 0, 20, 1);
    
    // Jacks
    this.addJack('IN', 'in', { node: this.filter });
    this.addJack('OUT', 'out', this.filter);
    
    // CV Mod
    // Standard CV (Linear Hz, good for LFO)
    this.addJack('CV', 'in', { param: this.filter.frequency });

    // Envelope Input (Exponential/Detune based, good for Sweep)
    // 0..1 input -> 0..3000 cents (2.5 octaves)
    this.envGain = this.context.createGain();
    this.envGain.gain.value = 3000;
    this.envGain.connect(this.filter.detune);
    this.addJack('ENV', 'in', { node: this.envGain });
  }
}
