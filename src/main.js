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
    new VCO(),
    new VCO(),
    new LFO(),
    new VCF(),
    new VCA(),
    new Reverb(),
    new Guide(),
    new Output()
  ];
  
  // Mount Modules
  modules.forEach(m => m.mount(rackEl));
  
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

    const kb = modules[0];
    const vco1 = modules[1];
    const vco2 = modules[2];
    const lfo = modules[3];
    const vcf = modules[4];
    const vca = modules[5];
    const reverb = modules[6];
    const output = modules[8];

    // Reset default parameters
    vco1.oscillator.detune.value = 0;
    vco2.oscillator.detune.value = 0;
    vco1.oscillator.type = 'sawtooth';
    vco2.oscillator.type = 'sawtooth';

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
        startBtn.disabled = true;
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
