import { AtokRomajiSettingGenerator } from "./atokRomajiSettingGenerator";

document.getElementById("settings")?.addEventListener("submit", function (e) {
    e.preventDefault();

    try {
        const sokuonKeys = (<HTMLInputElement>(
            document.getElementById("sokuon-keys")
        )).value;
        const hatsuonKeys = (<HTMLInputElement>(
            document.getElementById("hatsuon-keys")
        )).value;
        const romajiTable = (<HTMLTextAreaElement>(
            document.getElementById("romaji-table")
        )).value;
        const outputFormat = Array.from(
            <NodeListOf<HTMLInputElement>>(
                document.getElementsByName("output-format")
            ),
        ).filter((node) => {
            return node.checked;
        })[0].value;

        const generator = new AtokRomajiSettingGenerator();

        for (const line of romajiTable.split("\n")) {
            if (line.includes("\t")) {
                const [romaji, kana] = line.split("\t");
                generator.add(romaji, kana);
            }
        }

        for (const c of sokuonKeys) {
            generator.addSokuonCharacter(c);
        }

        for (const c of hatsuonKeys) {
            generator.addHatsuonCharacter(c);
        }

        const result =
            outputFormat === "windows"
                ? generator.generateWindows().toString("hex")
                : generator.generateMacos().toString("base64");

        (<HTMLTextAreaElement>document.getElementById("result")).value = result;
    } catch (e: any) {
        (<HTMLTextAreaElement>document.getElementById("result")).value = e;
    }
});
