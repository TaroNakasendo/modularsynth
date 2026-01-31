
import { BaseModule } from './BaseModule.js';

export class Vocoder extends BaseModule {
  constructor() {
    super('VOCODER');
    
    // Configuration
    this.bands = 20;
    this.detectors = [];
    this.filters = [];
    this.vcas = [];
    this.carrierFilters = [];
    
    // Main Nodes
    this.modulatorInput = this.context.createGain(); // Audio from Mic or Jack
    this.carrierInput = this.context.createGain();   // Audio from Synth
    this.outputNode = this.context.createGain();
    
    // Internal Mic Handling
    this.micStream = null;
    this.micSource = null;
    
    // Initialize Bands
    this.setupBands(this.bands);

    // Controls
    // Mic Toggle
    this.micBtn = document.createElement('div');
    this.micBtn.className = 'button';
    this.micBtn.style.marginTop = '10px';
    this.micBtn.style.textAlign = 'center';
    this.micBtn.style.cursor = 'pointer';
    this.micBtn.style.fontSize = '0.7rem';
    this.micBtn.style.fontWeight = 'bold';
    this.micBtn.style.color = '#fff';
    this.micBtn.style.background = '#444';
    this.micBtn.style.padding = '5px';
    this.micBtn.style.borderRadius = '4px';
    this.micBtn.style.border = '1px solid #666';
    this.micBtn.innerText = 'MIC: OFF';
    
    this.micBtn.onclick = () => this.toggleMic();
    this.controlsContainer.appendChild(this.micBtn);
    
    // Sensitivity Knob
    // Controls modulator input gain. High for Mic, Low for Line level.
    this.modulatorInput.gain.value = 1.0; 
    this.addKnob('SENS', this.modulatorInput.gain, 0, 5, 1.0);
    
    // Jacks
    this.addJack('CARRIER', 'in', { node: this.carrierInput });
    this.addJack('MOD', 'in', { node: this.modulatorInput }); // External modulator option
    this.addJack('OUT', 'out', this.outputNode);
  }

  setupBands(count) {
      // Clear existing if any (though currently only called once)
      
      // Frequencies from 50Hz to 12kHz logarithmic for better detail
      const startFreq = 50;
      const endFreq = 12000;
      const multiplier = Math.pow(endFreq / startFreq, 1 / count);
      
      for (let i = 0; i < count; i++) {
          const freq = startFreq * Math.pow(multiplier, i);
          
          // 1. Analysis Branch (Modulator)
          const analyzer = this.context.createBiquadFilter();
          analyzer.type = 'bandpass';
          analyzer.frequency.value = freq;
          analyzer.Q.value = 10.0; // Higher Q for sharper bands (fewer overlaps)
          
          this.modulatorInput.connect(analyzer);
          
          // Envelope Follower
          const rectifier = this.context.createWaveShaper();
          rectifier.curve = this.makeAbsCurve();
          
          const smoother = this.context.createBiquadFilter();
          smoother.type = 'lowpass';
          smoother.frequency.value = 80; // Faster response (60-100Hz is good for speech)
          
          analyzer.connect(rectifier);
          rectifier.connect(smoother);
          
          // 2. Synthesis Branch (Carrier)
          const sourceFilter = this.context.createBiquadFilter();
          sourceFilter.type = 'bandpass';
          sourceFilter.frequency.value = freq;
          sourceFilter.Q.value = 10.0;
          
          this.carrierInput.connect(sourceFilter);
          
          // 3. VCA
          const vca = this.context.createGain();
          vca.gain.value = 0;
          
          sourceFilter.connect(vca);
          vca.connect(this.outputNode);
          
          // Apply Envelope to VCA Gain
          const gainBooster = this.context.createGain();
          gainBooster.gain.value = 100.0; // High gain to catch average speech levels 
          
          smoother.connect(gainBooster);
          gainBooster.connect(vca.gain);
          
          // Keep references
          this.filters.push({ analyzer, sourceFilter, smoother, vca, rectifier, gainBooster });
      }
  }

  makeAbsCurve() {
      const curve = new Float32Array(65536);
      for (let i = 0; i < 65536; i++) {
        const x = (i / 65536) * 2 - 1;
        curve[i] = Math.abs(x);
      }
      return curve;
  }

  async toggleMic() {
      if (this.micStream) {
          // Turn Off
          this.micStream.getTracks().forEach(t => t.stop());
          this.micStream = null;
          if (this.micSource) this.micSource.disconnect();
          this.micBtn.innerText = 'MIC: OFF';
          this.micBtn.style.background = '#444';
          this.micBtn.style.color = '#fff';
      } else {
          try {
              this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              this.micSource = this.context.createMediaStreamSource(this.micStream);
              this.micSource.connect(this.modulatorInput);
              
              this.micBtn.innerText = 'MIC: ON';
              this.micBtn.style.background = '#f00'; // Recording/Hot
              this.micBtn.style.color = '#fff';
          } catch (err) {
              console.error('Mic Access Denied', err);
              this.micBtn.innerText = 'ERR';
              alert('Microphone access denied or not available.');
          }
      }
  }
}
