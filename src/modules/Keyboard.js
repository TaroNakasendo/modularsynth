import { BaseModule } from './BaseModule.js';

export class Keyboard extends BaseModule {
  constructor() {
    super('KEYBOARD');
    
    // Constant Source Nodes for output
    this.cvNode = this.context.createConstantSource();
    this.cvNode.offset.value = 0;
    this.cvNode.start();
    
    this.gateNode = this.context.createConstantSource();
    this.gateNode.offset.value = 0;
    this.gateNode.start();
    
    // Jacks
    this.addJack('CV', 'out', this.cvNode);
    this.addJack('GATE', 'out', this.gateNode);
    
    // Key mapping
    this.keyMap = {
      'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11,
      ',': 12, 'l': 13, '.': 14, ';': 15, '/': 16,
      'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23,
      'i': 24, '9': 25, 'o': 26, '0': 27, 'p': 28
    };

    // Tracks currently pressed keys
    this.activeKeys = []; 

    // Arpeggiator State
    this.isArpOn = false;
    this.arpRate = 200; // ms
    this.arpInterval = null;
    this.arpIndex = 0;
    
    // UI: Arp Toggle
    this.createButton('ARP OFF', () => {
        this.isArpOn = !this.isArpOn;
        const btn = this.element.querySelector('.arp-btn');
        btn.innerText = this.isArpOn ? 'ARP ON' : 'ARP OFF';
        btn.style.color = this.isArpOn ? '#ff9900' : '#aaa';
        
        if (this.isArpOn) {
            this.startArp();
        } else {
            this.stopArp();
            this.triggerNote();
        }
    }, 'arp-btn');
    
    // Rate Control
    this.rateParam = this.context.createGain().gain;
    this.addKnob('RATE', this.rateParam, 1, 15, 5);

    this.onKnobChange = (label, val) => {
       if (label === 'RATE') {
         this.arpRate = 1000 / val;
         if (this.isArpOn) {
             this.restartArp();
         }
       }
    };

    this.initKeyboardListeners();
    
    // Display
    this.display = document.createElement('div');
    this.display.style.fontFamily = 'monospace';
    this.display.style.textAlign = 'center';
    this.display.style.marginTop = '10px';
    this.display.style.color = 'var(--accent-color)';
    this.display.innerText = 'WAITING';
    this.element.appendChild(this.display);
  }

  createButton(label, callback, className) {
    const btn = document.createElement('div');
    btn.className = 'button ' + (className || '');
    btn.innerText = label;
    btn.style.marginTop = '10px';
    btn.style.padding = '5px';
    btn.style.background = '#444';
    btn.style.textAlign = 'center';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '4px';
    btn.style.fontSize = '0.7em';
    btn.style.userSelect = 'none';
    btn.style.border = '1px solid #222';

    btn.addEventListener('click', callback);
    this.controlsContainer.appendChild(btn);
  }

  startArp() {
    if (this.arpInterval) clearInterval(this.arpInterval);
    this.arpTick(); 
    this.arpInterval = setInterval(() => this.arpTick(), this.arpRate);
  }

  stopArp() {
    if (this.arpInterval) clearInterval(this.arpInterval);
    this.arpInterval = null;
  }

  restartArp() {
      this.stopArp();
      this.startArp();
  }

  arpTick() {
    if (this.context.state === 'suspended') return;
    
    if (this.activeKeys.length === 0) {
        this.gateNode.offset.setValueAtTime(0, this.context.currentTime);
        this.display.innerText = 'ARP...';
        return; 
    }

    this.arpIndex = (this.arpIndex + 1) % this.activeKeys.length;
    
    const key = this.activeKeys[this.arpIndex];
    if (key === undefined) return; 

    const semitone = this.keyMap[key];
    const volts = semitone / 12;
    const now = this.context.currentTime;
    
    this.cvNode.offset.setValueAtTime(volts, now);
    
    // Gate Pulse
    const gateLen = (this.arpRate / 1000) * 0.5;
    this.gateNode.offset.cancelScheduledValues(now);
    this.gateNode.offset.setValueAtTime(1, now);
    this.gateNode.offset.setValueAtTime(0, now + gateLen);
    
    this.display.innerText = `ARP: ${semitone}`;
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (this.keyMap.hasOwnProperty(key)) {
        if (!this.activeKeys.includes(key)) {
          this.activeKeys.push(key);
          // Sort functionality for Up Arp
          this.activeKeys.sort((a,b) => this.keyMap[a] - this.keyMap[b]);
          
          if (this.isArpOn) {
             if (this.activeKeys.length === 1) this.arpIndex = -1;
          } else {
             this.triggerNote();
          }
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (this.activeKeys.includes(key)) {
        this.activeKeys = this.activeKeys.filter(k => k !== key);
        if (!this.isArpOn) this.triggerNote();
      }
    });
  }

  triggerNote() {
    if (this.isArpOn) return;

    if (this.activeKeys.length > 0) {
      // Manual play: Highest note priority (since array is sorted)
      const lastKey = this.activeKeys[this.activeKeys.length - 1];
      const semitone = this.keyMap[lastKey];
      const volts = semitone / 12;
      
      this.cvNode.offset.cancelScheduledValues(this.context.currentTime);
      this.cvNode.offset.setValueAtTime(volts, this.context.currentTime);
      
      if (this.gateNode.offset.value === 0) {
        this.gateNode.offset.setValueAtTime(1, this.context.currentTime);
      }
      this.display.innerText = `NOTE: ${semitone}`;
    } else {
      this.gateNode.offset.cancelScheduledValues(this.context.currentTime);
      this.gateNode.offset.setValueAtTime(0, this.context.currentTime);
      this.display.innerText = 'OFF';
    }
  }
}
