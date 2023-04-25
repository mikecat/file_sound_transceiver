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

	const STATUS_SENDING_FLAG = 0x10000;
	const STATUS_RECEIVING_FLAG = 0x20000;

	const STATUS_NONE = 0;
	const STATUS_SIMPLE_SENDING = STATUS_SENDING_FLAG | 0;
	const STATUS_XMODEM_SENDING = STATUS_SENDING_FLAG | 1;
	const STATUS_XMODEM_SEND_RECEIVING = STATUS_SENDING_FLAG | 2;
	const STATUS_XMODEM_SEND_CANCELING = STATUS_SENDING_FLAG | 3;
	const STATUS_SIMPLE_RECEIVING = STATUS_RECEIVING_FLAG | 0;
	const STATUS_XMODEM_RECEIVE_SENDING = STATUS_RECEIVING_FLAG | 1;
	const STATUS_XMODEM_RECEIVE_CANCELING = STATUS_RECEIVING_FLAG | 2;

	let senderStatus = STATUS_NONE;
	let receiverStatus = STATUS_NONE;
	let xmodemCancelRequested = false;

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

		if (senderStatus !== STATUS_NONE) {
			elems.sendType.disabled = true;
			elems.sendFileName.disabled = true;
			elems.setSendFileNameOnFileSelection.disabled = true;
			bsaveGetAddressFromFile.disabled = true;
			elems.bsaveStoreAddress.disabled = true;
			elems.bsaveRunAddressIsStoreAddress.disabled = true;
			elems.bsaveRunAddress.disabled = true;
			elems.whatToSend.disabled = true;
			elems.sendFileSelectButton.disabled = true;
			elems.textToSend.disabled = true;
		} else {
			elems.sendType.disabled = false;
			elems.whatToSend.disabled = false;
			elems.sendFileSelectButton.disabled = false;
			elems.textToSend.disabled = false;
		}
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
		elems.baudRateSelect.disabled = false;
		elems.customBaudRateInput.disabled = false;
		elems.useCrcForXmodemRecelve.disabled = false;
		if (audioContext === null) {
			elems.inputDeviceSelect.disabled = true;
			elems.outputDeviceSelect.disabled = true;
			elems.startSendButton.disabled = true;
			elems.cancelSendButton.disabled = true;
			elems.startXmodemReceiveButton.disabled = true;
			elems.cancelReceiveButton.disabled = true;
		} else {
			elems.inputDeviceSelect.disabled = false;
			elems.outputDeviceSelect.disabled = !audioContext.setSinkId;
			if (senderStatus !== STATUS_NONE) {
				elems.outputDeviceSelect.disabled = true;
				elems.baudRateSelect.disabled = true;
				elems.customBaudRateInput.disabled = true;
				elems.useCrcForXmodemRecelve.disabled = true;
				elems.startSendButton.disabled = true;
				elems.cancelSendButton.disabled = xmodemCancelRequested;
			} else {
				elems.startSendButton.disabled = false;
				elems.cancelSendButton.disabled = true;
			}
			if (receiverStatus !== STATUS_NONE) {
				elems.inputDeviceSelect.disabled = true;
				elems.baudRateSelect.disabled = true;
				elems.customBaudRateInput.disabled = true;
				elems.useCrcForXmodemRecelve.disabled = true;
				elems.startXmodemReceiveButton.disabled = true;
				elems.cancelReceiveButton.disabled = xmodemCancelRequested;
			} else {
				elems.startXmodemReceiveButton.disabled = senderStatus !== STATUS_NONE;
				elems.cancelReceiveButton.disabled = true;
			}
		}
		updateSendOptionStatus();
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

	const updateBaudRate = function() {
		const valueStr = elems.baudRateSelect.value === "custom" ? elems.customBaudRateInput.value : elems.baudRateSelect.value;
		const value = parseFloat(valueStr);
		if (!isNaN(value) && value > 0) {
			if (senderNode) {
				senderNode.parameters.get("baudRate").value = value;
			}
			if (receiverNode) {
				receiverNode.parameters.get("baudRate").value = value;
			}
		}
	};
	elems.baudRateSelect.addEventListener("change", updateBaudRate);
	elems.customBaudRateInput.addEventListener("input", updateBaudRate);

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
			updateBaudRate();
			return navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
				return updateDeviceList().then(function() {
					stream.getTracks().forEach(function(track) {
						track.stop();
					});
				});
			}, function(error) {
				console.warn(error);
			}).then(function() {
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
		senderStatus = STATUS_NONE;
		receiverStatus = STATUS_NONE;
		xmodemCancelRequested = false;
		updateOperationButtonStatus();
	});
	updateOperationButtonStatus();

	elems.startSendButton.addEventListener("click", function() {
		senderStatus = STATUS_SIMPLE_SENDING;
		updateOperationButtonStatus();
	});
});
