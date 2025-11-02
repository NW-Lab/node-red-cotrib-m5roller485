/*
 * Copyright (c) 2025 NW-Lab
 *
 * Node-RED MCU node for M5Stack Roller485 unit
 * Controls the Roller485 motor via I2C communication
 */

import {Node} from "nodered";
import Timer from "timer";

// I2C Register Addresses (from M5Unit-Roller library)
const I2C_OUTPUT_REG = 0x00;           // Motor output ON/OFF
const I2C_MODE_REG = 0x01;             // Mode setting
const I2C_POS_REG = 0x80;              // Position setting
const I2C_POS_MAX_CURRENT_REG = 0x20;  // Maximum current for position mode
const I2C_RGB_REG = 0x30;              // RGB LED control

// Motor Modes
const ROLLER_MODE_POSITION = 0x02;     // Position control mode

// Conversion constant: 36000 encoder pos = 360 degrees
const POS_PER_DEGREE = 100;  // 36000/360 = 100 encoder positions per degree

export default class M5Roller485Node extends Node {
    #i2c;
    #options;

    onStart(config) {
        super.onStart(config);

        this.#options = {
            address: config.address || 0x64,
            data: config.sda || 21,
            clock: config.scl || 22,
            hz: config.hz || 400000,
            current: config.current || 1000
        };

        try {
            // Initialize I2C
            if (!globalThis.device?.io?.I2C) {
                this.status({fill: "red", shape: "dot", text: "I2C not available"});
                return;
            }

            this.#i2c = new device.io.I2C(this.#options);
            this.status({fill: "green", shape: "dot", text: "ready"});
        }
        catch (e) {
            this.status({fill: "red", shape: "ring", text: "I2C init failed"});
            this.error("I2C initialization failed: " + e.message);
        }
    }

    onMessage(msg, done) {
        if (!this.#i2c) {
            done(new Error("I2C not initialized"));
            return;
        }

        try {
            const angle = msg.payload;

            // Validate angle range (-360 to 360)
            if (typeof angle !== 'number' || angle < -360 || angle > 360) {
                this.warn(`Invalid angle: ${angle}. Must be between -360 and 360 degrees.`);
                done();
                return;
            }

            // Convert angle to position value
            // Position = angle * 100 (encoder positions per degree) * 100 (protocol multiplier)
            const position = Math.round(angle * POS_PER_DEGREE * 100);
            
            // Get current setting from config (default 1000 = 10.00A)
            const currentLimit = this.#options.current;

            this.status({fill: "yellow", shape: "dot", text: `moving to ${angle}°`});

            // Execute motor control sequence
            this.#controlMotor(position, currentLimit, angle, done);
        }
        catch (e) {
            this.status({fill: "red", shape: "ring", text: "error"});
            done(e);
        }
    }

    #controlMotor(position, current, angle, done) {
            trace(`M5Roller485: Starting control - angle=${angle}, position=${position}, current=${current}\n`);
            
        try {
            // Step 0: Set LED to RED (debugging indicator)
            const redLED = new Uint8Array(4);
            redLED[0] = I2C_RGB_REG;
            redLED[1] = 255; // R
            redLED[2] = 0;   // G
            redLED[3] = 0;   // B
            try {
                this.#i2c.write(redLED);
                trace(`M5Roller485: LED set to RED\n`);
            } catch(e) {
                trace(`M5Roller485: LED write failed: ${e.message}\n`);
            }

            // Step 1: Set Position Mode
            try {
                this.#i2c.write(Uint8Array.of(I2C_MODE_REG, ROLLER_MODE_POSITION));
                trace(`M5Roller485: Mode set to POSITION\n`);
            } catch(e) {
                trace(`M5Roller485: Mode write failed: ${e.message}\n`);
                throw e;
            }

            // Step 2: Set Position (4 bytes, little-endian)
            const posBytes = new Uint8Array(5);
            posBytes[0] = I2C_POS_REG;
            posBytes[1] = position & 0xFF;
            posBytes[2] = (position >> 8) & 0xFF;
            posBytes[3] = (position >> 16) & 0xFF;
            posBytes[4] = (position >> 24) & 0xFF;
            try {
                this.#i2c.write(posBytes);
                trace(`M5Roller485: Position set to ${position}\n`);
            } catch(e) {
                trace(`M5Roller485: Position write failed: ${e.message}\n`);
                throw e;
            }

            // Step 3: Set Maximum Current (4 bytes, little-endian)
            // Current value is already in units of 0.01A, so use directly
            const currentBytes = new Uint8Array(5);
            currentBytes[0] = I2C_POS_MAX_CURRENT_REG;
            currentBytes[1] = current & 0xFF;
            currentBytes[2] = (current >> 8) & 0xFF;
            currentBytes[3] = (current >> 16) & 0xFF;
            currentBytes[4] = (current >> 24) & 0xFF;
            try {
                this.#i2c.write(currentBytes);
                trace(`M5Roller485: Current set to ${current}\n`);
            } catch(e) {
                trace(`M5Roller485: Current write failed: ${e.message}\n`);
                throw e;
            }

            // Step 4: Start Motor (Output ON)
            try {
                this.#i2c.write(Uint8Array.of(I2C_OUTPUT_REG, 0x01));
                trace(`M5Roller485: Motor output ON\n`);
            } catch(e) {
                trace(`M5Roller485: Motor ON write failed: ${e.message}\n`);
                throw e;
            }

            // Step 5: Wait 2 seconds for movement to complete
            Timer.set(() => {
                try {
                    // Step 6: Stop Motor (Output OFF) to prevent heating
                    try {
                        this.#i2c.write(Uint8Array.of(I2C_OUTPUT_REG, 0x00));
                        trace(`M5Roller485: Motor output OFF\n`);
                    } catch(e) {
                        trace(`M5Roller485: Motor OFF write failed: ${e.message}\n`);
                    }
                    
                    // Turn off LED (set to black)
                    const blackLED = new Uint8Array(4);
                    blackLED[0] = I2C_RGB_REG;
                    blackLED[1] = 0; // R
                    blackLED[2] = 0; // G
                    blackLED[3] = 0; // B
                    try {
                        this.#i2c.write(blackLED);
                        trace(`M5Roller485: LED turned OFF\n`);
                    } catch(e) {
                        trace(`M5Roller485: LED OFF write failed: ${e.message}\n`);
                    }
                    
                    this.status({fill: "green", shape: "dot", text: `at ${angle}°`});
                    done();
                }
                catch (e) {
                    this.status({fill: "red", shape: "ring", text: "stop failed"});
                    done(e);
                }
            }, 2000);
        }
        catch (e) {
            this.status({fill: "red", shape: "ring", text: "control failed"});
            done(e);
        }
    }

    static type = "m5roller485-node";
}
