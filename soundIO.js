"use strict";

class SoundEncoder extends AudioWorkletProcessor {
	constructor(...args) {
		super(...args);
	}

	process(inputs, outputs, parameters) {
	}
}

class SoundDecoder extends AudioWorkletProcessor {
	constructor(...args) {
		super(...args);
	}

	process(inputs, outputs, parameters) {
	}
}

registerProcessor("sound-encoder", SoundEncoder);
registerProcessor("sound-decoder", SoundDecoder);
