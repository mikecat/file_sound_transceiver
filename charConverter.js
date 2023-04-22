"use strict";

const charConverter = (function() {
	const charToMsxTable = [
		// 0x00
		"\x00",
		"",
		"\x02",
		"\x03",
		"\x04",
		"\x05",
		"\x06",
		"\x07",
		"\x08",
		"\x09",
		"\x0A",
		"\x0B",
		"\x0C",
		"\x0D",
		"\x0E",
		"\x0F",
		// 0x10
		"\x10",
		"\x11",
		"\x12",
		"\x13",
		"\x14",
		"\x15",
		"\x16",
		"\x17",
		"\x18",
		"\x19",
		"\x1A",
		"\x1B",
		"\x1C",
		"\x1D",
		"\x1E",
		"\x1F",
		// 0x20
		" 　",
		"!！",
		"\"”“",
		"#＃",
		"$＄",
		"%％",
		"&＆",
		"'’‘",
		"(（",
		")）",
		"*＊",
		"+＋",
		",，",
		"-－",
		".．",
		"/／\u2571",
		// 0x30
		"0０",
		"1１",
		"2２",
		"3３",
		"4４",
		"5５",
		"6６",
		"7７",
		"8８",
		"9９",
		":：",
		";；",
		"<＜",
		"=＝",
		">＞",
		"?？",
		// 0x40
		"@＠",
		"AＡ",
		"BＢ",
		"CＣ",
		"DＤ",
		"EＥ",
		"FＦ",
		"GＧ",
		"HＨ",
		"IＩ",
		"JＪ",
		"KＫ",
		"LＬ",
		"MＭ",
		"NＮ",
		"OＯ",
		// 0x50
		"PＰ",
		"QＱ",
		"RＲ",
		"SＳ",
		"TＴ",
		"UＵ",
		"VＶ",
		"WＷ",
		"XＸ",
		"YＹ",
		"ZＺ",
		"[［",
		"\\￥\u00A5\u2572",
		"]］",
		"^＾",
		"_＿",
		// 0x60
		"`‘",
		"aａ",
		"bｂ",
		"cｃ",
		"dｄ",
		"eｅ",
		"fｆ",
		"gｇ",
		"hｈ",
		"iｉ",
		"jｊ",
		"kｋ",
		"lｌ",
		"mｍ",
		"nｎ",
		"oｏ",
		// 0x70
		"pｐ",
		"qｑ",
		"rｒ",
		"ｓ",
		"tｔ",
		"uｕ",
		"vｖ",
		"wｗ",
		"xｘ",
		"yｙ",
		"zｚ",
		"｛",
		"|｜",
		"}｝",
		"~￣\uFF5E\u301C",
		"\x7F",
		// 0x80
		"♠",
		"♥",
		"♣",
		"♦",
		"○\u25EF",
		"●",
		"を",
		"ぁ",
		"ぃ",
		"ぅ",
		"ぇ",
		"ぉ",
		"ゃ",
		"ゅ",
		"ょ",
		"っ",
		// 0x90
		"",
		"あ",
		"い",
		"う",
		"え",
		"お",
		"か",
		"き",
		"く",
		"け",
		"こ",
		"さ",
		"し",
		"す",
		"せ",
		"そ",
		// 0xA0
		"",
		"。｡",
		"「｢",
		"」｣",
		"、､",
		"・･",
		"ヲｦ",
		"ァｧ",
		"ィｨ",
		"ゥｩ",
		"ェｪ",
		"ォｫ",
		"ャｬ",
		"ュｭ",
		"ョｮ",
		"ッｯ",
		// 0xB0
		"ーｰ",
		"アｱ",
		"イｲ",
		"ウｳ",
		"エｴ",
		"オｵ",
		"カｶ",
		"キｷ",
		"クｸ",
		"ケｹ",
		"コｺ",
		"サｻ",
		"シｼ",
		"スｽ",
		"セｾ",
		"ソｿ",
		// 0xC0
		"タﾀ",
		"チﾁ",
		"ツﾂ",
		"テﾃ",
		"トﾄ",
		"ナﾅ",
		"ニﾆ",
		"ヌﾇ",
		"ネﾈ",
		"ノﾉ",
		"ハﾊ",
		"ヒﾋ",
		"フﾌ",
		"ヘﾍ",
		"ホﾎ",
		"マﾏ",
		// 0xD0
		"ミﾐ",
		"ムﾑ",
		"メﾒ",
		"モﾓ",
		"ヤﾔ",
		"ユﾕ",
		"ヨﾖ",
		"ラﾗ",
		"リﾘ",
		"ルﾙ",
		"レﾚ",
		"ロﾛ",
		"ワﾜ",
		"ンﾝ",
		"゛ﾞ\u3099",
		"゜ﾟ\u309A",
		// 0xE0
		"た",
		"ち",
		"つ",
		"て",
		"と",
		"な",
		"に",
		"ぬ",
		"ね",
		"の",
		"は",
		"ひ",
		"ふ",
		"へ",
		"ほ",
		"ま",
		// 0xF0
		"み",
		"む",
		"め",
		"も",
		"や",
		"ゆ",
		"よ",
		"ら",
		"り",
		"る",
		"れ",
		"ろ",
		"わ",
		"ん",
		"",
		"", 
	];
	const charToMsxSpecialTable = [
		// 0x00
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x10
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x20
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x30
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x40
		"",
		"月",
		"火",
		"水",
		"木",
		"金",
		"土",
		"日",
		"年",
		"円",
		"時",
		"分",
		"秒",
		"百",
		"千",
		"万",
		// 0x50
		"π",
		"┴┵┶┷┸┹┺┻",
		"┬┭┮┯┰┱┲┳",
		"┤┥┦┧┨┩┪┫",
		"├┝┞┟┠┡┢┣",
		"┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋",
		"│┃",
		"─━",
		"┌┍┎┏",
		"┐┑┒┓",
		"└┕┖┗",
		"┘┙┚┛",
		"×\u2715\u2573",
		"大",
		"中",
		"小",
		// 0x60
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x70
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x80
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x90
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0xA0
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0xB0
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0xC0
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0xD0
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0xE0
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0xF0
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
	];
	const dakutenRemoveMap = {
		"が": "か", "ぎ": "き", "ぐ": "く", "げ": "け", "ご": "こ",
		"ざ": "ざ", "じ": "し", "ず": "す", "ぜ": "ぜ", "ぞ": "そ",
		"だ": "た", "ぢ": "ち", "づ": "つ", "で": "て", "ど": "と",
		"ば": "は", "び": "ひ", "ぶ": "ふ", "べ": "へ", "ぼ": "ほ",
		"ガ": "カ", "ギ": "キ", "グ": "ク", "ゲ": "ケ", "ゴ": "コ",
		"ザ": "ザ", "ジ": "シ", "ズ": "ス", "ゼ": "ゼ", "ゾ": "ソ",
		"ダ": "タ", "ヂ": "チ", "ヅ": "ツ", "デ": "テ", "ド": "ト",
		"バ": "ハ", "ビ": "ヒ", "ブ": "フ", "ベ": "ヘ", "ボ": "ホ",
	};
	const handakutenRemoveMap = {
		"ぱ": "は", "ぴ": "ひ", "ぷ": "ふ", "ぺ": "へ", "ぽ": "ほ",
		"パ": "ハ", "ピ": "ヒ", "プ": "フ", "ペ": "ヘ", "ポ": "ホ",
	};
	const charToMsxMap = {};
	const charToMsxSpecialMap = {};
	for (let i = 0; i < charToMsxTable.length; i++) {
		const chars = charToMsxTable[i];
		for (let j = 0; j < chars.length; j++) {
			charToMsxMap[chars.charAt(j)] = i;
		}
	}
	for (let i = 0; i < charToMsxSpecialTable.length; i++) {
		const chars = charToMsxSpecialTable[i];
		for (let j = 0; j < chars.length; j++) {
			charToMsxSpecialMap[chars.charAt(j)] = i;
		}
	}

	// 文字列を受け取り、MSXのキャラクターコードで表現した配列を返す
	// 変換できない文字は、もとの文字の文字コードを符号反転して入れる
	const toMsxChars = function(str) {
		const result = [];
		for (let i = 0; i < str.length; i++) {
			const c = str.charAt(i);
			if (c in charToMsxMap) {
				result.push(charToMsxMap[c]);
			} else if (c in charToMsxSpecialMap) {
				result.push(0x01);
				result.push(charToMsxSpecialMap[c]);
			} else if (c in dakutenRemoveMap) {
				result.push(charToMsxMap[dakutenRemoveMap[c]]);
				result.push(charToMsxMap["゛"]);
			} else if (c in handakutenRemoveMap) {
				result.push(charToMsxMap[handakutenRemoveMap[c]]);
				result.push(charToMsxMap["゜"]);
			} else {
				result.push(-str.charCodeAt(i));
			}
		}
		return result;
	};

	// MSXのキャラクターコードの配列を受け取り、文字列にして返す
	const fromMsxChars = function(arr) {
		let result = "";
		for (let i = 0; i < arr.length; i++) {
			if (arr[i] === 0x01 && i + 1 < arr.length) {
				if (0 <= arr[i + 1] && arr[i + 1] < charToMsxSpecialTable.length &&
				charToMsxSpecialTable[arr[i + 1]].length > 0) {
					result += charToMsxSpecialTable[arr[i + 1]].charAt(0);
					i++;
					continue;
				}
			}
			if (0 <= arr[i] && arr[i] < charToMsxTable.length &&
			charToMsxTable[arr[i]].length > 0) {
				result += charToMsxTable[arr[i]].charAt(0);
			}
		}
		return result;
	};

	return {
		"toMsxChars": toMsxChars,
		"fromMsxChars": fromMsxChars,
	};
})();
