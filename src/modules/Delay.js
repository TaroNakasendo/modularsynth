import { BaseModule } from './BaseModule.js';

export class Delay extends BaseModule {
  constructor() {
    super('DELAY');

    // Audio Nodes
    this.input = this.context.createGain();
    this.output = this.context.createGain();
    
    this.delayNode = this.context.createDelay(5.0); // Max 5 sec
    this.feedbackGain = this.context.createGain();
    this.mixNode = this.context.createGain();
    this.dryNode = this.context.createGain();

    // Default Params
    this.delayNode.delayTime.value = 0.3;
    this.feedbackGain.gain.value = 0.4;
    
    // Mix Logic (Crossfade)
    // 0 = Dry, 1 = Wet
    this.setMix(0.5);

    // Graph
    // In -> Dry -> Out
    // In -> Delay -> Mix -> Out
    // Delay -> FB -> Delay
    
    this.input.connect(this.dryNode);
    this.dryNode.connect(this.output);

    this.input.connect(this.delayNode);
    this.delayNode.connect(this.mixNode);
    this.mixNode.connect(this.output);

    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);

    // Knobs
    this.addKnob('TIME', this.delayNode.delayTime, 0.01, 1.0, 0.3);
    this.addKnob('FB', this.feedbackGain.gain, 0, 0.95, 0.4); // Limit < 1 to prevent explosion
    
    // Mix Knob - Manual Handler
    this.mixVal = 0.5;
    this.addKnob('MIX', null, 0, 1, 0.5);
    
    this.onKnobChange = (label, val) => {
        if (label === 'MIX') {
            this.setMix(val);
        }
    };

    // Jacks
    this.addJack('IN', 'in', this.input);
    this.addJack('OUT', 'out', this.output);
  }

  setMix(val) {
      // Linear crossfade
      this.dryNode.gain.value = 1 - val;
      this.mixNode.gain.value = val;
  }
}
