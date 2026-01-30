import { BaseModule } from './BaseModule.js';

export class Reverb extends BaseModule {
  constructor() {
    super('REVERB');
    
    this.convolver = this.context.createConvolver();
    
    // Wet/Dry Mix
    this.inputNode = this.context.createGain();
    this.outputNode = this.context.createGain();
    
    this.dryGain = this.context.createGain();
    this.wetGain = this.context.createGain();
    
    this.inputNode.connect(this.dryGain);
    this.inputNode.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    
    this.dryGain.connect(this.outputNode);
    this.wetGain.connect(this.outputNode);
    
    // Initial Mix
    this.updateMix(0.5); 
    
    // Initial Impulse
    this.seconds = 3;
    this.generateImpulse(this.seconds);
    
    // Controls
    this.addKnob('TIME', null, 0.1, 5, 3).onmousedown = () => {}; // We need custom callback
    // Wait, addKnob returns the element, but doesn't expose value callback easily in BaseModule unless connected to param.
    // We need to implement the callback mechanism I added to Keyboard in BaseModule? 
    // Or just re-implement here.
    
    // Actually, I can use a dummy gain for "Time" and "Mix" params and listen to them?
    // Or just hack it like I did in Keyboard (assigning onKnobChange).
    
    this.timeParam = this.context.createGain().gain; // Dummy
    this.mixParam = this.context.createGain().gain; // Dummy
    
    this.addKnob('TIME', this.timeParam, 0.1, 10, 3);
    this.addKnob('MIX', this.mixParam, 0, 1, 0.5);
    
    this.onKnobChange = (label, val) => {
      if (label === 'TIME') {
        this.generateImpulse(val);
      } else if (label === 'MIX') {
        this.updateMix(val);
      }
    };
    
    // Jacks
    this.addJack('IN', 'in', { node: this.inputNode });
    this.addJack('OUT', 'out', this.outputNode);
  }

  updateMix(val) {
    // Equal power crossfade
    this.dryGain.gain.value = Math.cos(val * 0.5 * Math.PI);
    this.wetGain.gain.value = Math.sin(val * 0.5 * Math.PI);
  }

  generateImpulse(duration) {
    const rate = this.context.sampleRate;
    const length = rate * duration;
    const impulse = this.context.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    
    for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2); // Simple exponential-ish decay
        // Noise
        left[i] = (Math.random() * 2 - 1) * decay;
        right[i] = (Math.random() * 2 - 1) * decay;
    }
    
    this.convolver.buffer = impulse;
  }
}
