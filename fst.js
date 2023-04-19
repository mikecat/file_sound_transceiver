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
});
