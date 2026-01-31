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

const appStart = async () => {
  const rackEl = document.getElementById('rack');
  const canvasEl = document.getElementById('cable-canvas');

  
  // Audio Context
  const audioCtx = getAudioContext();

  // Load Worklets
  try {
      // In Vite dev, direct path usually works. In build, might need ?url import.
      // For now, assuming dev server serves /src/...
      await audioCtx.audioWorklet.addModule('/src/worklets/gate-processor.js');
  } catch(e) {
      console.warn("AudioWorklet load failed, fallback might be needed", e);
  }
  
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

    // --- RESET ALL MODULES TO DEFAULTS ---
    // This prevents state (like Reverb Mix, Filter Res) from bleeding into other presets.
    
    // VCOs
    [vco1, vco2].forEach(vco => {
        vco.setKnobValue('FREQ', 440);
        vco.setKnobValue('DETUNE', 0);
        vco.oscillator.type = 'sawtooth'; 
        // Note: UI Button text might desync, but sound is priority.
    });

    // LFO
    lfo.setKnobValue('RATE', 1);
    lfo.oscillator.type = 'sine';

    // Filter
    vcf.setKnobValue('FREQ', 2000); // Open
    vcf.setKnobValue('RES', 1);     // No interaction

    // VCA
    vca.setKnobValue('GAIN', 0);

    // ADSR
    adsr.setKnobValue('A', 0.01);
    adsr.setKnobValue('D', 0.1);
    adsr.setKnobValue('S', 0.5);
    adsr.setKnobValue('R', 0.3);

    // Effects - DRY!
    delay.setKnobValue('MIX', 0); 
    delay.setKnobValue('TIME', 0.3);
    delay.setKnobValue('FB', 0);
    
    reverb.setKnobValue('MIX', 0);
    
    // Noise
    noise.setNoiseType(false); // White

    // Sequencer - Stop to save CPU/Confusion? 
    // We can't easily click the button without ID or Ref, but logic is fine.
    
    // -------------------------------------
    
    try {
      if (name === 'default') {
          // Pitch (Dual VCO Unison)
          patchManager.connect(kb.getJack('CV'), vco1.getJack('V/OCT'));
          patchManager.connect(kb.getJack('CV'), vco2.getJack('V/OCT'));
          
          // Detune VCO2 for thick sound
          vco2.setKnobValue('DETUNE', 10); 

          // Audio Chain
          patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vco2.getJack('OUT'), vcf.getJack('IN'));
          
          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), reverb.getJack('IN'));
          patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));

          // Gate & Mod
          patchManager.connect(kb.getJack('GATE'), vca.getJack('CV'));
          
          // Slight Reverb for polish
          reverb.setKnobValue('MIX', 0.2); 
      
      } else if (name === 'bass') {
          // Single Osc, Low Filter
          vco1.oscillator.type = 'square';
          
          // Sub osc
          vco2.oscillator.type = 'sawtooth';
          vco2.setKnobValue('DETUNE', -1200); 

          patchManager.connect(kb.getJack('CV'), vco1.getJack('V/OCT'));
          patchManager.connect(kb.getJack('CV'), vco2.getJack('V/OCT'));

          patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vco2.getJack('OUT'), vcf.getJack('IN'));

          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), output.getJack('IN')); // Dry bass

          patchManager.connect(kb.getJack('GATE'), vca.getJack('CV'));
          
          vcf.setKnobValue('FREQ', 600);
      
      } else if (name === 'scifi') {
          // LFO -> Pitch
          patchManager.connect(lfo.getJack('OUT'), vco1.getJack('V/OCT'));
          patchManager.connect(vco1.getJack('OUT'), reverb.getJack('IN'));
          patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));
          
          // SciFi Reverb
          reverb.setKnobValue('MIX', 0.5);
          lfo.setKnobValue('RATE', 0.5);

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
          vco1.setKnobValue('DETUNE', 0);
          
          // Pluck Envelope
          adsr.setKnobValue('A', 0.01);
          adsr.setKnobValue('D', 0.2);
          adsr.setKnobValue('S', 0);
          adsr.setKnobValue('R', 0.2);
          
          // Filter - Low pass with resonance
          vcf.setKnobValue('FREQ', 400);
          vcf.setKnobValue('RES', 8);
          
          // Delay
          delay.setKnobValue('MIX', 0.4);
          delay.setKnobValue('TIME', 0.3);
          delay.setKnobValue('FB', 0.4);
          
          // Run Sequencer
          seq.setKnobValue('RATE', 200);
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
           lfo.setKnobValue('RATE', 0.2); // Slow wind
           vcf.setKnobValue('FREQ', 600);
           vcf.setKnobValue('RES', 20); // Whistling
           vca.setKnobValue('GAIN', 0.7);
           
           // Big Reverb
           reverb.setKnobValue('TIME', 5);
           reverb.setKnobValue('MIX', 0.6);
      } else if (name === 'vocoder') {
           // Vocoder Setup
           // Carrier: VCO1 + VCO2 (Sawtooth for rich harmonics)
           vco1.oscillator.type = 'sawtooth';
           vco2.oscillator.type = 'sawtooth';
           vco1.setKnobValue('FREQ', 110); // Low A
           vco2.setKnobValue('FREQ', 112); // Detuned
           // Set detune back to 0 just in case
           vco1.setKnobValue('DETUNE', 0);
           vco2.setKnobValue('DETUNE', 0);
           
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
      } else if (name === 'lead') {
          // Solo Lead: Dual Oscillator with Delay/Reverb
          vco1.oscillator.type = 'sawtooth';
          vco2.oscillator.type = 'square';
          vco2.setKnobValue('DETUNE', 5); // Slight detune

          // Pitch Control
          patchManager.connect(kb.getJack('CV'), vco1.getJack('V/OCT'));
          patchManager.connect(kb.getJack('CV'), vco2.getJack('V/OCT'));

          // Audio Path
          patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vco2.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), delay.getJack('IN'));
          patchManager.connect(delay.getJack('OUT'), reverb.getJack('IN'));
          patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));

          // Control
          patchManager.connect(kb.getJack('GATE'), adsr.getJack('GATE'));
          
          patchManager.connect(adsr.getJack('OUT'), vca.getJack('CV'));
          patchManager.connect(adsr.getJack('OUT'), vcf.getJack('ENV'));

          // Settings
          adsr.setKnobValue('A', 0.05);
          adsr.setKnobValue('D', 0.3);
          adsr.setKnobValue('S', 0.4);
          adsr.setKnobValue('R', 0.5);

          vcf.setKnobValue('FREQ', 800);
          vcf.setKnobValue('RES', 5);

          delay.setKnobValue('MIX', 0.3);
          delay.setKnobValue('TIME', 0.4);
          reverb.setKnobValue('MIX', 0.3);

      } else if (name === 'helicopter') {
          // Helicopter: Noise -> VCF -> VCA -> Out
          // LFO Modulates VCF (Timbre) and VCA (chop)
          noise.setNoiseType(false); // White Noise
          
          // Audio Path
          patchManager.connect(noise.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          // Slight Reverb
          patchManager.disconnect(vca.getJack('OUT')); // Disconnect direct out
          patchManager.connect(vca.getJack('OUT'), reverb.getJack('IN'));
          patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));
          
          // Modulation
          patchManager.connect(lfo.getJack('OUT'), vcf.getJack('CV'));
          patchManager.connect(lfo.getJack('OUT'), vca.getJack('CV')); // Rhythmic chopping

          // Settings
          lfo.oscillator.type = 'sawtooth'; // Sharp chop
          lfo.setKnobValue('RATE', 6); // Rotor speed
          
          vcf.setKnobValue('FREQ', 200); // Low rumble
          vcf.setKnobValue('RES', 5);
          
          vca.setKnobValue('GAIN', 0.5);

          reverb.setKnobValue('MIX', 0.1);

      } else if (name === 'siren') {
          // Dub Siren: LFO Modulating VCO Pitch
          vco1.oscillator.type = 'sine';
          
          // Audio Path
          patchManager.connect(vco1.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), delay.getJack('IN'));
          patchManager.connect(delay.getJack('OUT'), output.getJack('IN'));

          // Modulation
          patchManager.connect(lfo.getJack('OUT'), vco1.getJack('V/OCT'));
          patchManager.connect(lfo.getJack('OUT'), vca.getJack('CV')); // Tremolo effect too

          // Settings
          lfo.oscillator.type = 'triangle';
          lfo.setKnobValue('RATE', 1); // 1Hz Siren
          
          vca.setKnobValue('GAIN', 1); 
          
          vco1.setKnobValue('FREQ', 600);
          
          delay.setKnobValue('MIX', 0.4);
          delay.setKnobValue('TIME', 0.25);
          delay.setKnobValue('FB', 0.7);
      } else if (name === 'kick') {
          // Kick: Sine Wave + Pitch Env + Amp Env
          vco1.oscillator.type = 'sine';
          vco1.setKnobValue('FREQ', 50); 
          
          // Audio Path
          patchManager.connect(vco1.getJack('OUT'), vca.getJack('IN'));
          patchManager.connect(vca.getJack('OUT'), output.getJack('IN'));
          
          // Modulation
          // Keyboard Gate -> ADSR Gate
          patchManager.connect(kb.getJack('GATE'), adsr.getJack('GATE'));
          
          // ADSR -> VCA CV (Amplitude)
          patchManager.connect(adsr.getJack('OUT'), vca.getJack('CV'));
          
          // ADSR -> VCO Pitch (Frequency Sweep for "Thump")
          patchManager.connect(adsr.getJack('OUT'), vco1.getJack('V/OCT'));
          
          // Settings
          adsr.setKnobValue('A', 0.001);
          adsr.setKnobValue('D', 0.2);
          adsr.setKnobValue('S', 0);
          adsr.setKnobValue('R', 0.1);
      } else if (name === 'gun') {
          // Gun: Noise Burst + rapid pitch drop
          noise.setNoiseType(true); // Pink noise for body
          
          vco1.oscillator.type = 'sawtooth';
          vco1.setKnobValue('FREQ', 150);

          // Audio Path: Mix Noise and VCO
          patchManager.connect(noise.getJack('OUT'), vcf.getJack('IN'));
          patchManager.connect(vco1.getJack('OUT'), vcf.getJack('IN'));
          
          patchManager.connect(vcf.getJack('OUT'), vca.getJack('IN'));
          
          // Reverb for gunshot trail
          patchManager.connect(vca.getJack('OUT'), reverb.getJack('IN'));
          patchManager.connect(reverb.getJack('OUT'), output.getJack('IN'));

          // Control
          patchManager.connect(kb.getJack('GATE'), adsr.getJack('GATE'));

          // Envelope Modulations
          patchManager.connect(adsr.getJack('OUT'), vca.getJack('CV')); // Amp Envelope
          patchManager.connect(adsr.getJack('OUT'), vcf.getJack('ENV')); // Filter Sweep
          patchManager.connect(adsr.getJack('OUT'), vco1.getJack('V/OCT')); // Pitch Drop
          
          // Settings
          // Sharp attack, short decay
          adsr.setKnobValue('A', 0.001);
          adsr.setKnobValue('D', 0.15); 
          adsr.setKnobValue('S', 0);
          adsr.setKnobValue('R', 0.2);

          // Filter
          vcf.setKnobValue('FREQ', 2000); // Start high
          // ENV jack on VCF adds to freq, so we might want to start lower if we want sweep UP, 
          // or start high and sweep? Actually VCF ENV input usually Modulates positive. 
          // For Gun, we want the noise to be bright then dark?
          // Let's set Filter default lower and let Env open it? 
          // Or just open filter and let Noise be Noise.
          // Let's rely on Reverb color.
          
          reverb.setKnobValue('MIX', 0.4);
          reverb.setKnobValue('TIME', 2.0);
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
