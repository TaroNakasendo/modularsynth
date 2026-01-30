import { BaseModule } from './BaseModule.js';

export class Keyboard extends BaseModule {
  constructor() {
    super('KEYBOARD');
    
    // Constant Source Nodes for output
    // CV Output
    this.cvNode = this.context.createConstantSource();
    this.cvNode.offset.value = 0;
    this.cvNode.start();
    
    // Gate Output
    this.gateNode = this.context.createConstantSource();
    this.gateNode.offset.value = 0;
    this.gateNode.start();
    
    // Jacks
    this.addJack('CV', 'out', this.cvNode);
    this.addJack('GATE', 'out', this.gateNode);
    
    // Key mapping (Z=C3, approx)
    // We map keys 'Z'...'M' and 'Q'...'P' etc.
    // Let's us typical tracker/DAW layout:
    // Z S X D C V G B H N J M  => C C# D D# E F F# G G# A A# B
    // Q 2 W 3 E R 5 T 6 Y 7 U  => C C# D D# E F F# G G# A A# B (+1 octave)
    
    this.keyMap = {
      'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11,
      ',': 12, 'l': 13, '.': 14, ';': 15, '/': 16,
      'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23,
      'i': 24, '9': 25, 'o': 26, '0': 27, 'p': 28
    };

    // Tracks currently pressed keys for simple priority
    this.activeKeys = []; // Stack of implementation

    this.initKeyboardListeners();
    
    // Display last note?
    this.display = document.createElement('div');
    this.display.style.fontFamily = 'monospace';
    this.display.style.textAlign = 'center';
    this.display.style.marginTop = '10px';
    this.display.style.color = 'var(--accent-color)';
    this.display.innerText = 'WAITING';
    this.element.appendChild(this.display);
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (this.keyMap.hasOwnProperty(key)) {
        if (!this.activeKeys.includes(key)) {
          this.activeKeys.push(key);
          this.triggerNote();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      if (this.activeKeys.includes(key)) {
        this.activeKeys = this.activeKeys.filter(k => k !== key);
        this.triggerNote();
      }
    });
  }

  triggerNote() {
    if (this.activeKeys.length > 0) {
      // Last note priority
      const lastKey = this.activeKeys[this.activeKeys.length - 1];
      const semitone = this.keyMap[lastKey];
      
      // Calculate Volts: 1v/oct = 1/12 volts per semitone.
      const volts = semitone / 12;
      
      // CV Update
      // this.cvNode.offset.value = volts; // Instant jump
      // Use setTargetAtTime for glide? Let's just do instant for now.
      this.cvNode.offset.setValueAtTime(volts, this.context.currentTime);
      
      // Gate On
      if (this.gateNode.offset.value === 0) {
        this.gateNode.offset.setValueAtTime(1, this.context.currentTime);
      }
      
      this.display.innerText = `NOTE: ${semitone}`;
      
    } else {
      // Gate Off
      this.gateNode.offset.setValueAtTime(0, this.context.currentTime);
      this.display.innerText = 'OFF';
    }
  }
}
