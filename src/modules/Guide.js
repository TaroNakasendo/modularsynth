import { BaseModule } from './BaseModule.js';

export class Guide extends BaseModule {
  constructor() {
    super('MANUAL');
    
    // Make this module wider to fit text
    this.element.style.width = '450px'; 
    this.element.style.overflowY = 'auto'; // readable
    this.element.style.background = '#222';
    
    const content = document.createElement('div');
    content.style.padding = '0 10px';
    content.style.fontSize = '0.75rem';
    content.style.color = '#ccc';
    content.style.lineHeight = '1.4';
    content.style.textAlign = 'left';
    
    content.innerHTML = `
      <h3>Modular Synth Guide</h3>
      <p>Web Audio Modular Synthesizerへようこそ。</p>
      
      <h4>基本操作</h4>
      <ul>
        <li><strong>パッチ接続:</strong> OUTジャックからINジャックへドラッグ＆ドロップ。</li>
        <li><strong>切断:</strong> ジャックをクリックすると接続が解除されます。</li>
        <li><strong>ノブ操作:</strong> 上下にドラッグして値を調整します。</li>
        <li><strong>プリセット:</strong> 上部ボタンでGun, Organ, Dub Sirenなどを切り替え。</li>
      </ul>
      
      <h4>モジュール解説</h4>
      <ul>
        <li><strong>Keyboard:</strong> 演奏入力モジュール。
          <ul>
            <li>KEY: PCキーボード (Z,S,X...下段, Q,2,W...上段) 対応。</li>
            <li>ARP: アルペジエーター。押した和音を分散して再生。</li>
            <li>HOLD: 鍵盤を離しても音を持続。</li>
            <li>OCT +/-: オクターブ変更 (-3 ～ +3)。</li>
          </ul>
        </li>
        <li><strong>Sequencer:</strong> 8ステップシーケンサー。スライダーで音程設定。</li>
        <li><strong>VCO:</strong> オシレーター。音の発生源。V/OCT入力で音程制御。</li>
        <li><strong>LFO:</strong> 低周波オシレーター。ビブラートや変調に使用。</li>
        <li><strong>Noise:</strong> ホワイト/ピンクノイズ。</li>
        <li><strong>ADSR:</strong> エンベロープジェネレーター。
          <ul>
            <li>A (Attack): 音の立ち上がり時間。</li>
            <li>D (Decay): 最大音量からSustainレベルに下がるまでの時間。</li>
            <li>S (Sustain): 鍵盤を押している間の音量レベル。</li>
            <li>R (Release): 鍵盤を離した後の余韻時間。</li>
          </ul>
        </li>
        <li><strong>VCF:</strong> フィルター。音の明るさを削る。ENV入力でワウ効果。</li>
        <li><strong>VCA:</strong> アンプ。音量を制御。GATEやADSRで開閉する。</li>
        <li><strong>Delay / Reverb:</strong> 空間系エフェクト。</li>
        <li><strong>Vocoder:</strong> ボコーダー。マイク入力でシンセを喋らせる。</li>
      </ul>

      <h4>ジャック解説 (Jacks)</h4>
      <ul>
        <li><strong>CV / V/OCT:</strong> 音程制御電圧。1V = 1オクターブ。</li>
        <li><strong>GATE:</strong> 発音信号。押している間ON。</li>
        <li><strong>ENV:</strong> エンベロープ入力。フィルターやピッチを時間変化させる。</li>
        <li><strong>FM:</strong> 周波数変調。ビブラートなど。</li>
      </ul>
      
      <p style="text-align: center; margin-top: 20px; color: #666; font-size: 0.8rem;">
        Created with Web Audio API
      </p>
    `;
    
    // Clear standard UI slots to make room (hacky but works)
    this.controlsContainer.style.display = 'none';
    this.jacksContainer.style.display = 'none';
    
    // Append custom content wrapper
    // We insert it after header
    this.element.appendChild(content);
  }
}
