import * as fs from "fs";
import moji from "moji";

class AtokRomajiSettingGenerator {
    private table: { [key: string]: string } = {};

    add(romaji: string, kana: string) {
        const editedKana = moji(kana)
            .convert("HG", "KK")
            .convert("ZK", "HK")
            .toString();

        if (this.isValidating(romaji, editedKana)) {
            this.table[romaji] = editedKana;
        }
    }

    private isValidating(romaji: string, kana: string): boolean {
        // TODO
        return true;
    }

    generateWindows(): Buffer {
        return this.generate(false);
    }

    generateMacos(): Buffer {
        return this.generate(true);
    }

    private generate(isMacos: Boolean): Buffer {
        // ローマ字テーブルをキーでソート
        this.table = Object.fromEntries(Object.entries(this.table).sort());

        const arrayBuffer = new ArrayBuffer(16392);
        const view = new DataView(arrayBuffer);

        const size = Object.keys(this.table).length;

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
            const prefixCharSize = Object.keys(this.table).filter((k) => {
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
        for (const key in this.table) {
            view.setUint16(offset, dictCumulativeSumArray);
            offset += 2;
            view.setUint8(offset, key.length);
            offset += 1;
            view.setUint8(offset, this.table[key].length);
            offset += 1;
            dictCumulativeSumArray += key.length + this.table[key].length;
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
        for (const key in this.table) {
            for (const c of key) {
                view.setUint16(offset, c.charCodeAt(0));
                offset += 2;
            }
            for (const c of this.table[key]) {
                view.setUint16(offset, c.charCodeAt(0));
                offset += 2;
            }
        }

        if (isMacos) {
            offset = 16392;
        }

        return Buffer.from(arrayBuffer.slice(0, offset));
    }

    parseWindows(buffer: Buffer) {
        return this.parse(buffer, false);
    }

    parseMacos(buffer: Buffer) {
        return this.parse(buffer, true);
    }

    private parse(buffer: Buffer, isMacos: Boolean) {
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
            inCodeArray.push(
                utf16beDecoder.decode(
                    arrayBuffer.slice(offset, offset + 2 * inCodeSizeArray[i])
                )
            );
            offset += 2 * inCodeSizeArray[i];
            outCodeArray.push(
                utf16beDecoder.decode(
                    arrayBuffer.slice(offset, offset + 2 * outCodeSizeArray[i])
                )
            );
            offset += 2 * outCodeSizeArray[i];
        }

        // 追加
        for (let i = 0; i < size; i++) {
            this.add(inCodeArray[i], outCodeArray[i]);
        }
    }

    private toArrayBuffer(buffer: Buffer) {
        const arrayBuffer = new ArrayBuffer(buffer.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < buffer.length; ++i) {
            view[i] = buffer[i];
        }
        return arrayBuffer;
    }

    toString(): string {
        return this.table.toString();
    }
}

const content = fs.readFileSync("./sample/sample_macos.txt", "ascii");
const buffer = Buffer.from(content, "base64");

const gen = new AtokRomajiSettingGenerator();
gen.parseMacos(buffer);
console.log(gen.generateMacos().toString("base64"));
