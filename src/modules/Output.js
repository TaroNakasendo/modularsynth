import { BaseModule } from './BaseModule.js';

export class Output extends BaseModule {
  constructor() {
    super('OUTPUT');
    
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.5;
    
    // Connect to hardware output
    this.masterGain.connect(this.context.destination);
    
    this.addKnob('VOL', this.masterGain.gain, 0, 1, 0.5);
    
    this.addJack('IN', 'in', { node: this.masterGain });
    
    // Maybe a visualizer later?
  }
}
