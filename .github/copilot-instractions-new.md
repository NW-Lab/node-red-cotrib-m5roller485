# Copilot向け完全ガイド — Node-RED MCU専用ノード開発（落とし穴全網羅版）# Copilot instructions (improved) — Node-RED MCU専用ノード開発で詰まらないために



このドキュメントは、今回の実装で**実際にハマった全ポイント**を元に「これさえ守れば一発で通る」を目指して書いたよ。Node-RED MCU専用ノードをサクッと動かすための決定版ガイド。このリポは「Node-RED MCU専用」のノードを作る。通常のNode-REDでは動かさない。ここに、今回ハマったポイントを避けるための具体的なガイドをまとめる。



---## 目的とスコープ

- 目的: M5-Roller485 を Node-RED MCU(Moddable) 上で I2C 制御するノードを作る

## 🎯 最重要チェックリスト（まずここを確認）- 非目的: 通常の Node-RED でのランタイム実行（編集とパレット表示のみ）



✅ スタブ(.js, CommonJS) と MCU実装(.mcu.js, ESM) を**完全に分離**  ## 基本ポリシー（超重要）

✅ `package.json` の `node-red.nodes` は**スタブのみ**を指す  1) MCU専用二層構成を徹底

✅ MCU実装は `export default` **絶対禁止**（`class Xxx extends Node {}` + `static { RED.nodes.registerType(...) }`）  - 標準Node-RED用: CommonJSの“スタブ”のみ（require/import禁止、noderedモジュール参照禁止）

✅ `manifest.json` の `modules` は**配列NG、オブジェクト形式**で、拡張子`.js`なし  - MCU実装用: ESMで本体（`import {Node} from "nodered"`など）

✅ `manifest.json` の `preload` は**文字列**でモジュール名を指定  

✅ エディタHTMLの `moddable_manifest` は**gitリポジトリまたはローカルSubmodule**を include  2) ファイル命名と対応関係

✅ ノード型名（type）が HTML / MCU実装 / package.json で**完全一致**  - エディタUI: `node/m5roller485-node/m5roller485-node.html`

✅ フローは **Node-RED MCU の Deploy から自動ビルド**（手動mcconfig不要）- 標準Node-REDのスタブ: `node/m5roller485-node/m5roller485-node.js`

- MCU実装: `node/m5roller485-node/m5roller485-node.mcu.js`

---- これらの“基底名”(m5roller485-node)は必ず一致させる



## 📂 ディレクトリ構成（最小構成）3) package.json の node-red マッピング

```json

```{

node-red-cotrib-m5roller485/  "node-red": {

  package.json              # スタブ登録のみ    "nodes": {

  manifest.json             # MCU側のモジュール定義（オブジェクト形式!）      "m5roller485-node": "node/m5roller485-node/m5roller485-node.js"

  node/    }

    index.js                # スタブ集約用（ほぼ空でもOK）  }

    m5roller485-node/}

      m5roller485-node.html       # エディタUI + moddable_manifest```

      m5roller485-node.js         # スタブ（CommonJS, Node-REDホスト用）- 指すのはあくまで“スタブ”JS。MCU実装を指してはいけない

      m5roller485-node.mcu.js     # MCU実装（ESM, Moddable実行用）

      locales/                    # 多言語対応（ja/en-US）4) manifest.json はパッケージ直下に置き、MCU実装を指す

``````json

{

---  "modules": [

    "node/m5roller485-node/m5roller485-node.mcu.js"

## 🔥 決定的な落とし穴（今回ハマったやつ全部）  ],

  "preload": []

### 1️⃣ manifest.json の形式が間違ってる（超頻出）}

```

❌ **NG例（配列形式）:**- パスはパッケージルート基準で“node/…”を含める（相対がズレやすい）

```json

{5) エディタUIの moddable_manifest で“自分のmanifest”も読む

  "modules": [```html

    "node/m5roller485-node/m5roller485-node.mcu.js"<script type="text/javascript">

  ],RED.nodes.registerType('m5roller485-node',{

  "preload": []  // ...

}  defaults: {

```    // ...

    moddable_manifest: {value: {include: [

✅ **OK例（オブジェクト形式 + preload文字列 + 拡張子なし）:**      "$(NODEREDMCU)/nodes/mcu/i2c/manifest.json",

```json      "$(HOME)/.node-red/node_modules/@nw-lab/node-red-contrib-m5roller485/manifest.json"

{    ]}}

  "modules": {  }

    "m5roller485-node": "./node/m5roller485-node/m5roller485-node.mcu"});

  },</script>

  "preload": "m5roller485-node"```

}- I2Cドライバのmanifestに加えて“このパッケージ自身のmanifest”もincludeしないと、MCU側でクラス未定義扱いになる（unsupported回避）

```

## スタブ実装の雛形（標準Node-RED）

**ポイント:**```js

- `modules` は**必ずオブジェクト**（キー: ノード名、値: パス）module.exports = function(RED) {

- パスに `.js` 拡張子は**書かない**  function M5Roller485Node(config) {

- `preload` は**文字列**でモジュール名を指定（配列じゃない!）    RED.nodes.createNode(this, config);

    this.status({ fill: "red", shape: "ring", text: "MCU only" });

---    this.error("This node runs only on Node-RED MCU (Moddable). It cannot run in standard Node-RED.");

  }

### 2️⃣ MCU実装で `export default` を使ってる（致命的）  RED.nodes.registerType("m5roller485-node", M5Roller485Node);

};

❌ **NG例:**```

```javascript- CommonJSだけ。import/ESM構文や`import {Node} from "nodered"`は禁止

export default class M5Roller485Node extends Node {

  // ...## MCU実装の雛形（重要ポイントのみ）

}- I2Cの初期化

```- 角度→位置の変換（100pos/度 × 100のプロトコル倍率）

- シーケンス: MODE(Position=0x02)→POS(0x80)→CURRENT(0x20)→OUTPUT(0x00=OFF/0x01=ON)

✅ **OK例:**- タイムアウト停止（2s）で保持電流の発熱を避ける

```javascript- デバッグ用に `trace()` を適所で呼ぶ

import {Node} from "nodered";

import Timer from "timer";## Windowsでの動作確認（標準Node-RED側）

- ローカルインストール

class M5Roller485Node extends Node {```bat

  // 実装...cd %USERPROFILE%\.node-red

  npm install C:\Users\<YOU>\github\node-red-cotrib-m5roller485

  static type = "m5roller485-node"```

  static {- パレット表示確認

    RED.nodes.registerType(this.type, this)  - 「MCU」カテゴリに出る

  }  - 使おうとすると赤リング「MCU only」表示（正常）

}- 旧版が残る/壊れる時

```  - `%USERPROFILE%\.node-red\node_modules\@nw-lab\node-red-contrib-m5roller485\node\m5roller485-node\m5roller485-node.js` が“スタブのみ”か確認（ESM混入してないか）



**理由:**  ## MCUビルド（Moddable）

Node-RED MCU は `export default` を認識しない。必ず `static { RED.nodes.registerType(...) }` で登録すること。- ビルド例

```bat

---mcconfig -d -x localhost:5004 -m -p esp32/m5atom_s3r

```

### 3️⃣ package.json がMCU実装を指してる- xsbugでログ確認

  - 「Disabling unsupported node type」が出たら、moddable_manifest で自分の manifest を含め忘れている

❌ **NG例:**  - 「…directory not found」は manifest.json の modules の相対パスが誤り（node/ を入れる）

```json

{## よくあるハマり（症状→原因→対処）

  "node-red": {- パレットに出ない → m5roller485-node.html と JS の“基底名”不一致 or package.json のnodesが別ファイル指し

    "nodes": {- 起動時に `ERR_MODULE_NOT_FOUND: 'nodered'` → スタブにESMやimportを混入させた。スタブはCommonJSのみ

      "m5roller485-node": "node/m5roller485-node/m5roller485-node.mcu.js"- MCUで "unsupported node type" → エディタUIの moddable_manifest が自パッケージの manifest を include してない

    }- `directory not found`（mcconfig） → manifest.json の modules パスが間違い（node/ を付け忘れ）

  }- LEDが点かない → I2C失敗 or LEDレジスタ違い。まず `trace()` でレジスタ書き込みの成功/失敗を出し、I2Cラインとアドレス(0x64)を確認。必要なら電流値(current)を上げる

}

```## I2C/動作パラメータの既定

- I2Cアドレス: 0x64

✅ **OK例（スタブを指す）:**- SDA: 21 / SCL: 22 / 400kHz

```json- 角度: -360〜360 度

{- 電流: `current` は 0.01A単位（例: 1000 = 10.00A）

  "node-red": {

    "nodes": {## デバッグの鉄板

      "m5roller485-node": "node/m5roller485-node/m5roller485-node.js"- まず xsbug に `trace()` を出す（Mode/Pos/Current/Output 各書き込みの成否）

    }- LEDを赤/消灯でON期間を可視化（レジスタ0x30。FWにより変わる可能性あり）

  }- I2Cが無い場合 `device.io.I2C` チェックで早期に status:error を表示

}

```## 公開前チェック

- スタブJSにESMやimportが混入していないか

**理由:**  - エディタUIの `moddable_manifest` に“自分のmanifest”が含まれているか

通常のNode-REDホストが `.mcu.js`（ESM）を読もうとすると `ERR_MODULE_NOT_FOUND: 'nodered'` エラーになる。- `manifest.json` の modules パス先に実ファイルが存在するか

- パレット表示（標準）とMCU動作（Moddable）をそれぞれ実機で確認

---

## 変更に強いコツ

### 4️⃣ moddable_manifest の include が不足または間違ってる- MCU実装は `.mcu.js` に隔離し、スタブと混ぜない

- 生成物（インストール先）を疑う時は、`npm install <ローカルパス>` で上書きし、Node-RED再起動

✅ **OK例（Git参照 - Fork使用の場合）:**- Windowsは改行やエンコーディングの混入でESM/CJSが壊れやすい。スタブは最小限に

```javascript

RED.nodes.registerType('m5roller485-node', {---

  // ...このドキュメントを `.github/copilot-instractions-new.md` に置いて、開発の出だしで必ず読むこと。これ守れば、今回のハマり（unsupported/ERR_MODULE_NOT_FOUND/manifestパス）は最初から回避できる。
  defaults: {
    // ...
    moddable_manifest: {
      value: {
        include: [
          { "git": "https://github.com/NW-Lab/node-red-cotrib-m5roller485.git" }
        ]
      }
    }
  }
});
```

✅ **OK例（ローカルSubmodule参照）:**
```javascript
moddable_manifest: {
  value: {
    include: [
      { "path": "./submodules/node-red-cotrib-m5roller485/manifest.json" }
    ]
  }
}
```

**ポイント:**
- 自分のリポジトリを**Fork**した場合は、必ずFork先のURLに変更すること
- `git` でも `path` でもOK。どちらか一方を使う
- Git参照の場合、リポジトリルートに `manifest.json` が必須

---

### 5️⃣ ノード型名（type）が不一致

すべて `m5roller485-node` で統一すること:
- HTML: `<script data-template-name="m5roller485-node">`
- HTML: `RED.nodes.registerType('m5roller485-node', {...})`
- MCU実装: `static type = "m5roller485-node"`
- スタブ: `RED.nodes.registerType("m5roller485-node", M5Roller485Node)`
- package.json: `"m5roller485-node": "node/..."`

一箇所でも違うと「Disabling unsupported node type」になる。

---

## 📝 スタブ実装（m5roller485-node.js）

```javascript
module.exports = function(RED) {
    function M5Roller485Node(config) {
        RED.nodes.createNode(this, config);
        
        // MCU専用であることを表示
        this.status({
            fill: "red",
            shape: "ring",
            text: "MCU only"
        });
        
        this.error("This node runs only on Node-RED MCU (Moddable). " +
                   "It cannot run in standard Node-RED.");
    }
    
    RED.nodes.registerType("m5roller485-node", M5Roller485Node);
};
```

**重要:**
- CommonJSのみ（`module.exports`）
- `import` 文や ESM 構文は**絶対禁止**
- `nodered` モジュールは**参照しない**

---

## 🚀 MCU実装のポイント（m5roller485-node.mcu.js）

### I2C初期化
```javascript
onStart(config) {
    super.onStart(config);
    
    const io = globalThis.device?.io;
    if (!io?.I2C) {
        this.status({fill: "red", shape: "ring", text: "no I2C"});
        return;
    }
    
    this.#i2c = new io.I2C({
        address: config.address,
        data: config.sda,
        clock: config.scl,
        hz: config.hz
    });
}
```

### M5-Roller485 制御シーケンス
1. Mode設定（0x01レジスタ → 0x02: Position mode）
2. Position設定（0x80レジスタ → 4byte little-endian）
3. Current設定（0x20レジスタ → 4byte little-endian, 単位0.01A）
4. Motor ON（0x00レジスタ → 0x01）
5. タイムアウト後Motor OFF（0x00レジスタ → 0x00）

### デバッグログ
```javascript
trace(`M5Roller485: Starting control - angle=${angle}, position=${position}, current=${current}\n`);
```

xsbugで確認できるように、各ステップで `trace()` を入れること。

---

## 💻 Windows開発手順（cmd.exe / PowerShell）

### ローカルインストール（開発中）

**PowerShell:**
```powershell
cd $env:USERPROFILE\.node-red
npm install C:\Users\<YOUR_NAME>\github\node-red-cotrib-m5roller485
```

**cmd.exe:**
```cmd
cd %USERPROFILE%\.node-red
npm install C:\Users\<YOUR_NAME>\github\node-red-cotrib-m5roller485
```

### 確認手順
1. Node-REDを再起動
2. パレットに「MCU」カテゴリが表示される
3. ノードをドラッグすると「MCU only」と赤いリング（正常）

### MCUへのデプロイ
- **Node-RED MCU の Deploy ボタン**から自動ビルド＆書き込み
- xsbugでログ確認（`trace()` の出力が見える）

---

## ⚠️ よくあるエラーと対処法

### `Disabling unsupported node type 'm5roller485-node'`

**原因:**
1. `manifest.json` が配列形式になってる → オブジェクトに修正
2. MCU実装で `export default` を使ってる → 削除して `static { ... }` に
3. ノード型名（type）が不一致 → 全箇所を確認
4. `moddable_manifest` の include が間違ってる → Git URL/パスを確認

---

### `ERR_MODULE_NOT_FOUND: Cannot find package 'nodered'`

**原因:**  
`package.json` の `node-red.nodes` が MCU実装（.mcu.js）を指してる

**対処:**  
スタブ（.js）を指すように修正

---

### `No 'creation' found in manifests`

**原因:**  
`mcconfig` を手動で実行してる

**対処:**  
Node-RED MCU の Deploy ボタンから実行すること

---

### LEDが制御できない（青/緑で固定）

**原因:**  
M5-Roller485のファームウェアバージョンによってLED制御が異なる

**対処:**  
LED制御コードを削除または無効化（現在のコードでは既に無効化済み）

---

### モーターが動かない

**原因:**
1. USB給電で電流不足（0.5A程度しか取れない）
2. 電流設定（`current`）が低すぎる
3. タイムアウトが短すぎて移動完了前に停止

**対処:**
- USB運用: `current` を 20〜50（0.2〜0.5A）に設定
- AC adapter運用: `current` を 200〜1000（2〜10A）に設定
- タイムアウトを5秒→10秒に延長

---

## ⚡ 電源とハードウェアの注意

### USB給電の制限
- USB 2.0: 最大 0.5A
- USB 3.0: 最大 0.9A
- `current` パラメータは **0.01A単位**（100 = 1A）

### 推奨設定
| 電源 | current設定 | 備考 |
|------|-------------|------|
| USB 2.0/3.0 | 20〜50 | 0.2〜0.5A、トルク弱め |
| ACアダプタ | 200〜1000 | 2〜10A、フルパワー |

### 発熱対策
- モーター停止後は必ず OUTPUT OFF（0x00）にして保持電流をカット
- 現在のコードでは5秒後に自動でOFFになる

---

## 🔍 デバッグの鉄則

### xsbugでログ確認
```javascript
trace(`M5Roller485: Mode set to POSITION\n`);
trace(`M5Roller485: Position set to ${position}\n`);
trace(`M5Roller485: Current set to ${current}\n`);
trace(`M5Roller485: Motor output ON\n`);
```

### 確認ポイント
1. ノードが認識されているか（「Disabling...」が出ないか）
2. I2C通信が成功しているか（各レジスタ書き込みが成功）
3. タイムアウト後にモーターが停止しているか

---

## � 段階的開発手順（詰まらないための正しい順序）

一度に全部作ると、どこで詰まったか分からなくなる。**必ずこの順序で進めて、各ステップで動作確認すること**。

### Phase 1: 最小構成でノードを認識させる ✅

**目的**: 「Disabling unsupported node type」を回避し、ノードが正しく登録されることを確認

#### 1-1. 基本ファイル作成
```bash
node-red-cotrib-m5roller485/
  package.json
  manifest.json
  node/
    m5roller485-node/
      m5roller485-node.js       # 最小スタブ
      m5roller485-node.mcu.js   # 最小MCU実装
      m5roller485-node.html     # 最小UI
```

#### 1-2. 最小スタブ (`m5roller485-node.js`)
```javascript
module.exports = function(RED) {
    function M5Roller485Node(config) {
        RED.nodes.createNode(this, config);
        this.status({fill: "red", shape: "ring", text: "MCU only"});
    }
    RED.nodes.registerType("m5roller485-node", M5Roller485Node);
};
```

#### 1-3. 最小MCU実装 (`m5roller485-node.mcu.js`)
```javascript
import {Node} from "nodered";

class M5Roller485Node extends Node {
    onStart(config) {
        super.onStart(config);
        trace("M5Roller485: Node started\n");
        this.status({fill: "green", shape: "dot", text: "ready"});
    }
    
    onMessage(msg, done) {
        trace("M5Roller485: Message received\n");
        done();
    }
    
    static type = "m5roller485-node"
    static {
        RED.nodes.registerType(this.type, this)
    }
}
```

#### 1-4. 最小HTML (`m5roller485-node.html`)
```html
<script type="text/javascript">
RED.nodes.registerType('m5roller485-node', {
    category: 'MCU',
    color: '#a6bbcf',
    defaults: {
        name: {value: ""},
        moddable_manifest: {
            value: {
                include: [
                    {"git": "https://github.com/NW-Lab/node-red-cotrib-m5roller485.git"}
                ]
            }
        }
    },
    inputs: 1,
    outputs: 0,
    icon: "bridge.svg",
    label: function() {
        return this.name || "M5-Roller485";
    }
});
</script>
```

#### 1-5. manifest.json（オブジェクト形式!）
```json
{
    "modules": {
        "m5roller485-node": "./node/m5roller485-node/m5roller485-node.mcu"
    },
    "preload": "m5roller485-node"
}
```

#### 1-6. package.json
```json
{
  "node-red": {
    "nodes": {
      "m5roller485-node": "node/m5roller485-node/m5roller485-node.js"
    }
  }
}
```

#### ✅ Phase 1 確認ポイント
- [ ] 標準Node-REDでパレットに表示される
- [ ] ノードをドラッグすると「MCU only」と赤リング表示
- [ ] Node-RED MCUで Deploy すると xsbug に「Node started」が出る
- [ ] xsbug に「Disabling unsupported node type」が**出ない**

❌ ここで詰まったら → manifest.json の形式、type名の一致、export default の有無を再確認

---

### Phase 2: ハードウェア接続とI2C通信確認 🔌

**目的**: I2Cが正しく初期化され、デバイスと通信できることを確認

#### 2-1. I2C初期化を追加 (`m5roller485-node.mcu.js`)
```javascript
import {Node} from "nodered";

class M5Roller485Node extends Node {
    #i2c;
    
    onStart(config) {
        super.onStart(config);
        
        const io = globalThis.device?.io;
        if (!io?.I2C) {
            trace("M5Roller485: No I2C support\n");
            this.status({fill: "red", shape: "ring", text: "no I2C"});
            return;
        }
        
        try {
            this.#i2c = new io.I2C({
                address: 0x64,  // M5-Roller485のアドレス
                data: 21,       // SDA
                clock: 22,      // SCL
                hz: 400000      // 400kHz
            });
            trace("M5Roller485: I2C initialized\n");
            this.status({fill: "green", shape: "dot", text: "I2C ready"});
        } catch (e) {
            trace(`M5Roller485: I2C init failed: ${e.message}\n`);
            this.status({fill: "red", shape: "ring", text: "I2C error"});
        }
    }
    
    onMessage(msg, done) {
        trace(`M5Roller485: Received payload: ${msg.payload}\n`);
        done();
    }
    
    onStop() {
        this.#i2c?.close();
    }
    
    static type = "m5roller485-node"
    static { RED.nodes.registerType(this.type, this) }
}
```

#### ✅ Phase 2 確認ポイント
- [ ] xsbug に「I2C initialized」が出る
- [ ] ステータスが「I2C ready」になる
- [ ] inject ノードから数値を送ると「Received payload: 〇〇」が出る

❌ ここで詰まったら → SDA/SCLピン番号、I2Cアドレス(0x64)、配線を確認

---

### Phase 3: 基本的なI2C書き込み確認 ✍️

**目的**: I2Cレジスタへの書き込みが成功することを確認

#### 3-1. シンプルな書き込みテスト (`m5roller485-node.mcu.js`)
```javascript
onMessage(msg, done) {
    if (!this.#i2c) {
        done();
        return;
    }
    
    try {
        // Mode register (0x01) に Position mode (0x02) を書き込み
        this.#i2c.write(Uint8Array.of(0x01, 0x02));
        trace("M5Roller485: Mode register write OK\n");
        
        this.status({fill: "green", shape: "dot", text: "write OK"});
        done();
    } catch (e) {
        trace(`M5Roller485: Write failed: ${e.message}\n`);
        this.status({fill: "red", shape: "ring", text: "write error"});
        done(e);
    }
}
```

#### ✅ Phase 3 確認ポイント
- [ ] xsbug に「Mode register write OK」が出る
- [ ] エラーが出ない（write が成功してる）
- [ ] デバイスが反応してる（LEDが変わる、音が鳴るなど）

❌ ここで詰まったら → I2Cアドレス、レジスタアドレス、配線、電源を確認

---

### Phase 4: 制御ロジックの実装 🎛️

**目的**: 実際の制御シーケンスを実装し、動作確認

#### 4-1. 完全な制御シーケンス実装
```javascript
onMessage(msg, done) {
    if (!this.#i2c) {
        done();
        return;
    }
    
    try {
        const angle = msg.payload;
        if (typeof angle !== 'number' || angle < -360 || angle > 360) {
            this.warn(`Invalid angle: ${angle}`);
            done();
            return;
        }
        
        const position = Math.round(angle * 100 * 100); // 角度→位置変換
        trace(`M5Roller485: Target angle=${angle}, position=${position}\n`);
        
        // 1. Mode設定
        this.#i2c.write(Uint8Array.of(0x01, 0x02));
        trace("M5Roller485: Mode set\n");
        
        // 2. Position設定（4byte little-endian）
        const posBytes = new Uint8Array(5);
        posBytes[0] = 0x80; // Position register
        posBytes[1] = position & 0xFF;
        posBytes[2] = (position >> 8) & 0xFF;
        posBytes[3] = (position >> 16) & 0xFF;
        posBytes[4] = (position >> 24) & 0xFF;
        this.#i2c.write(posBytes);
        trace("M5Roller485: Position set\n");
        
        // 3. Current設定（4byte little-endian）
        const current = 50; // 0.5A（USB給電用）
        const currentBytes = new Uint8Array(5);
        currentBytes[0] = 0x20; // Current register
        currentBytes[1] = current & 0xFF;
        currentBytes[2] = (current >> 8) & 0xFF;
        currentBytes[3] = (current >> 16) & 0xFF;
        currentBytes[4] = (current >> 24) & 0xFF;
        this.#i2c.write(currentBytes);
        trace("M5Roller485: Current set\n");
        
        // 4. Motor ON
        this.#i2c.write(Uint8Array.of(0x00, 0x01));
        trace("M5Roller485: Motor ON\n");
        this.status({fill: "yellow", shape: "dot", text: `moving to ${angle}°`});
        
        // 5. タイムアウト後に停止
        Timer.set(() => {
            try {
                this.#i2c.write(Uint8Array.of(0x00, 0x00));
                trace("M5Roller485: Motor OFF\n");
                this.status({fill: "green", shape: "dot", text: `at ${angle}°`});
                done();
            } catch (e) {
                trace(`M5Roller485: Stop failed: ${e.message}\n`);
                done(e);
            }
        }, 5000);
        
    } catch (e) {
        trace(`M5Roller485: Control failed: ${e.message}\n`);
        this.status({fill: "red", shape: "ring", text: "error"});
        done(e);
    }
}
```

#### ✅ Phase 4 確認ポイント
- [ ] 各ステップのログが xsbug に出る
- [ ] モーターが実際に動く
- [ ] 5秒後に自動停止する
- [ ] ステータスが正しく変化する（moving → at 〇°）

❌ ここで詰まったら → 電流値(current)を調整、タイムアウトを延長、電源をACアダプタに変更

---

### Phase 5: UIとプロパティの追加 🎨

**目的**: ユーザが設定可能なプロパティを追加

#### 5-1. HTMLにプロパティ追加
```html
<script type="text/javascript">
RED.nodes.registerType('m5roller485-node', {
    category: 'MCU',
    defaults: {
        name: {value: ""},
        address: {value: 0x64, validate: RED.validators.number()},
        sda: {value: 21, validate: RED.validators.number()},
        scl: {value: 22, validate: RED.validators.number()},
        hz: {value: 400000, validate: RED.validators.number()},
        current: {value: 50, validate: RED.validators.number()},
        moddable_manifest: {
            value: {
                include: [
                    {"git": "https://github.com/NW-Lab/node-red-cotrib-m5roller485.git"}
                ]
            }
        }
    },
    // ... 残りの設定
});
</script>

<script type="text/html" data-template-name="m5roller485-node">
    <div class="form-row">
        <label for="node-input-current"><i class="fa fa-bolt"></i> Current (0.01A)</label>
        <input type="number" id="node-input-current" placeholder="50">
    </div>
    <!-- 他のプロパティも追加 -->
</script>
```

#### 5-2. MCU実装でconfigから読み取り
```javascript
onStart(config) {
    super.onStart(config);
    
    const io = globalThis.device?.io;
    if (!io?.I2C) {
        this.status({fill: "red", shape: "ring", text: "no I2C"});
        return;
    }
    
    this.#i2c = new io.I2C({
        address: config.address || 0x64,
        data: config.sda || 21,
        clock: config.scl || 22,
        hz: config.hz || 400000
    });
    
    this.#current = config.current || 50;
    trace(`M5Roller485: I2C init - address=0x${config.address.toString(16)}, current=${this.#current}\n`);
}
```

#### ✅ Phase 5 確認ポイント
- [ ] ノードのプロパティが編集画面に表示される
- [ ] 設定値が正しく反映される
- [ ] デフォルト値が適切に設定されてる

---

### Phase 6: 多言語対応と最終調整 🌐

#### 6-1. localesフォルダ作成
```
node/m5roller485-node/locales/
  en-US/
    m5roller485-node.html
    m5roller485-node.json
  ja/
    m5roller485-node.html
    m5roller485-node.json
```

#### 6-2. エラーハンドリング強化
- 入力値のバリデーション
- I2C通信エラーの詳細ログ
- ステータス表示の充実

#### ✅ Phase 6 確認ポイント
- [ ] 日本語/英語が正しく表示される
- [ ] 異常値を入れてもクラッシュしない
- [ ] エラーメッセージが分かりやすい

---

## 📌 各Phaseで詰まったときの戻り方

| Phase | 詰まったら | 確認すること |
|-------|-----------|------------|
| Phase 1 | ノードが認識されない | manifest.json形式、type名一致、export default |
| Phase 2 | I2C初期化失敗 | ピン番号、配線、デバイス電源 |
| Phase 3 | 書き込みエラー | I2Cアドレス、レジスタアドレス |
| Phase 4 | モーター動かない | 電流値、タイムアウト、電源容量 |
| Phase 5 | 設定が反映されない | config の読み取り、デフォルト値 |
| Phase 6 | 翻訳が出ない | localesパス、data-i18n属性 |

**重要:** 各Phaseで必ず動作確認してから次に進むこと。一度に全部実装すると、どこで詰まったか分からなくなる!

---

## �📚 参考リンク

- **Node-RED MCU**: https://github.com/phoddie/node-red-mcu
- **Moddable SDK**: https://github.com/Moddable-OpenSource/moddable
- **M5-Roller485**: https://docs.m5stack.com/en/unit/Unit-Roller485
- **Arduinoライブラリ**: https://github.com/m5stack/M5Unit-Roller
- **参考実装**: https://github.com/404background/node-red-contrib-mcu-m5units

---

## ✅ 公開前の最終チェック

- [ ] `manifest.json` が**オブジェクト形式**になってる
- [ ] `manifest.json` の `preload` が**文字列**になってる
- [ ] MCU実装に `export default` が**含まれていない**
- [ ] `package.json` がスタブ（.js）を指してる
- [ ] `moddable_manifest` の Git URL が自分のForkを指してる
- [ ] ノード型名（type）が全箇所で一致してる
- [ ] 通常のNode-REDでパレット表示される
- [ ] MCU実行でxsbugにログが出る
- [ ] モーターが実際に動く

---

## 🎓 これさえ守れば一発で通る3原則

1. **manifest.json はオブジェクト形式、拡張子なし、preloadは文字列**
2. **MCU実装は export default 禁止、static 登録必須**
3. **package.json はスタブのみ、moddable_manifest は自リポ指定**

このドキュメントを最初に読んで実装すれば、今回ハマった「Disabling unsupported node type」「ERR_MODULE_NOT_FOUND」「manifest パス間違い」は全部回避できる! 🚀

---

**最終更新**: 2025年11月2日  
**対象**: Node-RED MCU + Moddable SDK + M5-Roller485  
**作成理由**: 実装時に遭遇した全ハマりポイントの完全網羅
