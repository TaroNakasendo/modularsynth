export class PatchManager {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audioCtx = context;
    this.cables = []; // { id, from: {module, jack, port}, to: {module, jack, port}, color }
    this.activeDrag = null; // { startJack, endPoint: {x, y} }
    
    // Resize observer to keep canvas sized correctly
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Start Render Loop
    this.render();
  }

  resizeCanvas() {
    // Match the internal resolution to the display size
    // Note: This relies on CSS sizing the canvas correctly (e.g. 100% of parent)
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  // Get center of jack relative to canvas
  getJackPosition(jackElement) {
    const rect = jackElement.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left - canvasRect.left + rect.width / 2,
      y: rect.top - canvasRect.top + rect.height / 2
    };
  }

  startDrag(jackInfo, x, y) {
    this.activeDrag = {
      startJack: jackInfo, // { module, jackName, type, element, target }
      currentPos: this.getJackPosition(jackInfo.element),
      startPointer: { x, y }
    };
  }

  updateDrag(x, y) {
    // x, y are client coordinates
    // convert to canvas relative
    const canvasRect = this.canvas.getBoundingClientRect();
    this.activeDrag.currentPos = {
      x: x - canvasRect.left,
      y: y - canvasRect.top
    };
  }

  endDrag(targetJack, x, y) {
    if (!this.activeDrag) return;
    
    const start = this.activeDrag.startJack;
    
    // Check if it was a click (distance moved is small)
    const dist = Math.sqrt(Math.pow(x - this.activeDrag.startPointer.x, 2) + Math.pow(y - this.activeDrag.startPointer.y, 2));
    
    if (dist < 5 && targetJack === start) {
       // dragging to self is a 'cancel', but if it's a short click, we treat it as disconnect request.
       // Actually 'targetJack === start' happens if we release on the same jack we started.
       this.disconnectAll(start);
    } else if (dist < 5) {
        // Released nearby but not on target? maybe just clicked quickly.
        this.disconnectAll(start);
    } else {
      // Attempt connection
      if (targetJack && start.type !== targetJack.type && start.element !== targetJack.element) {
        this.connect(start, targetJack);
      }
    }
    
    this.activeDrag = null;
  }

  connect(source, dest) {
    // Ensure source is out, dest is in
    let out = source.type === 'out' ? source : dest;
    let input = source.type === 'in' ? source : dest;
    
    if (out.type !== 'out' || input.type !== 'in') return; // Invalid

    // Check if already connected
    const exists = this.cables.find(c => c.outDesc.element === out.element && c.inDesc.element === input.element);
    if (exists) return;

    // Web Audio Connection
    // input.target is { node, param? }
    if (input.target.param) {
      out.target.connect(input.target.param); // This might throw if nodes from different contexts (unlikely here)
    } else {
      out.target.connect(input.target.node);
    }
    
    // Store visual connection
    this.cables.push({
      outDesc: out,
      inDesc: input,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    });

    // UI Feedback
    out.element.classList.add('connected');
    input.element.classList.add('connected');
  }

  // Disconnect logic (simplistic: clear all on jack for now)
  disconnectAll(jackDesc) {
    // Identify cables to remove
    const toRemove = this.cables.filter(c => c.outDesc.element === jackDesc.element || c.inDesc.element === jackDesc.element);
    
    toRemove.forEach(c => {
       try {
           // We specific disconnect calculation is complex in Web Audio without a wrapper.
           // disconnect(destination) is supported in modern browsers.
           c.outDesc.target.disconnect(c.inDesc.target.param || c.inDesc.target.node);
       } catch(e) { console.warn("Disconnect error", e); }
    });

    this.cables = this.cables.filter(c => !toRemove.includes(c));
    
    // Re-verify 'connected' status for all jacks
    document.querySelectorAll('.jack.connected').forEach(el => el.classList.remove('connected'));
    this.cables.forEach(c => {
      c.outDesc.element.classList.add('connected');
      c.inDesc.element.classList.add('connected');
    });
  }

  clearAllPatches() {
    [...this.cables].forEach(cable => {
       try {
           cable.outDesc.target.disconnect(cable.inDesc.target.param || cable.inDesc.target.node);
       } catch(e) { console.warn("Disconnect error", e); }
    });
    this.cables = [];
    document.querySelectorAll('.jack.connected').forEach(el => el.classList.remove('connected'));
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';

    // Draw existing cables
    for (const cable of this.cables) {
      const p1 = this.getJackPosition(cable.outDesc.element);
      const p2 = this.getJackPosition(cable.inDesc.element);
      
      this.drawCable(p1, p2, cable.color);
    }

    // Draw active drag
    if (this.activeDrag) {
      const p1 = this.getJackPosition(this.activeDrag.startJack.element);
      const p2 = this.activeDrag.currentPos;
      this.drawCable(p1, p2, '#fff'); // Drag color
    }

    requestAnimationFrame(() => this.render());
  }

  drawCable(p1, p2, color) {
    this.ctx.strokeStyle = color;
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = color;
    
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x, p1.y);
    
    // Bezier curve for "sag"
    // The control point should be lower than both points (gravity)
    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const sag = Math.min(dist * 0.5, 300); // Sag increases with distance
    
    const cp1 = { x: p1.x, y: p1.y + sag };
    const cp2 = { x: p2.x, y: p2.y + sag };
    
    this.ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
    this.ctx.stroke();
  }
}
