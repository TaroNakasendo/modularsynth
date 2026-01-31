class GateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.lastGate = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      
      // Check buffer for gate signal
      let currentGate = 0;
      for (let i = 0; i < channelData.length; i++) {
        if (channelData[i] > 0.5) {
          currentGate = 1;
          break;
        }
      }

      if (currentGate === 1 && this.lastGate === 0) {
        this.port.postMessage('trigger');
      } else if (currentGate === 0 && this.lastGate === 1) {
        this.port.postMessage('release');
      }
      
      this.lastGate = currentGate;
    }
    
    return true;
  }
}

registerProcessor('gate-processor', GateProcessor);
