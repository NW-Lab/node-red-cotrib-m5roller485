# node-red-contrib-m5roller485

Node-RED MCU用のM5Stack Roller485制御ノード

## 概要

このノードは、M5Stack Roller485ユニットをNode-RED MCU環境でI2C経由で制御するためのノードです。
Moddable SDKで動作するマイクロコントローラー(ESP32など)上で、Roller485の位置制御を行います。

## 特徴

- **Node-RED MCU専用**: 通常のNode-REDでは動作しません
- **I2C通信**: M5-Roller485とI2Cで直接通信
- **角度制御**: -360度から+360度の範囲で回転角度を指定
- **自動停止**: 移動完了後、自動的にモーターを停止して発熱を防止
- **位置モード**: FOC制御による正確な位置決め

## インストール

```bash
npm install @nw-lab/node-red-contrib-m5roller485
```

## 使い方

### 基本的な使用方法

1. M5-Roller485をI2Cで接続(デフォルト: SDA=21, SCL=22, アドレス=0x64)
2. Injectノードなどで角度を指定
3. M5-Roller485ノードに接続
4. Node-RED MCUでデプロイ

### msg.payload

`msg.payload`に-360〜360の数値(度数)を設定します。

```javascript
msg.payload = 90;  // 90度回転
msg.payload = -180; // -180度回転
msg.payload = 360;  // 360度回転(1回転)
```

### プロパティ

- **I2Cアドレス**: デフォルト 0x64 (100)
- **SDAピン**: デフォルト 21
- **SCLピン**: デフォルト 22
- **I2C速度**: デフォルト 400000 Hz (400kHz)
- **電流制限**: デフォルト 1000 (10.00A)

## 動作シーケンス

ノードは以下のシーケンスでM5-Roller485を制御します:

1. 位置モードに設定 (I2C_MODE_REG = 0x02)
2. 目標位置を設定 (I2C_POS_REG)
3. 電流制限を設定 (I2C_POS_MAX_CURRENT_REG)
4. モーター出力ON (I2C_OUTPUT_REG = 0x01)
5. 2秒待機(移動完了まで)
6. モーター出力OFF (I2C_OUTPUT_REG = 0x00) - 保持電流による発熱を防止

## 技術仕様

- **対象デバイス**: M5Stack Roller485 (Unit-Roller485)
- **通信方式**: I2C
- **位置分解能**: 36000 pos = 360度 (100 pos/度)
- **角度範囲**: -360〜360度
- **移動時間**: 2秒(固定)

## 制限事項

- Node-RED MCU環境でのみ動作します(通常のNode-REDでは動作しません)
- 角度範囲は-360〜360度に制限されています
- 移動完了の検出は時間ベース(2秒固定)です
- 同時に複数の角度指定を送信した場合、最初の動作が完了するまで後続の指定は無視されます

## 参考資料

- [M5-Roller485 製品ページ](https://docs.m5stack.com/en/unit/Unit-Roller485)
- [M5Unit-Roller GitHub](https://github.com/m5stack/M5Unit-Roller)
- [Node-RED MCU](https://github.com/phoddie/node-red-mcu)
- [Moddable SDK](https://github.com/Moddable-OpenSource/moddable)

## ライセンス

MIT

## 作者

NW-Lab

## バージョン履歴

- **0.1.0** (2025-11-01): 初回リリース
  - 基本的な位置制御機能
  - I2C通信による制御
  - -360〜360度の角度指定
