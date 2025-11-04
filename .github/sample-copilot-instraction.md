# Copilot向けテンプレート — Node-RED MCU専用ノード開発（ひな形）

このテンプレは、任意のMCU専用ノードを作るときの指示書フォーマットだよ。`HOGEHOGE` や `<PLACEHOLDER>` を自分の値に置き換えて使ってね。

---

## 0. メタ情報（置き換えてね）
- ノード名(type): `<NODE_TYPE>` 例: `mcu_foo`, `m5roller485-node`
- リポジトリ: `https://github.com/HOGEHOGE/<YOUR_REPO>.git`
- Submodule パス（使うなら）: `./submodules/HOGEHOGE-<YOUR_REPO>/manifest.json`
- 対象デバイス/バス: `<I2C/SPI/UART>` / アドレス/ポート: `<ADDR_OR_PORT>`
- 入出力: 入力`<N>` / 出力`<M>`
- 受け取るmsg: `msg.payload` に `<FORMAT>`

---

## 1. 最重要チェックリスト（まずここ）
- [ ] スタブ(.js, CommonJS) と MCU実装(.mcu.js, ESM) を分離
- [ ] package.json の node-red.nodes はスタブを指す
- [ ] MCU実装では `export default` を使わない（static登録）
- [ ] manifest.json はオブジェクト形式、preloadは文字列、拡張子`.js`なし
- [ ] HTMLの `moddable_manifest` で自分のリポ or Submodule を include
- [ ] ノード型名（type）が HTML / MCU / スタブ / package.json / manifest 全部で一致
- [ ] デプロイは Node-RED MCU 側から（手動mcconfig不要）

---

## 2. ディレクトリ構成（テンプレ）
```
<YOUR-PACKAGE>/
  package.json
  manifest.json
  node/
    <NODE_TYPE>/
      <NODE_TYPE>.html
      <NODE_TYPE>.js        # スタブ（CommonJS）
      <NODE_TYPE>.mcu.js    # MCU実装（ESM）
      locales/
        en-US/
          <NODE_TYPE>.html
          <NODE_TYPE>.json
        ja/
          <NODE_TYPE>.html
          <NODE_TYPE>.json
  examples/
  images/
```

---

## 3. package.json（スタブを登録）
```json
{
  "name": "@HOGEHOGE/<YOUR_PKG>",
  "version": "0.0.1",
  "node-red": {
    "nodes": {
      "<NODE_TYPE>": "node/<NODE_TYPE>/<NODE_TYPE>.js"
    }
  }
}
```

---

## 4. manifest.json（MCUモジュール定義: オブジェクト形式）
```json
{
  "modules": {
    "<NODE_TYPE>": "./node/<NODE_TYPE>/<NODE_TYPE>.mcu"
  },
  "preload": "<NODE_TYPE>"
}
```

---

## 5. HTML（エディタUI + moddable_manifest）
```html
<script type="text/javascript">
RED.nodes.registerType('<NODE_TYPE>', {
  category: 'MCU',
  color: '#a6bbcf',
  defaults: {
    name: { value: "" },
    // 例: I2Cなら
    address: { value: <ADDR_OR_HEX>, validate: RED.validators.number() },
    sda: { value: 21, validate: RED.validators.number() },
    scl: { value: 22, validate: RED.validators.number() },
    hz: { value: 400000, validate: RED.validators.number() },
    moddable_manifest: {
      value: {
        include: [
          { "git": "https://github.com/HOGEHOGE/<YOUR_REPO>.git" }
          // or { "path": "./submodules/HOGEHOGE-<YOUR_REPO>/manifest.json" }
        ]
      }
    }
  },
  inputs: <N>,
  outputs: <M>,
  icon: "bridge.svg",
  label: function() { return this.name || '<NODE_TYPE>' }
});
</script>
```

---

## 6. スタブ（CommonJS, `<NODE_TYPE>.js`）
```javascript
module.exports = function(RED) {
  function NodeStub(config) {
    RED.nodes.createNode(this, config);
    this.status({ fill: "red", shape: "ring", text: "MCU only" });
  }
  RED.nodes.registerType("<NODE_TYPE>", NodeStub);
};
```

---

## 7. MCU実装（ESM, `<NODE_TYPE>.mcu.js`）
```javascript
import {Node} from "nodered";
import Timer from "timer"; // 必要なら

class NodeMCU extends Node {
  #i2c; // 例: I2C

  onStart(config) {
    super.onStart(config);
    const io = globalThis.device?.io;
    if (!io?.I2C) {
      this.status({fill: "red", shape: "ring", text: "no I2C"});
      return;
    }
    this.#i2c = new io.I2C({
      address: config.address ?? <ADDR_OR_HEX>,
      data: config.sda ?? 21,
      clock: config.scl ?? 22,
      hz: config.hz ?? 400000
    });
    this.status({fill: "green", shape: "dot", text: "ready"});
  }

  onMessage(msg, done) {
    try {
      // 例: 単純なレジスタ書き込み
      // this.#i2c.write(Uint8Array.of(<REG>, <VALUE>));
      done?.();
    } catch (e) {
      this.status({fill: "red", shape: "ring", text: "error"});
      done?.(e);
    }
  }

  onStop() {
    this.#i2c?.close();
  }

  static type = "<NODE_TYPE>";
  static { RED.nodes.registerType(this.type, this); }
}
```

---

## 8. 段階的開発フロー（Phase）
1) 認識: 最小スタブ/MCU/HTML/manifestで型登録を確認（xsbugログ: "started"）
2) 通信: I2C/SPI/UART の初期化と簡単なwrite/readで疎通確認
3) 機能: 最小制御シーケンスを実装（例: MODE→DATA→START→STOP）
4) 拡張: UIプロパティ/多言語/エラーハンドリング/タイムアウト/保護

各Phaseで必ずデプロイ＆ログ確認。詰まったら一つ前のPhaseへ戻る。

---

## 9. よくあるエラーと対処
- Disabling unsupported node type
  - MCU実装で `export default` を使っている / static登録が無い
  - type名の不一致（HTML/MCU/スタブ/manifest/package.json）
  - manifest.json の形式が配列 / preloadが配列 / `.js`拡張子を付けた
- ERR_MODULE_NOT_FOUND: 'nodered'
  - package.json が `.mcu.js` を指している / スタブがESM
- No 'creation' found in manifests
  - `mcconfig` を直接叩いている（Node-RED MCU の Deploy を使う）

---

## 10. Windows手順（PowerShell / cmd.exe）

標準Node-REDへローカルインストール（パレット確認用）:
```powershell
cd $env:USERPROFILE\.node-red
npm install C:\Users\HOGEHOGE\github\<YOUR_REPO>
```
```cmd
cd %USERPROFILE%\.node-red
npm install C:\Users\HOGEHOGE\github\<YOUR_REPO>
```

MCUへは Node-RED MCU 画面から Deploy。xsbug で `trace()` を確認。

---

## 11. 公開前チェック
- [ ] manifest.json がオブジェクト形式 / preloadは文字列 / 拡張子なし
- [ ] MCU実装に export default が無い / static登録がある
- [ ] package.json がスタブ(.js)を指す
- [ ] moddable_manifest の include が自分のFork or Submodule を指す
- [ ] type名の完全一致
- [ ] 標準Node-REDでパレット表示 / MCUでログ出力

---

## 12. 参考
- Node-RED MCU: https://github.com/phoddie/node-red-mcu
- Moddable SDK: https://github.com/Moddable-OpenSource/moddable
- 参考構成（ESM, static登録）: https://github.com/404background/node-red-contrib-mcu-m5units
