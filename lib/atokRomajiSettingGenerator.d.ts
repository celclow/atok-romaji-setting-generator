/// <reference types="node" />
import { Buffer } from "buffer";
export declare class AtokRomajiSettingGenerator {
    private romajiTable;
    add(romaji: string, kana: string): void;
    addSokuonCharacter(s: String): void;
    addHatsuonCharacter(s: String): void;
    private isValidating;
    generateWindows(): Buffer;
    generateMacos(): Buffer;
    private generate;
    parseWindows(buffer: Buffer): void;
    parseMacos(buffer: Buffer): void;
    private parse;
    private toArrayBuffer;
    toString(): string;
}
