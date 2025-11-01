module.exports = function(RED) {
    // Node-RED MCUでは使用されないが、通常のNode-REDとの互換性のために必要
    function M5Roller485Node(config) {
        RED.nodes.createNode(this, config);
        console.log(config);
    }
    RED.nodes.registerType('m5roller485-node', M5Roller485Node);
};
