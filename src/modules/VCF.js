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
    // Create a generic CV input gain? Or direct?
    // Direct CV is linear Hz.
    // 1V/Oct is exponential.
    // Let's rely on linear for now or Detune param (which filters act differently).
    // BiquadFilter frequency is AudioParam, so we can connect.
    this.addJack('CV', 'in', { param: this.filter.frequency });
  }
}
