import * as fs from "fs";
import * as path from "path";

const Weights: { [key: string]: string } = {
  "100": "thin",
  "200": "extralight",
  "300": "light",
  "400": "regular",
  "500": "medium",
  "600": "semibold",
  "700": "bold",
  "800": "extrabold",
  "900": "black",
};

const getDirectories = (source: string) => {
  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
};

const allDirs = getDirectories(path.join("../google-fonts/ofl"));

let fontsWithMetaData: {
  name: string;
  variants: { style: string; weight: string }[];
}[] = [];
let fontsWithoutMetaData: string[] = [];

allDirs.forEach((dirName) => {
  if (fs.existsSync(path.join("../google-fonts/ofl", dirName, "METADATA.pb"))) {
    const textContent = fs.readFileSync(
      path.join("../google-fonts/ofl", dirName, "METADATA.pb"),
      "utf-8"
    );
    let name = "";
    let nameMatch = textContent.match(/name\s*:\s*"[a-zA-Z0-9_ ]+"/);
    if (nameMatch) name = nameMatch[0].match(/(?<=")[A-Za-z0-9_ ]+(?=")/)![0];
    else throw dirName + "/METADATA.pb does not contain a name";
    let vars = textContent.match(/fonts\s*\{[^}]+\}/g);
    if (vars) {
      const variants = vars.map((variant) => {
        const styleMatch = variant.match(
          /(?<=style\s*:\s*")((normal)|(italic))(?=")/g
        );
        const weightMatch = variant.match(/(?<=weight\s*:\s*)[0-9]+(?=\s)/g);
        return {
          style: styleMatch ? styleMatch[0] : "",
          weight: weightMatch ? weightMatch[0] : "",
        };
      });
      fontsWithMetaData.push({
        name: name,
        variants: variants,
      });
    } else {
      throw dirName + "/METADATA.pb does not contain variants";
    }
  } else fontsWithoutMetaData.push(dirName);
});

let jsonFontsWithMetaData = JSON.stringify(fontsWithMetaData, undefined, 2);
let jsonFontsWithoutMetaData = JSON.stringify(
  fontsWithoutMetaData,
  undefined,
  2
);

fs.writeFileSync("generated/FontsWithMetaData.json", jsonFontsWithMetaData);
fs.writeFileSync(
  "generated/FontsWithoutMetaData.json",
  jsonFontsWithoutMetaData
);

const tjmoraGFontInterface = `export type GFontName = ${fontsWithMetaData
  .reduce(
    (acc, cur, i) =>
      acc + " '" + cur.name + "' " + (i % 5 === 1 ? "\n  " : "") + "|",
    ""
  )
  .slice(0, -1)};

${fontsWithMetaData.reduce((acc, cur) => {
  return (
    acc +
    "type VariantOf" +
    cur.name.replace(/\s/g, "_") +
    " = " +
    cur.variants.reduce(
      (acc2, cur2) =>
        acc2 +
        (Weights[cur2.weight]
          ? "'" +
            Weights[cur2.weight] +
            (cur2.style === "normal" ? "" : "-italic") +
            "'|"
          : ""),
      ""
    ) +
    cur.variants
      .reduce(
        (acc2, cur2) =>
          acc2 +
          "'" +
          cur2.weight +
          (cur2.style === "normal" ? "" : "-italic") +
          "'|",
        ""
      )
      .slice(0, -1) +
    ";\n"
  );
}, "")}

export type IMapForVariants = {
${fontsWithMetaData.reduce((acc, cur) => {
  return (
    acc +
    "  '" +
    cur.name +
    "': " +
    "VariantOf" +
    cur.name.replace(/\s/g, "_") +
    ";\n"
  );
}, "")}}
`;

fs.writeFileSync("generated/gFontInterfaces.ts", tjmoraGFontInterface);
