import { getAudioContext } from '../audio/context.js';

export class BaseModule {
  constructor(name) {
    this.name = name;
    this.context = getAudioContext();
    this.element = document.createElement('div');
    this.element.className = 'module';
    this.element.innerHTML = `
      <div class="screw tl"></div>
      <div class="screw tr"></div>
      <div class="screw bl"></div>
      <div class="screw br"></div>
      <div class="module-header">${name}</div>
      <div class="control-row"></div>
      <div class="jack-container"></div>
    `;
    
    this.controlsContainer = this.element.querySelector('.control-row');
    this.jacksContainer = this.element.querySelector('.jack-container');
    
    this.jacks = {}; // Registry of jacks { id: { type, node, param } }
    this.knobUpdaters = {}; // Registry for updating knobs from valid code
  }

  mount(parent) {
    parent.appendChild(this.element);
  }

  // Add a knob that controls an AudioParam
  addKnob(label, param, min, max, defaultValue) {
    const container = document.createElement('div');
    container.className = 'knob-container';
    
    const knob = document.createElement('div');
    knob.className = 'knob';
    
    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    labelEl.innerText = label;
    
    container.appendChild(knob);
    this.controlsContainer.appendChild(container);
    this.controlsContainer.appendChild(labelEl);

    // Initial Value
    if (param) {
      param.value = defaultValue;
    }
    
    // Interaction logic
    let isDragging = false;
    let startY = 0;
    let currentVal = defaultValue;

    // Helper to map value to rotation (-150deg to 150deg)
    const updateVisuals = () => {
      const pct = (currentVal - min) / (max - min);
      const angle = -150 + (pct * 300);
      knob.style.transform = `rotate(${angle}deg)`;
    };
    updateVisuals();

    // Register updater
    this.knobUpdaters[label] = (val) => {
        currentVal = Math.max(min, Math.min(max, val));
        if (param) {
            // Instant update for presets
            param.value = currentVal;
            param.setValueAtTime(currentVal, this.context.currentTime);
        }
        updateVisuals();
        
        // Trigger callback if defined (important for non-AudioParam knobs like ADSR or Mix)
        if (this.onKnobChange) this.onKnobChange(label, currentVal); 
    };

    knob.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dy = startY - e.clientY;
      const sensitivity = (max - min) / 200; // 200px for full range
      let newVal = currentVal + (dy * sensitivity);
      newVal = Math.max(min, Math.min(max, newVal));
      
      if (newVal !== currentVal) {
        currentVal = newVal;
        if (param) {
          // Smooth smoothing?
           param.setTargetAtTime(newVal, this.context.currentTime, 0.01);
        }
        updateVisuals();
        // Trigger callback if needed
        if (this.onKnobChange) this.onKnobChange(label, newVal);
      }
      startY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      if(isDragging) {
        isDragging = false;
        document.body.style.cursor = 'default';
      }
    });

    return knob;
  }

  setKnobValue(label, value) {
      if (this.knobUpdaters[label]) {
          this.knobUpdaters[label](value);
      }
  }

  // Add a Jack (Input or Output)
  addJack(name, type, target) {
    // target is AudioNode (for output) or { node, param } (for input)
    const jack = document.createElement('div');
    jack.className = 'jack';
    jack.dataset.id = `${this.name}-${name}`;
    jack.dataset.module = this.name;
    jack.dataset.jack = name;
    jack.dataset.type = type; // 'in' or 'out'
    jack.title = name;

    const label = document.createElement('div');
    label.className = 'label';
    label.innerText = name;
    
    this.jacksContainer.appendChild(jack);
    this.jacksContainer.appendChild(label);

    this.jacks[name] = {
      type,
      target, // The Web Audio entity
      element: jack
    };
  }

  getJack(name) {
    return this.jacks[name];
  }
}
