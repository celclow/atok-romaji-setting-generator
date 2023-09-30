"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AtokRomajiSettingGenerator = void 0;
const buffer_1 = require("buffer");
const moji_1 = __importDefault(require("moji"));
class AtokRomajiSettingGenerator {
    constructor() {
        this.romajiTable = {};
    }
    add(romaji, kana) {
        const editedKana = (0, moji_1.default)(kana)
            .convert("HG", "KK")
            .convert("ZK", "HK")
            .toString()
            .replace("ヰ", "\u0010")
            .replace("ヱ", "\u0011")
            .replace("ヵ", "\u0012")
            .replace("ヶ", "\u0013")
            .replace("ヮ", "\u0014");
        if (this.isValidating(romaji, editedKana)) {
            this.romajiTable[romaji] = editedKana;
        }
    }
    addSokuonCharacter(s) {
        this.add(`${s}\u001f`, "っ");
    }
    addHatsuonCharacter(s) {
        this.add(`${s}\u001e`, "ん");
    }
    isValidating(romaji, kana) {
        // TODO
        return true;
    }
    generateWindows() {
        return this.generate(false);
    }
    generateMacos() {
        return this.generate(true);
    }
    generate(isMacos) {
        // ローマ字テーブルをキーでソート
        this.romajiTable = Object.fromEntries(Object.entries(this.romajiTable).sort());
        const arrayBuffer = new ArrayBuffer(16392);
        const view = new DataView(arrayBuffer);
        const size = Object.keys(this.romajiTable).length;
        let offset = 0;
        // サイズ
        view.setUint32(offset, size);
        offset += 4;
        // 不明
        view.setUint32(offset, 16777218);
        offset += 4;
        // プレフィックスカウント部
        let prefixCharCumulativeSum = 0;
        for (let c = 0x20; c <= 0x7f; c++) {
            const prefix = String.fromCharCode(c);
            const prefixCharSize = Object.keys(this.romajiTable).filter((k) => {
                return k.startsWith(prefix);
            }).length;
            view.setUint16(offset, prefixCharCumulativeSum);
            offset += 2;
            view.setUint16(offset, prefixCharSize);
            offset += 2;
            prefixCharCumulativeSum += prefixCharSize;
        }
        // コードサイズ部
        let dictCumulativeSumArray = 0;
        for (const key in this.romajiTable) {
            view.setUint16(offset, dictCumulativeSumArray);
            offset += 2;
            view.setUint8(offset, key.length);
            offset += 1;
            view.setUint8(offset, this.romajiTable[key].length);
            offset += 1;
            dictCumulativeSumArray += key.length + this.romajiTable[key].length;
        }
        // macOS用ダミー
        if (isMacos) {
            for (let i = size; i < 1000; i++) {
                offset += 2;
                offset += 1;
                offset += 1;
            }
        }
        // コード部
        for (const key in this.romajiTable) {
            for (const c of key) {
                view.setUint16(offset, c.charCodeAt(0));
                offset += 2;
            }
            for (const c of this.romajiTable[key]) {
                view.setUint16(offset, c.charCodeAt(0));
                offset += 2;
            }
        }
        if (isMacos) {
            offset = 16392;
        }
        return buffer_1.Buffer.from(arrayBuffer.slice(0, offset));
    }
    parseWindows(buffer) {
        return this.parse(buffer, false);
    }
    parseMacos(buffer) {
        return this.parse(buffer, true);
    }
    parse(buffer, isMacos) {
        const arrayBuffer = this.toArrayBuffer(buffer);
        const view = new DataView(arrayBuffer);
        let offset = 0;
        // サイズ
        const size = view.getUint32(offset);
        offset += 4;
        // 不明
        const unknown = view.getUint32(offset);
        offset += 4;
        // プレフィックスカウント部
        const prefixCharCumulativeSumArray = new Array(96); // 最後の値はsizeと一致する
        const prefixCharSizeArray = new Array(96);
        for (let i = 0; i < 96; i++) {
            prefixCharCumulativeSumArray[i] = view.getUint16(offset);
            offset += 2;
            prefixCharSizeArray[i] = view.getUint16(offset);
            offset += 2;
        }
        // コードサイズ部
        const dictCumulativeSumArray = new Array(size);
        const inCodeSizeArray = new Array(size);
        const outCodeSizeArray = new Array(size);
        for (let i = 0; i < size; i++) {
            dictCumulativeSumArray[i] = view.getUint16(offset);
            offset += 2;
            inCodeSizeArray[i] = view.getUint8(offset);
            offset += 1;
            outCodeSizeArray[i] = view.getUint8(offset);
            offset += 1;
        }
        // macOS用ダミー
        if (isMacos) {
            for (let i = size; i < 1000; i++) {
                offset += 2;
                offset += 1;
                offset += 1;
            }
        }
        // コード部
        const inCodeArray = [];
        const outCodeArray = [];
        const utf16beDecoder = new TextDecoder("UTF-16BE");
        for (let i = 0; i < size; i++) {
            inCodeArray.push(utf16beDecoder.decode(arrayBuffer.slice(offset, offset + 2 * inCodeSizeArray[i])));
            offset += 2 * inCodeSizeArray[i];
            outCodeArray.push(utf16beDecoder.decode(arrayBuffer.slice(offset, offset + 2 * outCodeSizeArray[i])));
            offset += 2 * outCodeSizeArray[i];
        }
        // 追加
        for (let i = 0; i < size; i++) {
            this.add(inCodeArray[i], outCodeArray[i]);
        }
    }
    toArrayBuffer(buffer) {
        const arrayBuffer = new ArrayBuffer(buffer.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return arrayBuffer;
    }
    toString() {
        return this.romajiTable.toString();
    }
}
exports.AtokRomajiSettingGenerator = AtokRomajiSettingGenerator;
