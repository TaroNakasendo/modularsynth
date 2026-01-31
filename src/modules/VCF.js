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
    // CV Mod
    // Standard CV - Amplified to drive detune (1V/Oct emulation-ish)
    // 1 LFO unit (±1) will drive ±2400 cents (±2 Octaves)
    this.cvGain = this.context.createGain();
    this.cvGain.gain.value = 2400; 
    this.cvGain.connect(this.filter.detune);
    this.addJack('CV', 'in', { node: this.cvGain });

    // Envelope Input (Exponential/Detune based, good for Sweep)
    // 0..1 input -> 0..3000 cents (2.5 octaves)
    this.envGain = this.context.createGain();
    this.envGain.gain.value = 3000;
    this.envGain.connect(this.filter.detune);
    this.addJack('ENV', 'in', { node: this.envGain });
  }
}
