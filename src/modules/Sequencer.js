import { BaseModule } from './BaseModule.js';

export class Sequencer extends BaseModule {
  constructor() {
    super('SEQ-8');

    // State
    this.steps = [0, 0, 0, 0, 0, 0, 0, 0]; // 0-1 values (will map to pitch)
    this.currentStep = 0;
    this.isRunning = true;
    this.tempo = 300; // ms
    this.timer = null;

    // Output Nodes
    this.cvOut = this.context.createConstantSource();
    this.cvOut.offset.value = 0;
    this.cvOut.start();

    this.gateOut = this.context.createConstantSource();
    this.gateOut.offset.value = 0;
    this.gateOut.start();

    // UI Layout tweaks
    this.controlsContainer.style.flexDirection = 'row';
    this.controlsContainer.style.flexWrap = 'wrap';
    this.controlsContainer.style.justifyContent = 'space-around';
    
    // Tempo Knob (Global)
    const rateContainer = document.createElement('div');
    rateContainer.style.width = '100%';
    rateContainer.style.display = 'flex';
    rateContainer.style.flexDirection = 'column';
    rateContainer.style.alignItems = 'center';
    rateContainer.style.marginBottom = '10px';
    rateContainer.style.borderBottom = '1px solid #444';
    rateContainer.style.paddingBottom = '5px';
    this.controlsContainer.appendChild(rateContainer);
    
    // Hack: Temporarily redirect controlsContainer to rateContainer to add Rate knob
    const realContainer = this.controlsContainer;
    this.controlsContainer = rateContainer;
    this.addKnob('RATE', null, 50, 1000, 300);
    this.controlsContainer = realContainer; // Restore

    // Steps UI
    this.stepKnobs = [];
    this.leds = [];

    for(let i=0; i<8; i++) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'center';
        wrapper.style.width = '45%'; // 2 per row
        wrapper.style.marginBottom = '5px';

        // LED
        const led = document.createElement('div');
        led.style.width = '8px';
        led.style.height = '8px';
        led.style.borderRadius = '50%';
        led.style.background = '#333';
        led.style.marginBottom = '2px';
        wrapper.appendChild(led);
        this.leds.push(led);
        
        // Use a mini-knob by hacking the addKnob method? 
        // Or just custom range input.
        // BaseModule.addKnob appends to this.controlsContainer.
        // I want to append to `wrapper`.
        
        // Manual Knob implementation for compact size
        const knob = document.createElement('input');
        knob.type = 'range';
        knob.min = 0;
        knob.max = 24; // 2 octaves
        knob.value = 0; // default C
        knob.step = 1; // Semitones
        knob.style.width = '100%';
        knob.style.height = '10px'; // Slim
        knob.className = 'seq-slider'; // We might need CSS for this
        
        knob.addEventListener('input', (e) => {
            this.steps[i] = parseInt(e.target.value);
        });

        const label = document.createElement('div');
        label.innerText = (i+1);
        label.className = 'label';
        
        wrapper.appendChild(knob);
        wrapper.appendChild(label);
        this.controlsContainer.appendChild(wrapper);
    }

    // Play/Stop
    const toggleBtn = document.createElement('button');
    toggleBtn.innerText = 'STOP';
    toggleBtn.style.width = '100%';
    toggleBtn.style.marginTop = '5px';
    toggleBtn.style.fontSize = '0.7rem';
    toggleBtn.style.background = '#550000';
    toggleBtn.onclick = () => {
        this.isRunning = !this.isRunning;
        toggleBtn.innerText = this.isRunning ? 'STOP' : 'RUN';
        toggleBtn.style.background = this.isRunning ? '#550000' : '#005500';
    };
    this.controlsContainer.appendChild(toggleBtn);


    this.onKnobChange = (label, val) => {
        if (label === 'RATE') {
            this.tempo = val;
            this.restart();
        }
    };

    // Jack
    this.addJack('CV', 'out', this.cvOut);
    this.addJack('GATE', 'out', this.gateOut);

    this.start();
  }

  start() {
      if (this.timer) clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), this.tempo);
  }

  restart() {
      this.start();
  }

  tick() {
      if (!this.isRunning || this.context.state === 'suspended') return;

      // Update LEDs
      this.leds.forEach((l, i) => {
          l.style.background = (i === this.currentStep) ? '#ff0000' : '#333';
          l.style.boxShadow = (i === this.currentStep) ? '0 0 5px #ff0000' : 'none';
      });

      // Output Voltage
      const semitone = this.steps[this.currentStep];
      const volts = semitone / 12;
      const now = this.context.currentTime;
      
      this.cvOut.offset.setValueAtTime(volts, now);
      
      // Gate Logic (50% duty cycle)
      const gateLen = (this.tempo / 1000) * 0.5;
      this.gateOut.offset.cancelScheduledValues(now);
      this.gateOut.offset.setValueAtTime(1, now);
      this.gateOut.offset.setValueAtTime(0, now + gateLen);

      // Advance
      this.currentStep = (this.currentStep + 1) % 8;
      
      // Re-schedule based on current tempo (simple drift fix if needed, but setInterval is okay for UI)
      // For tight timing we'd use lookahead, but for this toy it's fine.
      if (this.timer) {
          clearInterval(this.timer);
          this.timer = setInterval(() => this.tick(), this.tempo);
      }
  }
}
