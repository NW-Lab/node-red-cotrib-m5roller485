# Copilot instructions (improved) — Node-RED MCU専用ノード開発で詰まらないために

このリポは「Node-RED MCU専用」のノードを作る。通常のNode-REDでは動かさない。ここに、今回ハマったポイントを避けるための具体的なガイドをまとめる。

## 目的とスコープ
- 目的: M5-Roller485 を Node-RED MCU(Moddable) 上で I2C 制御するノードを作る
- 非目的: 通常の Node-RED でのランタイム実行（編集とパレット表示のみ）

## 基本ポリシー（超重要）
1) MCU専用二層構成を徹底
- 標準Node-RED用: CommonJSの“スタブ”のみ（require/import禁止、noderedモジュール参照禁止）
- MCU実装用: ESMで本体（`import {Node} from "nodered"`など）

2) ファイル命名と対応関係
- エディタUI: `node/m5roller485-node/m5roller485-node.html`
- 標準Node-REDのスタブ: `node/m5roller485-node/m5roller485-node.js`
- MCU実装: `node/m5roller485-node/m5roller485-node.mcu.js`
- これらの“基底名”(m5roller485-node)は必ず一致させる

3) package.json の node-red マッピング
```json
{
  "node-red": {
    "nodes": {
      "m5roller485-node": "node/m5roller485-node/m5roller485-node.js"
    }
  }
}
```
- 指すのはあくまで“スタブ”JS。MCU実装を指してはいけない

4) manifest.json はパッケージ直下に置き、MCU実装を指す
```json
{
  "modules": [
    "node/m5roller485-node/m5roller485-node.mcu.js"
  ],
  "preload": []
}
```
- パスはパッケージルート基準で“node/…”を含める（相対がズレやすい）

5) エディタUIの moddable_manifest で“自分のmanifest”も読む
```html
<script type="text/javascript">
RED.nodes.registerType('m5roller485-node',{
  // ...
  defaults: {
    // ...
    moddable_manifest: {value: {include: [
      "$(NODEREDMCU)/nodes/mcu/i2c/manifest.json",
      "$(HOME)/.node-red/node_modules/@nw-lab/node-red-contrib-m5roller485/manifest.json"
    ]}}
  }
});
</script>
```
- I2Cドライバのmanifestに加えて“このパッケージ自身のmanifest”もincludeしないと、MCU側でクラス未定義扱いになる（unsupported回避）

## スタブ実装の雛形（標準Node-RED）
```js
module.exports = function(RED) {
  function M5Roller485Node(config) {
    RED.nodes.createNode(this, config);
    this.status({ fill: "red", shape: "ring", text: "MCU only" });
    this.error("This node runs only on Node-RED MCU (Moddable). It cannot run in standard Node-RED.");
  }
  RED.nodes.registerType("m5roller485-node", M5Roller485Node);
};
```
- CommonJSだけ。import/ESM構文や`import {Node} from "nodered"`は禁止

## MCU実装の雛形（重要ポイントのみ）
- I2Cの初期化
- 角度→位置の変換（100pos/度 × 100のプロトコル倍率）
- シーケンス: MODE(Position=0x02)→POS(0x80)→CURRENT(0x20)→OUTPUT(0x00=OFF/0x01=ON)
- タイムアウト停止（2s）で保持電流の発熱を避ける
- デバッグ用に `trace()` を適所で呼ぶ

## Windowsでの動作確認（標準Node-RED側）
- ローカルインストール
```bat
cd %USERPROFILE%\.node-red
npm install C:\Users\<YOU>\github\node-red-cotrib-m5roller485
```
- パレット表示確認
  - 「MCU」カテゴリに出る
  - 使おうとすると赤リング「MCU only」表示（正常）
- 旧版が残る/壊れる時
  - `%USERPROFILE%\.node-red\node_modules\@nw-lab\node-red-contrib-m5roller485\node\m5roller485-node\m5roller485-node.js` が“スタブのみ”か確認（ESM混入してないか）

## MCUビルド（Moddable）
- ビルド例
```bat
mcconfig -d -x localhost:5004 -m -p esp32/m5atom_s3r
```
- xsbugでログ確認
  - 「Disabling unsupported node type」が出たら、moddable_manifest で自分の manifest を含め忘れている
  - 「…directory not found」は manifest.json の modules の相対パスが誤り（node/ を入れる）

## よくあるハマり（症状→原因→対処）
- パレットに出ない → m5roller485-node.html と JS の“基底名”不一致 or package.json のnodesが別ファイル指し
- 起動時に `ERR_MODULE_NOT_FOUND: 'nodered'` → スタブにESMやimportを混入させた。スタブはCommonJSのみ
- MCUで "unsupported node type" → エディタUIの moddable_manifest が自パッケージの manifest を include してない
- `directory not found`（mcconfig） → manifest.json の modules パスが間違い（node/ を付け忘れ）
- LEDが点かない → I2C失敗 or LEDレジスタ違い。まず `trace()` でレジスタ書き込みの成功/失敗を出し、I2Cラインとアドレス(0x64)を確認。必要なら電流値(current)を上げる

## I2C/動作パラメータの既定
- I2Cアドレス: 0x64
- SDA: 21 / SCL: 22 / 400kHz
- 角度: -360〜360 度
- 電流: `current` は 0.01A単位（例: 1000 = 10.00A）

## デバッグの鉄板
- まず xsbug に `trace()` を出す（Mode/Pos/Current/Output 各書き込みの成否）
- LEDを赤/消灯でON期間を可視化（レジスタ0x30。FWにより変わる可能性あり）
- I2Cが無い場合 `device.io.I2C` チェックで早期に status:error を表示

## 公開前チェック
- スタブJSにESMやimportが混入していないか
- エディタUIの `moddable_manifest` に“自分のmanifest”が含まれているか
- `manifest.json` の modules パス先に実ファイルが存在するか
- パレット表示（標準）とMCU動作（Moddable）をそれぞれ実機で確認

## 変更に強いコツ
- MCU実装は `.mcu.js` に隔離し、スタブと混ぜない
- 生成物（インストール先）を疑う時は、`npm install <ローカルパス>` で上書きし、Node-RED再起動
- Windowsは改行やエンコーディングの混入でESM/CJSが壊れやすい。スタブは最小限に

---
このドキュメントを `.github/copilot-instractions-new.md` に置いて、開発の出だしで必ず読むこと。これ守れば、今回のハマり（unsupported/ERR_MODULE_NOT_FOUND/manifestパス）は最初から回避できる。