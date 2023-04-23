"use strict";

window.addEventListener("DOMContentLoaded", function() {
	const elems = {};
	document.querySelectorAll("*").forEach(function(e) {
		if (e.id) elems[e.id] = e;
	});

	const loadLocalStorage = function(key) {
		try {
			return localStorage.getItem(key);
		} catch (e) {
			return undefined;
		}
	};
	const storeLocalStorage = function(key, value) {
		try{
			localStorage.setItem(key, value);
			return true;
		} catch (e) {
			return false;
		}
	};

	const LANGUAGE_CONFIG_KEY = "language";

	{
		let lang = loadLocalStorage(LANGUAGE_CONFIG_KEY);
		if (!lang) lang = navigator.language.toLowerCase().indexOf("ja") >= 0 ? "ja" : "en";
		for (let i = 0; i < elems.languageSelect.options.length; i++) {
			if (elems.languageSelect.options[i].value === lang) {
				elems.languageSelect.selectedIndex = i;
				break;
			}
		}
	}

	const updateLanguage = function() {
		const lang = elems.languageSelect.value;
		storeLocalStorage(LANGUAGE_CONFIG_KEY, lang);
		document.body.parentNode.setAttribute("lang", lang);
		const selects = document.getElementsByTagName("select");
		for (let i = 0; i < selects.length; i++) {
			const e = selects[i];
			for (let j = 0; j < e.options.length; j++) {
				if (e.options[j].value === e.value && e.options[j].className === "lang-" + lang) {
					e.selectedIndex = j;
				}
			}
		}
	};
	elems.languageSelect.addEventListener("change", updateLanguage);
	updateLanguage();

	const updateBaudRateStatus = function() {
		if (elems.baudRateSelect.value === "custom") {
			elems.customBaudRateInput.classList.add("custom-selected");
		} else {
			elems.customBaudRateInput.classList.remove("custom-selected");
		}
	}
	elems.baudRateSelect.addEventListener("change", updateBaudRateStatus);
	updateBaudRateStatus();

	const updateSendOptionStatus = function() {
		const isXmodem = elems.sendType.value === "xmodem";
		elems.sendFileName.disabled = isXmodem;
		elems.setSendFileNameOnFileSelection.disabled = isXmodem;
		if (elems.bsaveGetAddressFromFile.checked || elems.sendType.value !== "bsave") {
			elems.bsaveStoreAddress.disabled = true;
			elems.bsaveRunAddressIsStoreAddress.disabled = true;
			elems.bsaveRunAddress.disabled = true;
		} else {
			elems.bsaveStoreAddress.disabled = false;
			elems.bsaveRunAddressIsStoreAddress.disabled = false;
			elems.bsaveRunAddress.disabled = elems.bsaveRunAddressIsStoreAddress.checked;
		}
		elems.bsaveGetAddressFromFile.disabled = elems.sendType.value !== "bsave";
	};
	elems.sendType.addEventListener("change", updateSendOptionStatus);
	elems.bsaveGetAddressFromFile.addEventListener("change", updateSendOptionStatus);
	elems.bsaveRunAddressIsStoreAddress.addEventListener("change", updateSendOptionStatus);
	updateSendOptionStatus();

	const updateDataToSendStatus = function() {
		if (elems.whatToSend.value === "file") {
			elems.dataToSendArea.classList.add("send-file-mode");
		} else {
			elems.dataToSendArea.classList.remove("send-file-mode");
		}
	};
	elems.whatToSend.addEventListener("change", updateDataToSendStatus);
	updateDataToSendStatus();

	const INPUT_DEVICE_ID_KEY = "inputDeviceId";
	const OUTPUT_DEVICE_ID_KEY = "outputDeviceId";

	let audioContext = null;
	let inputStream = null;
	let inputNode = null;
	let senderNode = null;
	let receiverNode = null;

	const updateOperationButtonStatus = function() {
		elems.connectButton.disabled = audioContext !== null;
		elems.disconnectButton.disabled = audioContext === null;
	};

	const setInputStream = function(stream) {
		let newNode = null;
		if (stream) {
			newNode = new MediaStreamAudioSourceNode(audioContext, {
				mediaStream: stream
			});
			if(receiverNode !== null) newNode.connect(receiverNode);
		}
		if (inputStream) {
			inputStream.getTracks().forEach(function(track) {
				track.stop();
			});
		}
		if (inputNode) {
			inputNode.disconnect();
		}
		inputStream = stream;
		inputNode = newNode;
	};

	const updateDeviceList = function() {
		return navigator.mediaDevices.enumerateDevices().then(function(devices) {
			if (inputStream !== null && !inputStream.active) {
				// 使用中の入力デバイスが切断された場合、最初の (既定の) デバイスを選択する
				// これをしないと、アクティブなストリームが無くなり、ラベルが得られなくなる
				for (let i = 0; i < devices.length; i++) {
					if (devices[i].kind === "audioinput") {
						return navigator.mediaDevices.getUserMedia(
							{audio: {deviceId: devices[i].deviceId }}
						).then(function(stream) {
							setInputStream(stream);
							// 選択後、リストの更新をやり直す
							return updateDeviceList();
						}, function(error) {
							console.warn(error);
						});
					}
				}
				// 入力デバイスが見つからなかったので、デバイスリストを潰す
				// これにより、出力デバイスで空のラベルが表示されるのを防ぐ
				devices = [];
			}
			const inputDeviceId = elems.inputDeviceSelect.value;
			const outputDeviceId = elems.outputDeviceSelect.value;
			while (elems.inputDeviceSelect.firstChild) {
				elems.inputDeviceSelect.removeChild(elems.inputDeviceSelect.firstChild);
			}
			while (elems.outputDeviceSelect.firstChild) {
				elems.outputDeviceSelect.removeChild(elems.outputDeviceSelect.firstChild);
			}
			let inputDeviceFound = false, outputDeviceFound = false;
			devices.forEach(function(device) {
				const option = document.createElement("option");
				option.setAttribute("value", device.deviceId);
				option.appendChild(document.createTextNode(device.label));
				if (device.kind === "audioinput") {
					elems.inputDeviceSelect.appendChild(option);
					inputDeviceFound = true;
				} else if (device.kind === "audiooutput") {
					if (!elems.outputDeviceSelect.firstChild) {
						// 最初の項目は既定のはずなので、IDは空とする
						// これをしないと、Google Chrome 112でデバイスが見つからないエラーになった
						option.setAttribute("value", "");
					}
					elems.outputDeviceSelect.appendChild(option);
					outputDeviceFound = true;
				}
			});
			if (inputDeviceFound) {
				for (let i = 0; i < elems.inputDeviceSelect.options.length; i++) {
					if (elems.inputDeviceSelect.options[i].value === inputDeviceId) {
						elems.inputDeviceSelect.selectedIndex = i;
						break;
					}
				}
			} else {
				const optionJa = document.createElement("option");
				optionJa.setAttribute("value", "");
				optionJa.setAttribute("class", "lang-ja");
				optionJa.appendChild(document.createTextNode("既定"));
				elems.inputDeviceSelect.appendChild(optionJa);
				const optionEn = document.createElement("option");
				optionEn.setAttribute("value", "");
				optionEn.setAttribute("class", "lang-en");
				optionEn.appendChild(document.createTextNode("Default"));
				elems.inputDeviceSelect.appendChild(optionEn);
			}
			if (outputDeviceFound) {
				for (let i = 0; i < elems.outputDeviceSelect.options.length; i++) {
					if (elems.outputDeviceSelect.options[i].value === outputDeviceId) {
						elems.outputDeviceSelect.selectedIndex = i;
						break;
					}
				}
			} else {
				const optionJa = document.createElement("option");
				optionJa.setAttribute("value", "");
				optionJa.setAttribute("class", "lang-ja");
				optionJa.appendChild(document.createTextNode("既定"));
				elems.outputDeviceSelect.appendChild(optionJa);
				const optionEn = document.createElement("option");
				optionEn.setAttribute("value", "");
				optionEn.setAttribute("class", "lang-en");
				optionEn.appendChild(document.createTextNode("Default"));
				elems.outputDeviceSelect.appendChild(optionEn);
			}
			if (!inputDeviceFound || !outputDeviceFound) {
				updateLanguage();
			}
			if (audioContext && audioContext.setSinkId) {
				audioContext.setSinkId(elems.outputDeviceSelect.value);
			}
		}, function(error) {
			console.warn(error);
		});
	};

	elems.inputDeviceSelect.addEventListener("change", function() {
		storeLocalStorage(INPUT_DEVICE_ID_KEY, elems.inputDeviceSelect.value);
		if (audioContext) {
			navigator.mediaDevices.getUserMedia(
				{audio: {deviceId: {exact: elems.inputDeviceSelect.value}}}
			).then(function(stream) {
				setInputStream(stream);
			}, function(error) {
				console.warn(error);
			});
		}
	});

	elems.outputDeviceSelect.addEventListener("change", function() {
		storeLocalStorage(OUTPUT_DEVICE_ID_KEY, elems.outputDeviceSelect.value);
		if (audioContext && audioContext.setSinkId) {
			audioContext.setSinkId(elems.outputDeviceSelect.value);
		}
	});

	elems.connectButton.addEventListener("click", function() {
		if (audioContext !== null) return;
		audioContext = new AudioContext();
		audioContext.audioWorklet.addModule("soundIO.js").then(function() {
			senderNode = new AudioWorkletNode(audioContext, "sound-encoder", {
				numberOfInputs: 0,
				numberOfOutputs: 1,
				outputChannelCount: [1],
			});
			senderNode.connect(audioContext.destination);
			receiverNode = new AudioWorkletNode(audioContext, "sound-decoder", {
				numberOfInputs: 1,
				numberOfOutputs: 0,
			});
			receiverNode.channelCount = 1;
			receiverNode.channelCountMode = "explicit";
			return navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
				return updateDeviceList().then(function() {
					stream.getTracks().forEach(function(track) {
						track.stop();
					});
				});
			}, function(error) {
				console.warn(error);
			}).then(function() {
				elems.inputDeviceSelect.disabled = false;
				elems.outputDeviceSelect.disabled = !audioContext.setSinkId;
				const inputDeviceId = loadLocalStorage(INPUT_DEVICE_ID_KEY);
				if (inputDeviceId) {
					for (let i = 0; i < elems.inputDeviceSelect.options.length; i++) {
						if (elems.inputDeviceSelect.options[i].value === inputDeviceId) {
							elems.inputDeviceSelect.selectedIndex = i;
							break;
						}
					}
				}
				const outputDeviceId = loadLocalStorage(OUTPUT_DEVICE_ID_KEY);
				if (outputDeviceId) {
					for (let i = 0; i < elems.outputDeviceSelect.options.length; i++) {
						if (elems.outputDeviceSelect.options[i].value === outputDeviceId) {
							elems.outputDeviceSelect.selectedIndex = i;
							break;
						}
					}
				}
				return navigator.mediaDevices.getUserMedia(
					{audio: {deviceId: elems.inputDeviceSelect.value}}
				).then(function(stream) {
					setInputStream(stream);
					navigator.mediaDevices.addEventListener("devicechange", updateDeviceList);
					updateOperationButtonStatus();
				}, function(error) {
					console.warn(error);
				});
			});
		}, function(error) {
			console.error(error);
		});
	});
	elems.disconnectButton.addEventListener("click", function() {
		if (audioContext === null) return;
		navigator.mediaDevices.removeEventListener("devicechange", updateDeviceList);
		setInputStream(null);
		audioContext.close();
		audioContext = null;
		if (senderNode) senderNode.port.close();
		senderNode = null;
		if (receiverNode) receiverNode.port.close();
		receiverNode = null;
		elems.inputDeviceSelect.disabled = true;
		elems.outputDeviceSelect.disabled = true;
		updateOperationButtonStatus();
	});
	elems.inputDeviceSelect.disabled = true;
	elems.outputDeviceSelect.disabled = true;
	updateOperationButtonStatus();
});
