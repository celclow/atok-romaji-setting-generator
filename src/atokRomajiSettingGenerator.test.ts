import * as fs from "fs";
import { AtokRomajiSettingGenerator } from "./atokRomajiSettingGenerator";

test("Input/output matching test using macOS sample", () => {
    const inputData = fs.readFileSync("./sample/sample_macos.txt", "ascii");
    const buffer = Buffer.from(inputData, "base64");

    const generator = new AtokRomajiSettingGenerator();
    generator.parseMacos(buffer);
    const result = generator.generateMacos().toString("base64");

    expect(result).toEqual(inputData);
});

test("Input/output matching test using Windows sample", () => {
    const inputData = fs.readFileSync("./sample/sample_windows.txt", "ascii");
    const buffer = Buffer.from(inputData, "hex");

    const generator = new AtokRomajiSettingGenerator();
    generator.parseWindows(buffer);
    const result = generator.generateWindows().toString("hex");

    expect(result).toEqual(inputData);
});
