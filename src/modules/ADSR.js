import { BaseModule } from './BaseModule.js';

export class ADSR extends BaseModule {
  constructor() {
    super('ADSR');

    // Params (Time in seconds, Sustain 0-1)
    this.attack = 0.01;
    this.decay = 0.1;
    this.sustain = 0.5;
    this.release = 0.3;

    // Output is a control signal
    // We use a ConstantSourceNode which we automate
    this.envNode = this.context.createConstantSource();
    this.envNode.offset.value = 0;
    this.envNode.start();

    // Input Logic (Gate Detector)
    // We need to detect 0->1 transitions to trigger the envelope
    this.gateInput = this.context.createGain();
    this.gateInput.gain.value = 1;

    // Processor to watch for Gate signals
    // Try AudioWorklet first
    try {
        this.processor = new AudioWorkletNode(this.context, 'gate-processor');
        this.processor.port.onmessage = (e) => {
            if (e.data === 'trigger') this.triggerAttack();
            if (e.data === 'release') this.triggerRelease();
        };
        this.gateInput.connect(this.processor);
        this.processor.connect(this.context.destination); // Keep alive
    } catch(e) {
        console.warn("AudioWorklet 'gate-processor' not found, falling back to ScriptProcessor. Warning: ScriptProcessor is deprecated.");
        // Fallback: ScriptProcessor
        this.processor = this.context.createScriptProcessor(256, 1, 1);
        this.gateInput.connect(this.processor);
        this.processor.connect(this.context.destination); 

        this.lastGate = 0;
        this.processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          let currentGate = 0;
          for(let i=0; i<input.length; i++) {
              if(input[i] > 0.5) {
                  currentGate = 1;
                  break;
              }
          }

          if (currentGate === 1 && this.lastGate === 0) {
            this.triggerAttack();
          } else if (currentGate === 0 && this.lastGate === 1) {
            this.triggerRelease();
          }
          this.lastGate = currentGate;
        };
    }

    // Display / LED
    this.led = document.createElement('div');
    this.led.style.width = '10px';
    this.led.style.height = '10px';
    this.led.style.borderRadius = '50%';
    this.led.style.background = '#333';
    this.led.style.margin = '10px auto';
    this.led.style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.5)';
    this.controlsContainer.appendChild(this.led);

    // Manual Trigger Button
    const trigBtn = document.createElement('button');
    trigBtn.innerText = 'MANUAL';
    trigBtn.style.fontSize = '0.7rem';
    trigBtn.style.width = '100%';
    trigBtn.style.marginTop = '5px';
    trigBtn.onclick = () => {
        this.triggerAttack();
        setTimeout(() => this.triggerRelease(), 200);
    };
    this.controlsContainer.appendChild(trigBtn);

    // Knobs
    this.addKnob('A', null, 0.001, 2, 0.01);
    this.addKnob('D', null, 0.001, 2, 0.1);
    this.addKnob('S', null, 0, 1, 0.5);
    this.addKnob('R', null, 0.001, 5, 0.3);

    // Override Knob Changes to update local vars
    this.onKnobChange = (label, val) => {
      if (label === 'A') this.attack = val;
      if (label === 'D') this.decay = val;
      if (label === 'S') this.sustain = val;
      if (label === 'R') this.release = val;
    };

    // Jacks
    this.addJack('GATE', 'in', this.gateInput);
    this.addJack('OUT', 'out', this.envNode);
  }

  triggerAttack() {
    const now = this.context.currentTime;
    const target = this.envNode.offset;
    
    // Use cancelAndHoldAtTime if available to prevent clicking
    try {
        target.cancelAndHoldAtTime(now); 
    } catch(e) {
        // Fallback for older browsers (though Chrome/Edge support this)
        target.cancelScheduledValues(now);
    }
    
    // We don't read .value because it's static.
    // By cancelling, we hold the current automated value.
    // Ramp to 1
    target.linearRampToValueAtTime(1, now + this.attack);
    // Decay to Sustain
    target.linearRampToValueAtTime(this.sustain, now + this.attack + this.decay);
    
    this.led.style.background = '#ff0000';
    this.led.style.boxShadow = '0 0 10px #ff0000';
  }

  triggerRelease() {
    const now = this.context.currentTime;
    const target = this.envNode.offset;
    
    try {
        target.cancelAndHoldAtTime(now);
    } catch(e) {
        target.cancelScheduledValues(now);
    }
    
    target.linearRampToValueAtTime(0, now + this.release);
    
    this.led.style.background = '#333';
    this.led.style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.5)';
  }
}
