import { BaseModule } from './BaseModule.js';

export class Output extends BaseModule {
  constructor() {
    super('OUTPUT');
    
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.5;
    
    // Connect to hardware output
    this.masterGain.connect(this.context.destination);
    
    this.addKnob('VOL', this.masterGain.gain, 0, 1, 0.5);
    
    this.addJack('IN', 'in', { node: this.masterGain });
    
    // Visualizer (Oscilloscope)
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.masterGain.connect(this.analyser);
    
    this.scopeCanvas = document.createElement('canvas');
    this.scopeCanvas.width = 100;
    this.scopeCanvas.height = 60;
    this.scopeCanvas.style.background = '#0a0a0a';
    this.scopeCanvas.style.border = '1px solid #333';
    this.scopeCanvas.style.marginTop = '10px';
    this.scopeCanvas.style.borderRadius = '4px';
    this.scopeCanvas.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.8)';
    
    this.element.appendChild(this.scopeCanvas);
    
    this.scopeCtx = this.scopeCanvas.getContext('2d');
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    
    this.draw();
  }

  draw() {
    requestAnimationFrame(() => this.draw());
    
    // Only draw if audio context is running to save resources? 
    // But nice to see flatline.
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    const width = this.scopeCanvas.width;
    const height = this.scopeCanvas.height;
    
    this.scopeCtx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Fade effect
    this.scopeCtx.fillRect(0, 0, width, height);
    this.scopeCtx.lineWidth = 2;
    this.scopeCtx.strokeStyle = '#00ff00';
    this.scopeCtx.beginPath();
    
    // Trigger Logic (Simple Zero Crossing)
    let triggerIdx = 0;
    for (let i = 0; i < this.bufferLength/2; i++) {
        if (this.dataArray[i] > 128 && this.dataArray[i] < 135 && this.dataArray[i+1] > 128) {
           // Basic fuzzy trigger
        }
        // Proper rising edge crossing 128
        if (this.dataArray[i] <= 128 && this.dataArray[i+1] > 128) {
            triggerIdx = i;
            break;
        }
    }
    
    // Draw Window
    const samplesToDraw = 500; // Fixed window size for detail
    const step = width / samplesToDraw;
    
    let x = 0;
    for (let i = 0; i < samplesToDraw; i++) {
        let idx = triggerIdx + i;
        if (idx >= this.bufferLength) break;
        
        const v = this.dataArray[idx] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) this.scopeCtx.moveTo(x, y);
        else this.scopeCtx.lineTo(x, y);
        
        x += step;
    }
    
    this.scopeCtx.stroke();
  }
}
