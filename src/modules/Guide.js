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
      </ul>
      
      <h4>モジュール解説</h4>
      <ul>
        <li><strong>Keyboard:</strong> 鍵盤やPCキーボード(Z,X,C...)で演奏。Pitch(CV)とGateを出力。</li>
        <li><strong>Sequencer:</strong> 8ステップシーケンサー。スライダーで音程設定。</li>
        <li><strong>VCO:</strong> オシレーター（音源）。V/OCTで音程制御。</li>
        <li><strong>LFO:</strong> 低周波オシレーター。ビブラートや揺らぎに使用。</li>
        <li><strong>Noise:</strong> ホワイト/ピンクノイズ。風の音やパーカッションに。</li>
        <li><strong>ADSR:</strong> エンベロープ。音の時間変化（立ち上がりや余韻）を作る。</li>
        <li><strong>VCF:</strong> フィルター。音の明るさを調整。CVやENVで動きをつける。</li>
        <li><strong>VCA:</strong> アンプ。音量を制御。GATEやADSRで開閉する。</li>
        <li><strong>Delay / Reverb:</strong> エコーと残響効果。</li>
        <li><strong>Vocoder:</strong> ボコーダー。マイクの声でシンセを歌わせる。'Mic'ボタンで有効化。</li>
      </ul>
      


      <h4>ジャック解説 (Jacks)</h4>
      <ul>
        <li><strong>CV (Control Voltage):</strong> 音程や各種パラメータを制御する電圧。例: KeyboardのCV出力でVCOの音程を動かす。</li>
        <li><strong>GATE:</strong> 鍵盤を押している間だけ電圧が出るジャック。VCAやADSRをトリガーする。</li>
        <li><strong>V/OCT:</strong> 1ボルトで1オクターブ変化するピッチ入力。CVをここにつなぐ。</li>
        <li><strong>FM:</strong> Frequency Modulation。音程を揺らす（ビブラート）入力。</li>
        <li><strong>ENV:</strong> Envelope。ADSRからの信号でフィルターなどを時間変化させる入力。</li>
        <li><strong>CARRIER:</strong> [Vocoder] 声で変調される「素材の音」（シンセ音）を入力する。</li>
        <li><strong>MOD:</strong> [Vocoder] 声の代わりになる変調入力。マイクを使わない場合にリズムマシンなどをつなぐ。</li>
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
    
    // We can add a "Close" jack? No need.
  }
}
