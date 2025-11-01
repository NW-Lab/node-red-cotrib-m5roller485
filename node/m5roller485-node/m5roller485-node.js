module.exports = function(RED) {
  // 通常版 Node-RED 用のスタブ。
  // このノードは Node-RED MCU(Moddable) 専用だよ。
  function M5Roller485Node(config) {
    RED.nodes.createNode(this, config);
    this.status({ fill: "red", shape: "ring", text: "MCU only" });
    this.error("This node runs only on Node-RED MCU (Moddable). It cannot run in standard Node-RED.");
  }
  RED.nodes.registerType("m5roller485-node", M5Roller485Node);
};
