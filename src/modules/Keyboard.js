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
    
    // Ribbon Controller Nodes
    this.ribbonCvNode = this.context.createConstantSource();
    this.ribbonCvNode.offset.value = 0;
    this.ribbonCvNode.start();
    
    this.ribbonGateNode = this.context.createConstantSource();
    this.ribbonGateNode.offset.value = 0;
    this.ribbonGateNode.start();
    
    // Mix ribbon gate into main gate
    this.ribbonGateNode.connect(this.gateNode.offset);

    this.addJack('RIBBON', 'out', this.ribbonCvNode);
    this.addJack('R.GATE', 'out', this.ribbonGateNode);
    
    // Key mapping
    this.keyMap = {
      'z': 0, 's': 1, 'x': 2, 'd': 3, 'c': 4, 'v': 5, 'g': 6, 'b': 7, 'h': 8, 'n': 9, 'j': 10, 'm': 11,
      ',': 12, 'l': 13, '.': 14, ';': 15, '/': 16,
      'q': 12, '2': 13, 'w': 14, '3': 15, 'e': 16, 'r': 17, '5': 18, 't': 19, '6': 20, 'y': 21, '7': 22, 'u': 23,
      'i': 24, '9': 25, 'o': 26, '0': 27, 'p': 28
    };

    // Tracks currently pressed keys
    this.activeKeys = []; 
    this.physicalKeys = [];
    this.isLatchOn = false;

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

    // UI: Hold Toggle
    this.createButton('HOLD OFF', () => {
        this.isLatchOn = !this.isLatchOn;
        const btn = this.element.querySelector('.hold-btn');
        btn.innerText = this.isLatchOn ? 'HOLD ON' : 'HOLD OFF';
        btn.style.color = this.isLatchOn ? '#00ff00' : '#aaa';

        if (!this.isLatchOn && this.physicalKeys.length === 0) {
            this.activeKeys = [];
            if (!this.isArpOn) this.triggerNote();
        }
    }, 'hold-btn');
    
    // Octave Controls
    this.octave = 0;
    
    const octRow = document.createElement('div');
    octRow.style.display = 'flex';
    octRow.style.justifyContent = 'space-between';
    octRow.style.width = '100%';
    octRow.style.marginTop = '10px';
    
    const createOctBtn = (label, diff) => {
        const btn = document.createElement('div');
        btn.className = 'button';
        btn.innerText = label;
        btn.style.width = '45%';
        btn.style.padding = '5px';
        btn.style.background = '#444';
        btn.style.textAlign = 'center';
        btn.style.cursor = 'pointer';
        btn.style.borderRadius = '4px';
        btn.style.fontSize = '0.7em';
        btn.style.userSelect = 'none';
        btn.style.border = '1px solid #222';
        
        btn.onclick = () => {
            this.octave += diff;
            // Clamp? -3 to +3
            this.octave = Math.max(-3, Math.min(3, this.octave));
            this.display.innerText = `OCT: ${this.octave}`;
        };
        return btn;
    };
    
    octRow.appendChild(createOctBtn('OCT -', -1));
    octRow.appendChild(createOctBtn('OCT +', 1));
    this.controlsContainer.appendChild(octRow);
    
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
    // Auto-render if container exists
    const container = document.getElementById('virtual-keyboard');
    if (container) {
        this.renderVirtualKeyboard(container);
    }
    
    // Display
    this.display = document.createElement('div');
    this.display.style.fontFamily = 'monospace';
    this.display.style.textAlign = 'center';
    this.display.style.marginTop = '10px';
    this.display.style.color = 'var(--accent-color)';
    this.display.innerText = 'WAITING';
    this.element.appendChild(this.display);

    // Flowing LEDs
    const ledRow = document.createElement('div');
    ledRow.style.display = 'flex';
    ledRow.style.justifyContent = 'center';
    ledRow.style.gap = '6px';
    ledRow.style.marginTop = '10px';
    
    this.leds = [];
    for(let i=0; i<8; i++) {
        const led = document.createElement('div');
        led.style.width = '8px';
        led.style.height = '8px';
        led.style.borderRadius = '50%';
        led.style.background = '#333';
        led.style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.5)';
        ledRow.appendChild(led);
        this.leds.push(led);
    }
    this.element.appendChild(ledRow);
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
  
  // Logic extracted for Virtual Keyboard
  handleKeyDown(key) {
      if (this.keyMap.hasOwnProperty(key)) {
        
        // Latch Logic: Start a new chord if hands were off
        if (this.isLatchOn && this.physicalKeys.length === 0) {
           this.activeKeys = [];
           this.arpIndex = -1; 
        }

        if (!this.physicalKeys.includes(key)) {
            this.physicalKeys.push(key);
        }

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
        
        // Update Visuals
        this.updateVirtualKey(key, true);
      }
  }

  handleKeyUp(key) {
      // Update physical tracking
      if (this.physicalKeys.includes(key)) {
          this.physicalKeys = this.physicalKeys.filter(k => k !== key);
      }

      // Removal logic
      if (!this.isLatchOn) {
          if (this.activeKeys.includes(key)) {
            this.activeKeys = this.activeKeys.filter(k => k !== key);
            if (!this.isArpOn) this.triggerNote();
          }
      }
      
      // Update Visuals
      // Always turn off visual representation on key up to reflect physical state
      this.updateVirtualKey(key, false);
  }

  updateVirtualKey(key, isActive) {
      // Find button by data-key
      const btn = document.querySelector(`.v-key[data-key="${key}"]`);
      if (btn) {
          if (isActive) btn.classList.add('active');
          else btn.classList.remove('active');
      }
  }

  renderVirtualKeyboard(container) {
      container.innerHTML = '';
      
      const keys = [
          { k: 'z', n: 0, l: 'C' }, { k: 's', n: 1, l: 'C#' }, { k: 'x', n: 2, l: 'D' }, { k: 'd', n: 3, l: 'D#' },
          { k: 'c', n: 4, l: 'E' }, { k: 'v', n: 5, l: 'F' }, { k: 'g', n: 6, l: 'F#' }, { k: 'b', n: 7, l: 'G' },
          { k: 'h', n: 8, l: 'G#' }, { k: 'n', n: 9, l: 'A' }, { k: 'j', n: 10, l: 'A#' }, { k: 'm', n: 11, l: 'B' },
          
          { k: 'q', n: 12, l: 'C' }, { k: '2', n: 13, l: 'C#' }, { k: 'w', n: 14, l: 'D' }, { k: '3', n: 15, l: 'D#' },
          { k: 'e', n: 16, l: 'E' }, { k: 'r', n: 17, l: 'F' }, { k: '5', n: 18, l: 'F#' }, { k: 't', n: 19, l: 'G' },
          { k: '6', n: 20, l: 'G#' }, { k: 'y', n: 21, l: 'A' }, { k: '7', n: 22, l: 'A#' }, { k: 'u', n: 23, l: 'B' }
      ];
      keys.sort((a,b) => a.n - b.n);

      const KEY_WIDTH = 40;
      const GAP = 3;
      
      // Separate White and Black for positioning
      // We need to know the index of the white key in the sequence of white keys
      let whiteCount = 0;
      const whitePositions = {}; // Map note index to left pixel position

      // First Pass: Place White Keys
      keys.forEach(item => {
          const isBlack = item.l.includes('#');
          if (!isBlack) {
              const left = whiteCount * (KEY_WIDTH + GAP);
              whitePositions[item.n] = left;
              whiteCount++;
              
              const btn = this.createKeyElement(item);
              btn.classList.add('white');
              btn.style.left = `${left}px`;
              container.appendChild(btn);
          }
      });
      
      // Second Pass: Place Black Keys
      keys.forEach(item => {
          const isBlack = item.l.includes('#');
          if (isBlack) {
             const btn = this.createKeyElement(item);
             btn.classList.add('black');
             
             // Find previous white key position
             // The previous note is item.n - 1 (should be white mostly, but checks logic)
             // C# (1) -> prev is C (0), next is D (2)
             const prevWhitePos = whitePositions[item.n - 1];
             // The next white key is item.n + 1
             const nextWhitePos = whitePositions[item.n + 1];
             
             if (prevWhitePos !== undefined && nextWhitePos !== undefined) {
                 // Center between them
                 // Gap center is prevWhitePos + KEY_WIDTH + GAP/2
                 // Let's rely on visuals: center of gap
                 const gapCenter = prevWhitePos + KEY_WIDTH + (GAP/2);
                 const left = gapCenter - (KEY_WIDTH / 2);
                 btn.style.left = `${left}px`;
             } else {
                 // Fallback if boundary (shouldn't happen with standard chromatic list starting C)
                 btn.style.left = '0px';
             }

             container.appendChild(btn);
          }
      });
      
      container.style.width = `${whiteCount * (KEY_WIDTH + GAP)}px`;
      
      // Ribbon Controller Rendering
      const ribbonHeight = 30;
      const ribbonTop = 100; // Below the keys (keys end at ~85px)
      const totalWidth = whiteCount * (KEY_WIDTH + GAP);
      
      const ribbon = document.createElement('div');
      ribbon.className = 'ribbon-controller';
      ribbon.style.position = 'absolute';
      ribbon.style.top = `${ribbonTop}px`;
      ribbon.style.left = '0px';
      ribbon.style.width = `${totalWidth}px`;
      ribbon.style.height = `${ribbonHeight}px`;
      ribbon.style.background = 'linear-gradient(to right, #222, #444)';
      ribbon.style.boxShadow = 'inset 0 0 5px #000';
      ribbon.style.borderRadius = '4px';
      ribbon.style.cursor = 'crosshair';
      ribbon.style.touchAction = 'none'; // Prevent scrolling
      
      ribbon.style.display = 'flex';
      ribbon.style.overflow = 'hidden';

      // Dots for notes
      const isBlackKey = (n) => [1, 3, 6, 8, 10].includes(n % 12);

      for(let i=0; i<24; i++) {
        const slice = document.createElement('div');
        slice.style.flex = '1';
        slice.style.height = '100%';
        slice.style.boxSizing = 'border-box';
        slice.style.display = 'flex';
        slice.style.justifyContent = 'center';
        
        // Position dots: Black keys top, White keys bottom
        if (isBlackKey(i)) {
            slice.style.alignItems = 'flex-start';
            slice.style.paddingTop = '5px';
        } else {
            slice.style.alignItems = 'flex-end';
            slice.style.paddingBottom = '5px';
        }
        
        const dot = document.createElement('div');
        dot.style.borderRadius = '50%';
        
        // Visuals
        if (i % 12 === 0) {
            // C notes: Brighter/Larger (White key, so bottom)
            dot.style.width = '6px';
            dot.style.height = '6px';
            dot.style.background = '#ccc';
            dot.style.boxShadow = '0 0 2px #fff';
        } else {
            // Semitones: Small subtle dot
            dot.style.width = '3px';
            dot.style.height = '3px';
            dot.style.background = '#555';
        }
        
        slice.appendChild(dot);
        ribbon.appendChild(slice);
      }
      
      // Marker for touch position
      const marker = document.createElement('div');
      marker.style.position = 'absolute';
      marker.style.width = '2px';
      marker.style.height = '100%';
      marker.style.background = 'var(--accent-color)';
      marker.style.display = 'none';
      marker.style.pointerEvents = 'none';
      ribbon.appendChild(marker);
      
      const updateRibbon = (e) => {
        e.preventDefault(); // Prevent scroll/drag behaviors
        const rect = ribbon.getBoundingClientRect();
        
        let clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }
        
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        
        // Update Marker
        marker.style.display = 'block';
        marker.style.left = `${x}px`;
        
        // Calculate CV
        // Map 0..width to 0..2V (2 octaves) roughly to match keys
        // or just linear 0..1?
        // Let's match the keyboard range: 24 semitones approx.
        const range = 24 / 12; // 2 Octaves
        const voltage = (x / rect.width) * range + this.octave;
        
        const now = this.context.currentTime;
        this.ribbonCvNode.offset.setValueAtTime(voltage, now);
        // Also update main CV for direct play without patching
        this.cvNode.offset.cancelScheduledValues(now);
        this.cvNode.offset.setValueAtTime(voltage, now);
        
        // Update Display optional?
        // this.display.innerText = `RBN: ${voltage.toFixed(2)}v`;
      };
      
      const startRibbon = (e) => {
          this.ribbonGateNode.offset.setValueAtTime(1, this.context.currentTime);
          updateRibbon(e);
          
          const stopRibbon = () => {
              this.ribbonGateNode.offset.setValueAtTime(0, this.context.currentTime);
              // Do NOT reset CV. Let it hold for release phase.
              
              marker.style.display = 'none';
              document.removeEventListener('mousemove', updateRibbon);
              document.removeEventListener('mouseup', stopRibbon);
              document.removeEventListener('touchmove', updateRibbon);
              document.removeEventListener('touchend', stopRibbon);
          };
          
          document.addEventListener('mousemove', updateRibbon);
          document.addEventListener('mouseup', stopRibbon);
          document.addEventListener('touchmove', updateRibbon, { passive: false });
          document.addEventListener('touchend', stopRibbon);
      };

      ribbon.addEventListener('mousedown', startRibbon);
      ribbon.addEventListener('touchstart', startRibbon, { passive: false });

      container.appendChild(ribbon);

      // Adjust container height
      container.style.height = `${ribbonTop + ribbonHeight + 10}px`;
      container.style.margin = '15px auto'; 
  }

  createKeyElement(item) {
      const btn = document.createElement('div');
      btn.className = 'v-key';
      btn.dataset.key = item.k;
      btn.innerText = item.k.toUpperCase(); // + `\n${item.l}`;
      
      const down = (e) => {
          e.preventDefault();
          this.handleKeyDown(item.k);
      };
      const up = (e) => {
          e.preventDefault();
          this.handleKeyUp(item.k);
      };
      
      btn.addEventListener('mousedown', down);
      btn.addEventListener('mouseup', up);
      btn.addEventListener('mouseleave', up); 
      btn.addEventListener('touchstart', down, { passive: false });
      btn.addEventListener('touchend', up);
      
      return btn;
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (this.keyMap.hasOwnProperty(key) && !e.ctrlKey && !e.metaKey) {
          // Check if input element is focused?
          if (document.activeElement.tagName === 'INPUT') return;
          this.handleKeyDown(key);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.handleKeyUp(key);
    });
  }

  triggerNote() {
    if (this.isArpOn) return;

    if (this.activeKeys.length > 0) {
      // Manual play: Highest note priority (since array is sorted)
      const lastKey = this.activeKeys[this.activeKeys.length - 1];
      const semitone = this.keyMap[lastKey];
      const volts = (semitone / 12) + this.octave;
      
      this.cvNode.offset.cancelScheduledValues(this.context.currentTime);
      this.cvNode.offset.setValueAtTime(volts, this.context.currentTime);
      
      if (this.gateNode.offset.value === 0) {
        this.gateNode.offset.setValueAtTime(1, this.context.currentTime);
      }
      this.display.innerText = `NOTE: ${semitone} (${this.octave > 0 ? '+' : ''}${this.octave})`;
    } else {
      this.gateNode.offset.cancelScheduledValues(this.context.currentTime);
      this.gateNode.offset.setValueAtTime(0, this.context.currentTime);
      this.display.innerText = 'OFF';
    }
  }

  // Arpeggiator Logic
  startArp() {
      if (this.arpInterval) clearInterval(this.arpInterval);
      this.arpInterval = setInterval(() => this.arpTick(), this.arpRate);
  }

  stopArp() {
      if (this.arpInterval) clearInterval(this.arpInterval);
      this.arpInterval = null;
      // Silence
      this.gateNode.offset.setTargetAtTime(0, this.context.currentTime, 0.01);
      
      // LEDs OFF
      this.leds.forEach(l => {
          l.style.background = '#333';
          l.style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.5)';
      });
  }

  restartArp() {
      if (this.isArpOn) {
          this.startArp();
      }
  }

  arpTick() {
      if (this.activeKeys.length === 0) {
          // Silence
          this.gateNode.offset.setTargetAtTime(0, this.context.currentTime, 0.01);
          // LEDs OFF
          this.leds.forEach(l => {
              l.style.background = '#333';
              l.style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.5)';
          });
          return;
      }

      this.arpIndex = (this.arpIndex + 1) % this.activeKeys.length;
      
      // LEDs Update
      const ledIdx = this.arpIndex % this.leds.length;
      this.leds.forEach((l, i) => {
          if (i === ledIdx) {
             l.style.background = '#ff9900';
             l.style.boxShadow = '0 0 8px #ff9900';
          } else {
             l.style.background = '#333';
             l.style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,0.5)';
          }
      });

      const key = this.activeKeys[this.arpIndex];
      const semitone = this.keyMap[key];
      const volts = (semitone / 12) + this.octave;

      const now = this.context.currentTime;
      this.cvNode.offset.cancelScheduledValues(now);
      this.cvNode.offset.setValueAtTime(volts, now);

      // Gate Trig
      this.gateNode.offset.cancelScheduledValues(now);
      this.gateNode.offset.setValueAtTime(1, now);
      this.gateNode.offset.setValueAtTime(0, now + (this.arpRate/1000)*0.5); // 50% duty
      
      this.display.innerText = `ARP: ${semitone} (${this.octave > 0 ? '+' : ''}${this.octave})`;
  }
}
