import './style.css';
import { getAudioContext, resumeAudioContext } from './audio/context.js';
import { VCO } from './modules/VCO.js';
import { VCA } from './modules/VCA.js';
import { VCF } from './modules/VCF.js';
import { LFO } from './modules/LFO.js';
import { Output } from './modules/Output.js';
import { Keyboard } from './modules/Keyboard.js';
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

  // Start Audio
  startBtn.addEventListener('click', () => {
    resumeAudioContext();
    startBtn.innerText = 'Audio Active';
    startBtn.disabled = true;
  });

  // Default Patch
  // Keyboard CV -> VCO 1 V/OCT
  // Keyboard Gate -> VCA CV
  // VCO 1 OUT -> VCF IN
  // VCF OUT -> VCA IN
  // VCA OUT -> OUTPUT IN
  setTimeout(() => {
    try {
        const kb = modules[0];
        const vco1 = modules[1];
        const lfo = modules[3];
        const vcf = modules[4];
        const vca = modules[5];
        const output = modules[6];

        // Pitch
        patchManager.connect(kb.getJack('CV'), vco1.getJack('V/OCT'));

        // Audio Chain
        patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
        patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
        patchManager.connect(vca.getJack('OUT'), output.getJack('IN'));

        // Gate & Mod
        patchManager.connect(kb.getJack('GATE'), vca.getJack('CV'));
        patchManager.connect(lfo.getJack('OUT'), vcf.getJack('CV')); 
    } catch (e) {
        console.error("Default patch error", e);
    }
  }, 100);
  
};

// Start
appStart();
