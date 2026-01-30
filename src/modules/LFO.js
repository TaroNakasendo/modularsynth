import { BaseModule } from './BaseModule.js';

export class LFO extends BaseModule {
  constructor() {
    super('LFO');
    
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 1; // 1 Hz
    this.oscillator.start();
    
    this.addKnob('RATE', this.oscillator.frequency, 0.1, 20, 1);
    
    // Output often needs to be scaled for CV use (e.g. -1 to 1 implies full swing)
    // We output the raw oscillator (-1 to 1) 
    this.addJack('OUT', 'out', this.oscillator);
  }
}
