import './style.css';
import { getAudioContext, resumeAudioContext } from './audio/context.js';
import { VCO } from './modules/VCO.js';
import { VCA } from './modules/VCA.js';
import { VCF } from './modules/VCF.js';
import { LFO } from './modules/LFO.js';
import { Output } from './modules/Output.js';
import { Keyboard } from './modules/Keyboard.js';
import { Reverb } from './modules/Reverb.js';
import { Guide } from './modules/Guide.js';
import { Sequencer } from './modules/Sequencer.js';
import { ADSR } from './modules/ADSR.js';
import { Delay } from './modules/Delay.js';
import { PatchManager } from './core/PatchManager.js';

const appStart = () => {
  const rackEl = document.getElementById('rack');
  const canvasEl = document.getElementById('cable-canvas');
  const startBtn = document.getElementById('start-audio');
  
  // Audio Context
  const audioCtx = getAudioContext();
  
  // Patch Manager
  const patchManager = new PatchManager(canvasEl, audioCtx);
  
  // Instantiate Modules
  const modules = [
    new Keyboard(), // Input
    new Sequencer(),
    new VCO(),
    new VCO(),
    new LFO(),
    new ADSR(),
    new VCF(),
    new VCA(),
    new Delay(),
    new Reverb(),
    new Guide(),
    new Output()
  ];
  
  // Mount Modules
  modules.forEach(m => m.mount(rackEl));
  
  // Resize Canvas to fit full rack width now that modules are present
  patchManager.resizeCanvas();
  
  // Global Event Listeners for Cable Patching
  // We attach to 'document' to catch events bubbling up from Jacks
  
  let currentJack = null; // Hovered jack
  
  // Start Dragging
  document.addEventListener('mousedown', (e) => {
    // Check if clicking a jack
    if (e.target.classList.contains('jack')) {
      const moduleName = e.target.dataset.module;
      const jackName = e.target.dataset.jack;
      
      const module = modules.find(m => m.name === moduleName && m.getJack(jackName).element === e.target);
      if (module) {
        const jackInfo = module.getJack(jackName);
        
        // Interaction:
        // Left Click: Start Patching
        
        patchManager.startDrag(jackInfo, e.clientX, e.clientY);
        e.preventDefault();
      }
    }
  });
  
  // Dragging
  document.addEventListener('mousemove', (e) => {
    if (patchManager.activeDrag) {
      patchManager.updateDrag(e.clientX, e.clientY);
    }
  });

  // End Dragging
  document.addEventListener('mouseup', (e) => {
    if (patchManager.activeDrag) {
      // Check if we dropped on a jack
      let targetJack = null;
      // We need to use elementFromPoint because mouseup is on the document (or top layer)
      // canvas has pointer-events: none, so we should hit the jack.
      const el = document.elementFromPoint(e.clientX, e.clientY);
      
      if (el && el.classList.contains('jack')) {
        const jackName = el.dataset.jack;
        
        // Iterate modules to find the one with this jack element
        for (const m of modules) {
           const jack = m.getJack(jackName);
           if (jack && jack.element === el) {
             targetJack = jack;
             break;
           }
        }
      }
      
      patchManager.endDrag(targetJack, e.clientX, e.clientY);
    }
  });

  // Start/Stop Audio
  startBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        resumeAudioContext();
        startBtn.innerText = 'Audio Active';
        startBtn.classList.add('active');
    } else if (audioCtx.state === 'running') {
        audioCtx.suspend();
        startBtn.innerText = 'Start Audio';
        startBtn.classList.remove('active');
    }
  });

  // Default Patch
  // Keyboard CV -> VCO 1 V/OCT
  // Keyboard Gate -> VCA CV
  // VCO 1 OUT -> VCF IN
  // VCF OUT -> VCA IN
  // VCA OUT -> OUTPUT IN
  const loadPreset = (name) => {
    patchManager.clearAllPatches();

    // Module Indices based on instantiation order:
    // 0: KB, 1: SEQ, 2: VCO1, 3: VCO2, 4: LFO, 5: ADSR, 6: VCF, 7: VCA, 8: DELAY, 9: REVERB, 10: GUIDE, 11: OUT
    const kb = modules[0];
    const seq = modules[1];
    const vco1 = modules[2];
    const vco2 = modules[3];
    const lfo = modules[4];
    const adsr = modules[5];
    const vcf = modules[6];
    const vca = modules[7];
    const delay = modules[8];
    const reverb = modules[9];
    const output = modules[11];

    // Reset parameters
    vco1.oscillator.detune.value = 0;
    vco2.oscillator.detune.value = 0;
    vco1.oscillator.type = 'sawtooth';
    vco2.oscillator.type = 'sawtooth';

    // IMPORTANT: Reset VCA gain to 0 for Envelope control, or 1 for Drone
    // We'll set it in the specific presets.
    
    try {
      if (name === 'default') {
          // Pitch (Dual VCO Unison)
          patchManager.connect(kb.getJack('CV'), vco1.getJack('V/OCT'));
          patchManager.connect(kb.getJack('CV'), vco2.getJack('V/OCT'));
          
          // Detune VCO2 for thick sound
          vco2.oscillator.detune.value = 10; 

          // Audio Chain
          patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vco2.getJack('OUT'), vcf.getJack('IN'));
          
          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), reverb.getJack('IN'));
          patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));

          // Gate & Mod
          patchManager.connect(kb.getJack('GATE'), vca.getJack('CV'));
          patchManager.connect(lfo.getJack('OUT'), vcf.getJack('CV')); 
      
      } else if (name === 'bass') {
          // Single Osc, Low Filter
          vco1.oscillator.type = 'square';
          vco2.oscillator.type = 'sawtooth';
          vco2.oscillator.detune.value = -1200; // Sub osc

          patchManager.connect(kb.getJack('CV'), vco1.getJack('V/OCT'));
          patchManager.connect(kb.getJack('CV'), vco2.getJack('V/OCT'));

          patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vco2.getJack('OUT'), vcf.getJack('IN'));

          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), output.getJack('IN')); // Dry bass

          patchManager.connect(kb.getJack('GATE'), vca.getJack('CV'));
          // Envelope on filter would be nice but we only have LFO for now
          // So just static low pass or LFO wobble
      
      } else if (name === 'scifi') {
          // LFO -> Pitch
          patchManager.connect(lfo.getJack('OUT'), vco1.getJack('V/OCT'));
          patchManager.connect(vco1.getJack('OUT'), reverb.getJack('IN'));
          patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));
      } else if (name === 'sequencer') {
          // Sequencer -> VCO1 Pitch
          patchManager.connect(seq.getJack('CV'), vco1.getJack('V/OCT'));
          
          // Sequencer -> ADSR Gate
          patchManager.connect(seq.getJack('GATE'), adsr.getJack('GATE'));
          
          // Audio Path
          patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), delay.getJack('IN'));
          patchManager.connect(delay.getJack('OUT'), output.getJack('IN'));
          
          // Modulation
          patchManager.connect(adsr.getJack('OUT'), vca.getJack('CV'));
          patchManager.connect(adsr.getJack('OUT'), vcf.getJack('ENV')); // Uses new ENV jack
          
          // Settings
          vco1.oscillator.type = 'sawtooth';
          vco1.oscillator.detune.value = 0;
          
          // Pluck Envelope
          adsr.attack = 0.01;
          adsr.decay = 0.2;
          adsr.sustain = 0;
          adsr.release = 0.2;
          
          // Filter - Low pass with resonance
          vcf.filter.frequency.value = 400;
          vcf.filter.Q.value = 8;
          
          // Delay
          delay.setMix(0.4);
          delay.delayNode.delayTime.value = 0.3;
          
          // Run Sequencer
          seq.tempo = 200;
          // Set a pattern (Audio only, UI won't update until we improve Sequencer module)
          seq.setSteps([0, 12, 3, 7, 0, 10, 5, 12]);
          
          if (!seq.isRunning) seq.start();
      }
    } catch (e) {
      console.error("Patch load error", e);
    }
  };

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preset = e.target.dataset.preset;
      // Resume audio context if needed
      if (audioCtx.state === 'suspended') {
        resumeAudioContext();
        startBtn.innerText = 'Audio Active';
        startBtn.classList.add('active');
        // startBtn.disabled = true; // Removed to allow toggling off
      }
      loadPreset(preset);
    });
  });

  // Initial Load
  setTimeout(() => {
    loadPreset('default');
  }, 100);
  
};

// Start
appStart();
