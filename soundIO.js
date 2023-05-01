"use strict";

class SoundEncoder extends AudioWorkletProcessor {
	static get parameterDescriptors() {
		return [
			{
				name: "baudRate",
				defaultValue: 1200,
				minValue: 0,
				automationRate: "k-rate",
			},
		];
	}

	static COMMAND_INVALID = -1;
	static COMMAND_NOP = 0;
	static COMMAND_HEADER = 1;
	static COMMAND_BLANK = 2;
	static COMMAND_BYTES = 3;

	constructor(...args) {
		super(...args);
		this.commandQueue = [];
		this.commandSequence = null;
		this.seqBaudRate = 1200;
		this.seqPos = 0;
		this.seqKind = SoundEncoder.COMMAND_NOP;
		this.seqData = null;
		this.bitStartFrame = 0;
		this.seqStatus1 = 0;
		this.seqStatus2 = 0;
		const self = this;
		this.port.onmessage = function(event) {
			const data = event.data;
			if (data.type === "send") {
				self.commandQueue.push(data);
			}
		};
	}

	startProcessingCommand(frame) {
		if (this.commandSequence === null) return;
		if (this.seqPos >= this.commandSequence.length) {
			this.commandSequence = null;
			this.seqKind = SoundEncoder.COMMAND_NOP;
			this.port.postMessage({
				"type": "done",
				"id": this.commandSequenceId,
			});
			return;
		}
		const command = this.commandSequence[this.seqPos];
		if (!command) {
			this.seqKind = SoundEncoder.COMMAND_INVALID;
			return;
		}
		// よく使うものを先に判定する
		if (command.type === "bytes") {
			this.seqKind = SoundEncoder.COMMAND_BYTES;
			this.seqData = command.data;
			this.seqStatus1 = -1; // 何ビット目か (-1:スタート 0～7:データ 8,9:ストップ)
			this.seqStatus2 = 0; // 何バイト目か
		} else if (command.type === "short_header") {
			this.seqKind = SoundEncoder.COMMAND_HEADER;
			this.seqData = null;
			this.seqStatus1 = 0; // 何ビット送信したか
			this.seqStatus2 = Math.floor(2000 * this.seqBaudRate / 1200); // 何ビット送信するか
		} else if (command.type === "long_header") {
			this.seqKind = SoundEncoder.COMMAND_HEADER;
			this.seqData = null;
			this.seqStatus1 = 0; // 何ビット送信したか
			this.seqStatus2 = Math.floor(8000 * this.seqBaudRate / 1200); // 何ビット送信するか
		} else if (command.type === "blank") {
			this.seqKind = SoundEncoder.COMMAND_BLANK;
			this.seqData = null;
			this.seqStatus1 = Math.round(sampleRate * command.length_sec); // 何フレーム送信するか
			this.seqStatus2 = frame + this.seqStatus1 - 1; // 送信を終了するフレーム
		} else {
			this.seqKind = SoundEncoder.COMMAND_INVALID;
			this.seqData = null;
			this.seqStatus1 = 0; // なし
			this.seqStatus2 = 0; // なし
		}
	}

	process(inputs, outputs, parameters) {
		if (this.commandSequence === null && this.commandQueue.length > 0){
			const commandData = this.commandQueue.shift();
			this.commandSequence = commandData.commands;
			this.commandSequenceId = commandData.id;
			this.seqBaudRate = parameters.baudRate[0];
			this.seqPos = 0;
			this.startProcessingCommand(currentFrame);
			this.bitStartFrame = currentFrame;
		}
		const framePerBit = Math.round(sampleRate / parameters.baudRate[0]);
		const output = outputs[0][0];
		for (let i = 0; i < output.length; i++) {
			const frame = currentFrame + i;
			const frameInBit = frame - this.bitStartFrame;
			let bit = -1;
			let requestNextBit = false;
			switch (this.seqKind) {
				case SoundEncoder.COMMAND_INVALID:
				default:
					this.seqPos++;
					this.startProcessingCommand(frame);
					break;
				case SoundEncoder.COMMAND_NOP:
					// 何もしない
					break;
				case SoundEncoder.COMMAND_HEADER:
					bit = 1;
					if (frameInBit >= framePerBit - 1) {
						this.seqStatus1++;
						if (this.seqStatus1 >= this.seqStatus2) {
							this.seqPos++;
							this.startProcessingCommand(frame);
						}
						requestNextBit = true;
					}
					break;
				case SoundEncoder.COMMAND_BLANK:
					if (frame >= this.seqStatus2) {
						this.seqPos++;
						this.startProcessingCommand(frame);
						requestNextBit = true;
					}
					break;
				case SoundEncoder.COMMAND_BYTES:
					if (this.seqStatus1 < 0) bit = 0;
					else if (this.seqStatus1 > 7) bit = 1;
					else bit = (this.seqData[this.seqStatus2] >> this.seqStatus1) & 1;
					if (frameInBit >= framePerBit - 1) {
						this.seqStatus1++;
						if (this.seqStatus1 > 9) {
							this.seqStatus2++;
							this.seqStatus1 = -1;
						}
						if (this.seqStatus2 >= this.seqData.length) {
							this.seqPos++;
							this.startProcessingCommand(frame);
						}
						requestNextBit = true;
					}
					break;
			}
			if (bit === 0) {
				output[i] = frameInBit >= (framePerBit >> 1) ? 1 : -1;
			} else if (bit === 1) {
				const phase = (frameInBit * 4 / framePerBit) >>> 0;
				output[i] = phase & 1 ? 1 : -1;
			} else {
				output[i] = 0;
			}
			if (requestNextBit) {
				this.bitStartFrame = frame + 1;
			}
		}
		return true;
	}
}

class SoundDecoder extends AudioWorkletProcessor {
	static get parameterDescriptors() {
		return [
			{
				name: "baudRate",
				defaultValue: 1200,
				minValue: 0,
				automationRate: "k-rate",
			},
		];
	}

	constructor(...args) {
		super(...args);
	}

	process(inputs, outputs, parameters) {
	}
}

registerProcessor("sound-encoder", SoundEncoder);
registerProcessor("sound-decoder", SoundDecoder);
