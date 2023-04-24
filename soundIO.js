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

	constructor(...args) {
		super(...args);
	}

	process(inputs, outputs, parameters) {
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
