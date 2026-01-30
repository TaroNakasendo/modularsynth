import { BaseModule } from './BaseModule.js';

export class VCO extends BaseModule {
  constructor() {
    super('VCO');
    
    // Create Audio Nodes
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.value = 440;
    this.oscillator.start();

    // CV Input simply adds to frequency? 
    // Real analog synth: 1V/Oct. 
    // Web Audio freq param is linear Hz. 
    // To get 1V/Oct, we usually use a Detune param on a constant base freq, or strict math.
    // Easiest: Connect CV to Detune (100 cents = 1 semitone). 1V = 1200 cents.
    // So let's make an input that drives Detune with high gain.
    
    // Knobs
    this.addKnob('FREQ', this.oscillator.frequency, 20, 2000, 440);
    this.addKnob('DETUNE', this.oscillator.detune, -1200, 1200, 0);

    // Waveform 'Knob' (Stepped)
    // We didn't build a stepped knob, but we can hack it or add logic.
    // Let's just create a waveform cycle button or repurpose the knob.
    this.waveTypes = ['sine', 'triangle', 'sawtooth', 'square'];
    this.currentWave = 2; // saw
    
    // Custom UI for wave selector?
    // Let's just use a knob for now: 0-3
    // But BaseModule knob maps directly to AudioParam...
    // I'll override or add a custom control later. 
    // For now, let's just default to Saw and focus on wiring.
    
    // Jacks
    // Output: Direct form Oscillator
    this.addJack('OUT', 'out', this.oscillator);
    
    // Input: FM / CV
    // Connects to frequency.
    // If we want 1V/Oct, we need a Gain node scaling input to reasonable freq change.
    // Let's just make it a linear FM for now.
    this.fmGain = this.context.createGain();
    this.fmGain.gain.value = 100; // Modulation depth
    this.fmGain.connect(this.oscillator.frequency); // Linear FM
    
    this.addJack('FM', 'in', { node: this.fmGain });
  }
}
