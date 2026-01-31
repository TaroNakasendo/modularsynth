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
      <p><strong style="color:#fff">🎛️ プリセット (New!)</strong><br>
      画面下のボタンでパッチを切り替えられます。<br>
      - <span style="color:#ccc">Default</span>: 基本のリードシンセ<br>
      - <span style="color:#ccc">Fat Bass</span>: 重厚なベース<br>
      - <span style="color:#ccc">Sci-Fi</span>: 宇宙的な効果音</p>

      <p><strong style="color:#fff">🎹 演奏・操作</strong><br>
      - <strong>Start Audio</strong>: クリックでON/OFF切り替え。<br>
      - <strong>HOLD</strong>: キーボードモジュールのHOLDボタンで、鍵盤を離しても音が鳴り続けるモード(Arpに最適！)に切り替え。<br>
      - <strong>ARP</strong>: アルペジエーターON/OFF。</p>

      <p><strong style="color:#fff">🎶 音の出し方</strong><br>
      ケーブルをドラッグしてジャムりましょう！<br>
      基本ルート:<br>
      <span style="color:#ff9900">VCO</span>(音源) &rarr; <span style="color:#ff9900">VCF</span>(フィルター) &rarr; <span style="color:#ff9900">VCA</span>(アンプ) &rarr; <span style="color:#ff9900">REVERB</span> &rarr; <span style="color:#ff9900">OUTPUT</span></p>
      
      <p><strong style="color:#fff">⌨️ キーボード</strong><br>
      [Z] [S] [X] ... [,] [L] [.]<br>
      (ド レ ミ ... 1オクターブ半)</p>
      
      <p><strong style="color:#fff">💡 その他</strong><br>
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
