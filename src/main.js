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
import { Noise } from './modules/Noise.js';
import { ADSR } from './modules/ADSR.js';
import { Delay } from './modules/Delay.js';
import { Vocoder } from './modules/Vocoder.js';
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
    new Noise(),
    new ADSR(),
    new VCF(),
    new VCA(),
    new Delay(),
    new Reverb(),
    new Vocoder(),
    new Output(),
    new Guide()
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
    // 0: KB, 1: SEQ, 2: VCO1, 3: VCO2, 4: LFO, 5: NOISE, 6: ADSR, 7: VCF, 8: VCA, 9: DELAY, 10: REVERB, 11: VOCODER, 12: OUT, 13: GUIDE
    const kb = modules[0];
    const seq = modules[1];
    const vco1 = modules[2];
    const vco2 = modules[3];
    const lfo = modules[4];
    const noise = modules[5];
    const adsr = modules[6];
    const vcf = modules[7];
    const vca = modules[8];
    const delay = modules[9];
    const reverb = modules[10];
    const vocoder = modules[11];
    const output = modules[12];

    // Reset parameters
    vco1.oscillator.detune.value = 0;
    vco2.oscillator.detune.value = 0;
    vco1.oscillator.type = 'sawtooth';
    vco2.oscillator.type = 'sawtooth';
    
    // Reset VCA (Silence by default, let Env/Gate open it)
    vca.gainNode.gain.value = 0;

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
          // patchManager.connect(lfo.getJack('OUT'), vcf.getJack('CV')); // Removed LFO mod for stability 
      
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
      } else if (name === 'wind') {
           // Wind: Noise -> VCF -> VCA -> Reverb -> Out
           noise.setNoiseType(true);
           
           patchManager.connect(noise.getJack('OUT'), vcf.getJack('IN'));
           
           // Modulate VCF
           patchManager.connect(lfo.getJack('OUT'), vcf.getJack('CV'));
           
           patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
           patchManager.connect(vca.getJack('OUT'), reverb.getJack('IN'));
           patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));
           
           // Settings
           lfo.oscillator.frequency.value = 0.2; // Slow wind
           vcf.filter.frequency.value = 600;
           vcf.filter.Q.value = 20; // Whistling
           vca.gainNode.gain.value = 0.7;
           
           // Big Reverb
           reverb.generateImpulse(5);
           reverb.updateMix(0.6);
      } else if (name === 'vocoder') {
           // Vocoder Setup
           // Carrier: VCO1 + VCO2 (Sawtooth for rich harmonics)
           vco1.oscillator.type = 'sawtooth';
           vco2.oscillator.type = 'sawtooth';
           vco1.oscillator.frequency.value = 110; // Low A
           vco2.oscillator.frequency.value = 112; // Detuned
           // Set detune back to 0 just in case
           vco1.oscillator.detune.value = 0;
           vco2.oscillator.detune.value = 0;
           
           // Keyboard control
           patchManager.connect(kb.getJack('CV'), vco1.getJack('V/OCT'));
           patchManager.connect(kb.getJack('CV'), vco2.getJack('V/OCT'));
           
           // Connect to Vocoder Carrier
           patchManager.connect(vco1.getJack('OUT'), vocoder.getJack('CARRIER'));
           patchManager.connect(vco2.getJack('OUT'), vocoder.getJack('CARRIER'));
           
           // Vocoder Output
           patchManager.connect(vocoder.getJack('OUT'), output.getJack('IN'));
           
           // Enable Mic if not already
           if (!vocoder.micStream) {
               vocoder.toggleMic();
           }
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
