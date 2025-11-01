module.exports = function(RED) {
  // このファイルは通常版 Node-RED 用のスタブ実装です。
  // Node-RED MCU 環境でのみこのノードは実行可能です。
  // 通常版では読み込まれても即座にエラー表示して動作を抑止します。
  function M5Roller485Node(config) {
    RED.nodes.createNode(this, config);
    this.status({ fill: "red", shape: "ring", text: "MCU only" });
    this.error("This node runs only on Node-RED MCU (Moddable). It cannot run in standard Node-RED.");
  }
  RED.nodes.registerType("m5roller485-node", M5Roller485Node);
};
