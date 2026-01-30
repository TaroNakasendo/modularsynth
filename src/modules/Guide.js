import { BaseModule } from './BaseModule.js';

export class Guide extends BaseModule {
  constructor() {
    super('MANUAL');
    
    // Make this module wider to fit text
    this.element.style.width = '240px'; 
    this.element.style.overflowY = 'auto'; // readable
    this.element.style.background = '#222';
    
    const content = document.createElement('div');
    content.style.padding = '0 10px';
    content.style.fontSize = '0.75rem';
    content.style.color = '#ccc';
    content.style.lineHeight = '1.4';
    content.style.textAlign = 'left';
    
    content.innerHTML = `
      <h3 style="color: #ff9900; margin: 0 0 10px 0; border-bottom: 1px solid #444;">使い方ガイド</h3>
      
      <p><strong style="color:#fff">🎶 音の出し方</strong><br>
      ケーブルをドラッグしてジャムりましょう！<br>
      基本ルート:<br>
      <span style="color:#ff9900">VCO</span>(音源) &rarr; <span style="color:#ff9900">VCF</span>(フィルター) &rarr; <span style="color:#ff9900">VCA</span>(アンプ) &rarr; <span style="color:#ff9900">REVERB</span> &rarr; <span style="color:#ff9900">OUTPUT</span></p>
      
      <p><strong style="color:#fff">🎹 演奏方法</strong><br>
      PCキーボードで演奏できます。<br>
      [Z] [S] [X] ... [,] [L] [.]<br>
      (ド レ ミ ... 1オクターブ半)</p>
      
      <p><strong style="color:#fff">🎛️ パッチングのコツ</strong><br>
      - <span style="color:cyan">LFO OUT</span> を <span style="color:cyan">VCF CV</span> に繋ぐと「ワウワウ」効果！<br>
      - <span style="color:cyan">KEYBOARD GATE</span> を <span style="color:cyan">VCA CV</span> に繋ぐと鍵盤を押した時だけ音が鳴ります。</p>
      
      <p><strong style="color:#fff">💡 操作</strong><br>
      - ジャックをクリック: ケーブル切断<br>
      - ノブ: 上下にドラッグ</p>
    `;
    
    // Clear standard UI slots to make room (hacky but works)
    this.controlsContainer.style.display = 'none';
    this.jacksContainer.style.display = 'none';
    
    // Append custom content wrapper
    // We insert it after header
    this.element.appendChild(content);
    
    // We can add a "Close" jack? No need.
  }
}
