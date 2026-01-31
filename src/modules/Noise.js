
import { BaseModule } from './BaseModule.js';

export class Noise extends BaseModule {
  constructor() {
    super('NOISE');

    // Buffer setup
    const bufferSize = 2 * this.context.sampleRate; // 2 seconds loop
    
    // 1. White Noise Buffer
    this.whiteBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const whiteData = this.whiteBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // 2. Pink Noise Buffer (Paul Kellett's approximation)
    this.pinkBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const pinkData = this.pinkBuffer.getChannelData(0);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        pinkData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        pinkData[i] *= 0.11; // Compensate for gain
        b6 = white * 0.115926;
    }

    this.isPink = false;

    // Source Node
    this.source = null;
    this.outputGain = this.context.createGain();
    
    this.startSource();

    // Controls
    // Type Select
    this.typeBtn = document.createElement('div');
    this.typeBtn.className = 'button';
    this.typeBtn.style.marginTop = '15px';
    this.typeBtn.style.marginBottom = '15px';
    this.typeBtn.style.textAlign = 'center';
    this.typeBtn.style.cursor = 'pointer';
    this.typeBtn.style.fontSize = '0.8rem';
    this.typeBtn.style.fontWeight = 'bold';
    this.typeBtn.style.color = '#fff';
    this.typeBtn.style.background = '#333';
    this.typeBtn.style.padding = '8px';
    this.typeBtn.style.borderRadius = '4px';
    this.typeBtn.style.border = '1px solid #555';
    this.typeBtn.innerText = 'WHITE';

    this.typeBtn.onclick = () => {
        this.setNoiseType(!this.isPink);
    };

    this.controlsContainer.appendChild(this.typeBtn);
    
    // Jacks
    this.addJack('OUT', 'out', this.outputGain);
  }

  setNoiseType(isPink) {
      this.isPink = isPink;
      this.typeBtn.innerText = this.isPink ? 'PINK' : 'WHITE';
      this.typeBtn.style.color = this.isPink ? '#ffaddb' : '#ffffff';
      this.startSource();
  }

  startSource() {
      if (this.source) {
          this.source.stop();
          this.source.disconnect();
      }
      
      this.source = this.context.createBufferSource();
      this.source.buffer = this.isPink ? this.pinkBuffer : this.whiteBuffer;
      this.source.loop = true;
      this.source.start();
      this.source.connect(this.outputGain);
  }
}
