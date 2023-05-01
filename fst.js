"use strict";

window.addEventListener("DOMContentLoaded", function() {
	const elems = {};
	document.querySelectorAll("*").forEach(function(e) {
		if (e.id) elems[e.id] = e;
	});
	const utf8Encoder = new TextEncoder("utf-8");

	const setNewlineToCrlf = function(str) {
		return str.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
	};
	const numberToStrWithComma = function(num) {
		let numStr = num.toString();
		let res = "";
		while (numStr.length > 3) {
			res += "," + numStr.substring(numStr.length - 3);
			numStr = numStr.substring(0, numStr.length - 3);
		}
		return numStr + res;
	};
	const inputFileNameToSendFileName = function(str) {
		const msxCharData = charConverter.toMsxChars(str);
		const msxCharData2 = [];
		for (let i = 0; i < msxCharData.length; i++) {
			if (msxCharData[i] >= 0) msxCharData2.push(msxCharData[i]);
		}
		const filteredData = charConverter.fromMsxChars(msxCharData2).toUpperCase();
		const LIMIT = 6;
		// 全体が入る場合、全体を返す
		if (filteredData.length <= LIMIT) return filteredData;
		// 拡張子を除くと入る場合、拡張子を除いた部分を返す
		const periodPos = filteredData.indexOf(".");
		if (periodPos > 0 && periodPos <= LIMIT) return filteredData.substring(0, periodPos);
		// 規定文字数で切って返す
		return filteredData.substring(0, LIMIT);
	};
	const parseAddress = function(str) {
		const strTrimmed = str.replace(/^\s+/, "").replace(/\s+$/, "");
		if (strTrimmed.substring(0, 2).toUpperCase() === "&H") {
			return parseInt(strTrimmed.substring(2), 16);
		} else if (strTrimmed.substring(0, 2).toUpperCase() === "&O") {
			return parseInt(strTrimmed.substring(2), 8);
		} else if (strTrimmed.substring(0, 2).toUpperCase() === "&B") {
			return parseInt(strTrimmed.substring(2), 2);
		} else if (strTrimmed.substring(strTrimmed.length - 1).toUpperCase() === "H") {
			return parseInt(strTrimmed.substring(0, strTrimmed.length - 1), 16);
		} else {
			return parseInt(strTrimmed);
		}
	};

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

	const selectMsgLang = function(msgs) {
		const lang = elems.languageSelect.value;
		if (lang in msgs) {
			return msgs[lang];
		} else if ("en" in msgs) {
			return msgs["en"];
		} else {
			console.warn("no specified language \"" + lang + " \" nor \"en\" found");
			console.warn(msgs);
			return "";
		}
	};

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
		if ((elems.whatToSend.value === "file" && elems.bsaveGetAddressFromFile.checked) ||
		elems.sendType.value !== "bsave") {
			elems.bsaveStoreAddress.disabled = true;
			elems.bsaveRunAddressIsStoreAddress.disabled = true;
			elems.bsaveRunAddress.disabled = true;
		} else {
			elems.bsaveStoreAddress.disabled = false;
			elems.bsaveRunAddressIsStoreAddress.disabled = false;
			elems.bsaveRunAddress.disabled = elems.bsaveRunAddressIsStoreAddress.checked;
		}
		elems.bsaveGetAddressFromFile.disabled = elems.sendType.value !== "bsave" || elems.whatToSend.value !== "file";

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
	elems.whatToSend.addEventListener("change", updateSendOptionStatus);
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

	let nextSendingCommandsId = 0;
	let sendingCommandsId = null;

	elems.connectButton.addEventListener("click", function() {
		if (audioContext !== null) return;
		audioContext = new AudioContext();
		audioContext.audioWorklet.addModule("soundIO.js").then(function() {
			senderNode = new AudioWorkletNode(audioContext, "sound-encoder", {
				numberOfInputs: 0,
				numberOfOutputs: 1,
				outputChannelCount: [1],
			});
			senderNode.port.onmessage = function(event) {
				const data = event.data;
				if (data.type === "done") {
					if (senderStatus === STATUS_SIMPLE_SENDING && data.id === sendingCommandsId) {
						senderStatus = STATUS_NONE;
						updateOperationButtonStatus();
					}
				}
			};
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

	let selectedFile = null;
	const showSelectedFile = function() {
		if (selectedFile !== null) {
			elems.selectedFileNameSpan.textContent = selectedFile.name + " (" +
				numberToStrWithComma(selectedFile.size) + " B)";
			elems.noFileSelectedMessage.style.display = "none";
		} else {
			elems.selectedFileNameSpan.textContent = "";
			elems.noFileSelectedMessage.style.display = "";
		}
	};
	elems.sendFileSelectButton.addEventListener("click", function() {
		elems.sendFileInput.click();
	});
	elems.sendFileInput.addEventListener("input", function() {
		if (elems.sendFileInput.files.length > 0) {
			selectedFile = elems.sendFileInput.files[0];
			if (elems.setSendFileNameOnFileSelection.checked) {
				elems.sendFileName.value = inputFileNameToSendFileName(selectedFile.name);
			}
		} else {
			selectedFile = null;
		}
		showSelectedFile();
	});
	elems.fileToSendDropArea.addEventListener("dragover", function(e) {
		if (e.dataTransfer.types.indexOf("Files") >= 0) {
			e.preventDefault();
			e.dataTransfer.dropEffect = "copy";
		}
	});
	elems.fileToSendDropArea.addEventListener("drop", function(e) {
		if (e.dataTransfer.files.length > 0) {
			e.preventDefault();
			selectedFile = e.dataTransfer.files[0];
			if (elems.setSendFileNameOnFileSelection.checked) {
				elems.sendFileName.value = inputFileNameToSendFileName(selectedFile.name);
				updateOperationButtonStatus();
			}
			showSelectedFile();
		}
	});

	elems.startSendButton.addEventListener("click", function() {
		if (senderStatus !== STATUS_NONE) return;
		if (senderNode === null) {
			alert(selectMsgLang({
				"ja": "接続されていません。",
				"en": "Not connected to sound devices.",
			}));
			return;
		}
		let fileNameData = null;
		if (elems.sendType.value !== "xmodem") {
			const fileNameDataRaw = charConverter.toMsxChars(sendFileName.value);
			for (let i = 0; i < fileNameDataRaw.length; i++) {
				if (fileNameDataRaw[i] < 0) {
					alert(selectMsgLang({
						"ja": "ファイル名が不正です。",
						"en": "Specified file name is invalid.",
					}));
					return;
				}
			}
			if (fileNameDataRaw.length > 6) {
				alert(selectMsgLang({
					"ja": "ファイル名が長すぎます。",
					"en": "Specified file name is too long.",
				}));
				return;
			}
			while (fileNameDataRaw.length < 6) {
				fileNameDataRaw.push(0x20);
			}
			fileNameData = new Uint8Array(fileNameDataRaw);
		}
		let filePromise;
		if (elems.whatToSend.value === "file") {
			filePromise = new Promise(function(resolve, reject){
				if (selectedFile === null) {
					reject(selectMsgLang({
						"ja": "ファイルが選択されていません。",
						"en": "No files are selected.",
					}));
				} else {
					selectedFile.arrayBuffer().then(function(data) {
						resolve(new Uint8Array(data));
					}, function(error) {
						console.warn(error);
						reject(selectMsgLang({
							"ja": "ファイルの読み込みに失敗しました。",
							"en": "Failed to load your file.",
						}));
					});
				}
			});
		} else if (elems.whatToSend.value === "text-msx") {
			const textData = charConverter.toMsxChars(setNewlineToCrlf(textToSend.value));
			filePromise = new Promise(function(resolve, reject) {
				let unusableChars = "";
				for (let i = 0; i < textData.length; i++) {
					if (textData[i] < 0) {
						// TODO: サロゲートペアの考慮
						const c = String.fromCharCode(-textData[i]);
						if (unusableChars.indexOf(c) < 0) unusableChars += c;
					}
				}
				if (unusableChars !== "") {
					const LIMIT = 10;
					if (unusableChars.length > LIMIT + 1) {
						unusableChars = unusableChars.substring(0, LIMIT) + "…";
					}
					reject(selectMsgLang({
						"ja": "以下の使えない文字が含まれています。: ",
						"en": "Your text contains these unusable characters: ",
					}) + unusableChars);
				} else {
					resolve(new Uint8Array(textData));
				}
			});
		} else if (elems.whatToSend.value === "text-utf8") {
			const textData = utf8Encoder.encode(setNewlineToCrlf(textToSend.value));
			filePromse = new Promse(function(resolve, reject) {
				resolve(textData);
			});
		} else {
			filePromse = new Promse(function(resolve, reject) {
				reject(selectMsgLang({
					"ja": "送信データの種類が不正です。",
					"en": "Invalid kind of data to send.",
				}));
			});
		}
		filePromise.then(function(dataUint8) {
			const sendType = elems.sendType.value;
			if (sendType === "xmodem") {
				throw selectMsgLang({
					"ja": "XMODEM は未実装です。",
					"en": "XMODEM is not implemented.",
				});
			} else {
				const dataToSend = [];
				dataToSend.push({"type": "long_header"});
				if (sendType === "csave") {
					dataToSend.push({
						"type": "bytes",
						"data": new Uint8Array(new Array(10).fill(0xD3)),
					});
					dataToSend.push({
						"type": "bytes",
						"data": fileNameData,
					});
					dataToSend.push({
						"type": "blank",
						"length_sec": 1.0,
					});
					dataToSend.push({"type": "short_header"});
					dataToSend.push({
						"type": "bytes",
						"data": dataUint8,
					});
					dataToSend.push({
						"type": "bytes",
						"data": new Uint8Array(new Array(7).fill(0x00)),
					});
				} else if (sendType === "save") {
					for (let i = 0; i < dataUint8.length - 1; i++) {
						if (dataUint8[i] == 0x1A) {
							throw selectMsgLang({
								"ja": "最後以外に 0x1A を含むので SAVE で送信できません。",
								"en": "SAVE cannot be used because your file contain 0x1A in the bytes except for the last byte.",
							});
						}
					}
					dataToSend.push({
						"type": "bytes",
						"data": new Uint8Array(new Array(10).fill(0xEA)),
					});
					dataToSend.push({
						"type": "bytes",
						"data": fileNameData,
					});
					dataToSend.push({
						"type": "blank",
						"length_sec": 1.0,
					});
					for (let i = 0; i < dataUint8.length; i += 256) {
						let dataBlock;
						if (i + 256 <= dataUint8.length) {
							dataBlock = new Uint8Array(dataUint8.buffer, dataUint8.byteOffset + i, 256);
						} else {
							dataBlock = new Uint8Array(new Array(256).fill(0x1A));
							dataBlock.set(dataUint8.slice(i));
						}
						dataToSend.push({"type": "short_header"});
						dataToSend.push({
							"type": "bytes",
							"data": dataBlock,
						});
					}
					if (dataUint8.length % 256 === 0 && (dataUint8.length === 0 || dataUint8[dataUint8.length - 1] !== 0x1A)) {
						dataToSend.push({"type": "short_header"});
						dataToSend.push({
							"type": "bytes",
							"data": new Uint8Array(new Array(256).fill(0x1A)),
						});
					}
				} else if (sendType === "bsave") {
					let placeAddress, runAddress, endAddress;
					let dataToSend;
					if (elems.whatToSend.value === "file" && elems.bsaveGetAddressFromFile.checked) {
						if (dataUint8.length < 7 || dataUint8[0] !== 0xFE) {
							throw selectMsgLang({
								"ja": "BSAVE ヘッダーがありません。",
								"en": "BSAVE header doesn't exist in your file.",
							});
						}
						dataToSend = new Uint8Array(dataUint8.buffer, dataUint8.byteOffset + 7, dataUint8.byteLength - 7);
						placeAddress = dataUint8[1] | (dataUint8[2] << 8);
						endAddress = dataUint8[3] | (dataUint8[4] << 8);
						runAddress = dataUint8[5] | (dataUint8[6] << 8);
					} else {
						dataToSend = dataUint8;
						placeAddress = parseAddress(elems.bsaveStoreAddress.value);
						runAddress = elems.bsaveRunAddressIsStoreAddress.checked ? placeAddress : parseAddress(elems.bsaveRunAddress.value);
						endAddress = placeAddress + dataToSend.length - 1;
					}
					if (placeAddress < 0 || 0xffff <= placeAddress ||
					runAddress < 0 || 0xffff <= runAddress ||
					endAddress < 0 || 0xffff <= endAddress) {
						throw selectMsgLang({
							"ja": "アドレスが不正です。",
							"en": "Invalid address(es) are set.",
						});
					}
					if (placeAddress + dataToSend.length - 1 !== endAddress) {
						if (((placeAddress + dataToSend.length - 1) & 0xffff) === endAddress) {
							if (!confirm(selectMsgLang({
								"ja": "アドレスがラップアラウンドします。\nこのまま送信しますか？",
								"en": "The address wrap-arounds.\nSend anyway?",
							}))) return;
						} else {
							if (!confirm(selectMsgLang({
								"ja": "最終アドレスがファイルサイズと合いません。\nこのまま送信しますか？",
								"en": "The last address doesn't match the file size.\nSend anyway?",
							}))) return;
						}
					}
					dataToSend.push({
						"type": "bytes",
						"data": new Uint8Array(new Array(10).fill(0xD0)),
					});
					dataToSend.push({
						"type": "bytes",
						"data": fileNameData,
					});
					dataToSend.push({
						"type": "blank",
						"length_sec": 1.0,
					});
					dataToSend.push({"type": "short_header"});
					dataToSend.push({
						"type": "bytes",
						"data": new Uint8Array([
							placeAddress & 0xff, (placeAddress >> 8) & 0xff,
							endAddress & 0xff, (endAddress >> 8) & 0xff,
							runAddress & 0xff, (runAddress >> 8) & 0xff,
						]),
					});
					dataToSend.push({
						"type": "bytes",
						"data": dataToSend,
					});
				}
				sendingCommandsId = nextSendingCommandsId++;
				senderNode.port.postMessage({
					"type": "send",
					"commands": dataToSend,
					"id": sendingCommandsId,
				});
				senderStatus = STATUS_SIMPLE_SENDING;
			}
			updateOperationButtonStatus();
		}).catch(function(error) {
			alert(error);
		});
	});
});
