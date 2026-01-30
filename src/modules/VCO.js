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

    // Waveform Selector
    this.waveTypes = ['sine', 'triangle', 'sawtooth', 'square'];
    this.currentWave = 2; // saw
    
    // Wave Select Button
    const waveBtn = document.createElement('div');
    waveBtn.className = 'button';
    waveBtn.style.marginTop = '5px';
    waveBtn.style.marginBottom = '10px';
    waveBtn.style.textAlign = 'center';
    waveBtn.style.cursor = 'pointer';
    waveBtn.style.fontSize = '0.7rem';
    waveBtn.style.fontWeight = 'bold';
    waveBtn.style.color = '#ff9900';
    waveBtn.style.background = '#222';
    waveBtn.style.padding = '5px';
    waveBtn.style.borderRadius = '4px';
    waveBtn.style.border = '1px solid #444';
    waveBtn.innerText = 'SAW';
    
    waveBtn.onclick = () => {
        this.currentWave = (this.currentWave + 1) % this.waveTypes.length;
        const type = this.waveTypes[this.currentWave];
        this.oscillator.type = type;
        
        // Symbol or Abbrev
        const labels = { 'sine': 'SIN', 'triangle': 'TRI', 'sawtooth': 'SAW', 'square': 'SQR' };
        waveBtn.innerText = labels[type];
    };
    
    this.controlsContainer.appendChild(waveBtn);
    
    // Jacks
    // Output: Direct form Oscillator
    this.addJack('OUT', 'out', this.oscillator);
    
    // 1V/Oct Input
    // Route to detune: 1V = 1200 cents
    this.voctGain = this.context.createGain();
    this.voctGain.gain.value = 1200;
    this.voctGain.connect(this.oscillator.detune);
    this.addJack('V/OCT', 'in', { node: this.voctGain });
    
    // Input: FM / CV (Linear FM)
    this.fmGain = this.context.createGain();
    this.fmGain.gain.value = 100; // Modulation depth
    this.fmGain.connect(this.oscillator.frequency); // Linear FM
    
    this.addJack('FM', 'in', { node: this.fmGain });
  }
}
