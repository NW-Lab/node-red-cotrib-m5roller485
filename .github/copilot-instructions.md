# 対話のスタイル
- 日本語で応答してください
- 必要に応じて、ユーザに質問を行い、要求を明確化してください
- 説明は随時README.mdに記してください。

# このリポジトリについて
- このリポジトリはNode-RED MCU用のノードを作成します。通常のNode-REDでは動作しないようにしてください。
- 対象のデバイスはM5-Roller485です。

# Nodeの説明
- ノードは1入力、0出力（出力無し）です。
- msg.payloadで角度を受け取り、M5-Roller485にI2Cのコマンドで制御します。実際にはMotorをOnして動かし、その後停止します。Motorを停止するのは、保持電流で熱くなるのを防ぐためです。
- 角度は-360〜360度で指定します。範囲外の値は無視されます。
- ノードのプロパティでI2CのPin番号、速度が指定できるようにしてください。

# Node-RED MCUについて
- Node-RED MCUは、Node-REDで生成したFlowをNodeRED MCUでJavascriptに変換し、最終的にはModdable SDKで動作します。
Node-RED MCUのリポジトリは https://github.com/phoddie/node-red-mcu です。
Moddable SDKのリポジトリは https://github.com/Moddable-OpenSource/moddable です。

# Node-RED MCUノードの作成について
 ノードの設計は、本リポジトリのnode-create-guidelinesを参考にしてください。
 Node-RED MCUのリポジトリにも公式のノードやサンプルがあります。
 サードパーティ製ノードの例として、https://github.com/404background/node-red-contrib-mcu-m5units を参考にしてください。

# M5-Roller485について
- M5-Roller485はM5Stack社の製品で、I2Cでも制御できるローラーモジュールです。
- 製品の詳細は https://docs.m5stack.com/en/unit/Unit-Roller485 を参照してください。
- Arduino IDEでの制御サンプルは https://github.com/m5stack/M5Unit-Roller を参照してください。