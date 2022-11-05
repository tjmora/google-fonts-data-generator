import * as fs from "fs";
import * as path from "path";

type Tag =
  | "wght"
  | "ital"
  | "CASL"
  | "CRSV"
  | "EDPT"
  | "EHLT"
  | "GRAD"
  | "MONO"
  | "opsz"
  | "slnt"
  | "SOFT"
  | "wdth"
  | "WONK"
  | "XTRA"
  | "YOPQ"
  | "YTAS"
  | "YTDE"
  | "YTFI"
  | "YTLC"
  | "YTUC";

interface VariantI {
  weight: number;
  style: string;
}

interface AxisI {
  min: number;
  max: number;
}

interface FontI {
  name: string;
  variants: VariantI[];
  hasNormal: boolean;
  hasItalic: boolean;
  axes: {
    [key in Tag]?: AxisI;
  };
}

const Weights: { [key: number]: string } = {
  100: "thin",
  200: "extralight",
  300: "light",
  400: "regular",
  500: "medium",
  600: "semibold",
  700: "bold",
  800: "extrabold",
  900: "black",
};

function getDirectories(source: string): [string, string][] {
  return fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => [source, dirent.name]);
}

function hasWeight(font: FontI, weight: number): boolean {
  let result = false;
  font.variants.forEach((variant) => {
    if (variant.weight === weight) result = true;
  });
  if (!result) {
    if (font.axes["wght"]) {
      if (weight >= font.axes["wght"].min && weight <= font.axes["wght"].max)
        result = true;
    }
  }
  return result;
}

function getDefaultNumericWeights(font: FontI): number[] {
  let result = font.variants.filter(v => v.style === "normal").map((variant) => variant.weight);
  result.sort((a, b) => a - b);
  return result;
}

function generateSemanticWeights(font: FontI): string[] {
  let result: string[] = [];
  for (let i = 1, weight: number; i < 10; i++) {
    weight = i * 100;
    if (hasWeight(font, weight)) result.push(Weights[weight]);
  }
  return result;
}

function generateDefaultNumericWeightTypes(font: FontI): string {
  return getDefaultNumericWeights(font).reduce((acc, cur) => {
    return acc + cur + "|";
  }, "");
}

function generateSemanticWeightTypes(font: FontI): string {
  return generateSemanticWeights(font).reduce((acc, cur) => {
    return acc + "'" + cur + "'|";
  }, "");
}

function generateWeightRangeType(font: FontI): string {
  if (font.axes["wght"])
    return `StringIntRange<${Math.floor(font.axes["wght"].min/10)},${Math.floor(font.axes["wght"].max/10)},1>|`
  else
    return "";
}

function generateFontStyleType(font: FontI): string {
  let result = "";
  if (font.hasNormal) result += "'normal'|";
  if (font.hasItalic) result += "'italic'|";
  return result;
}

function generateFontVariationType(font: FontI): string {
  let result = "";
  Object.keys(font.axes).forEach(key => {
    let min = font.axes[key as Tag]!.min;
    let max = font.axes[key as Tag]!.max;
    if (Math.floor(min) === Math.floor(max))
      console.log(`Warning: The Min and Max for the ${key} axis of font ${font.name} floors to the same number.`);
    switch(key) {
      case "wght":
      case "ital":
        //skip
        break;
      case "CASL":
      case "CRSV":
      case "FILL":
      case "MONO":
      case "opsz":
      case "SOFT":
      case "wdth":
      case "WONK":
        result += `Font_${key}_t<${Math.floor(min)},${Math.floor(max)}>|`;
        break;
      case "EDPT":
      case "EHLT":
      case "YTAS":
      case "YTLC":
      case "YTUC":
        if (min % 100 === 0 && max % 100 === 0)
          result += `Font_${key}_t<${Math.floor(min / 100)},${Math.floor(max / 100)},2>|`;
        else
          result += `Font_${key}_t<${min},${max}>|`;
        break;
      case "GRAD":
      case "XOPQ":
      case "XTRA":
      case "YOPQ":
      case "YTDE":
      case "YTFI":
        if (min % 100 === 0 && max % 100 === 0)
          result += `Font_${key}_t<${min >= 0 ? Math.floor(min / 100) : `[${Math.abs(Math.floor(min / 100))}]`},${max >= 0 ? Math.floor(max / 100) : `[${Math.abs(Math.floor(max / 100))}]`},2>|`;
        else
          result += `Font_${key}_t<${min >= 0 ? Math.floor(min) : `[${Math.abs(Math.floor(min))}]`},${max >= 0 ? Math.floor(max) : `[${Math.abs(Math.floor(max))}]`}>|`;
        break;
      case "slnt":
        result += `Font_${key}_t<${min >= 0 ? Math.floor(min) : `[${Math.abs(Math.floor(min))}]`},${max >= 0 ? Math.floor(max) : `[${Math.abs(Math.floor(max))}]`}>|`;
        break;
      default:
        console.log(`The font ${font.name} has an undocumented variation axis called ${key}. This axis is ignored.`);
    }
  })
  return result;
}

let allFontDirs = getDirectories("../google-fonts/ofl");
allFontDirs.push(...getDirectories("../google-fonts/ufl"));
allFontDirs.push(...getDirectories("missing-fonts"));

let fontsWithMetaData: FontI[] = [];

allFontDirs.forEach(([parentDir, fontDir]) => {
  if (!fs.existsSync(path.join(parentDir, fontDir, "METADATA.pb"))) {
    console.log(`The font ${parentDir}/${fontDir} has no METADATA file. The font is ignored.`);
  } else {
    const textContent = fs.readFileSync(
      path.join(parentDir, fontDir, "METADATA.pb"),
      "utf-8"
    );

    // Get the name of the font
    let name = "";
    let nameMatch = textContent.match(/name\s*:\s*"[a-zA-Z0-9_ ]+"/);
    if (nameMatch) name = nameMatch[0].match(/(?<=")[A-Za-z0-9_ ]+(?=")/)![0];
    else
      throw parentDir + "/" + fontDir + "/METADATA.pb does not contain a name";

    // Get the non-axis variants
    const variantMatches = textContent.match(/fonts\s*\{[^}]+\}/g);
    let variants: VariantI[];
    let hasNormal = false;
    let hasItalic = false;
    if (variantMatches) {
      variants = variantMatches.map((variantMatch) => {
        const styleMatch = variantMatch.match(
          /(?<=style\s*:\s*")((normal)|(italic))(?=")/g
        );
        const weightMatch = variantMatch.match(
          /(?<=weight\s*:\s*)[0-9]+(?=\s)/g
        );
        if (styleMatch && styleMatch[0] === "normal") hasNormal = true;
        if (styleMatch && styleMatch[0] === "italic") hasItalic = true;
        return {
          style: styleMatch ? styleMatch[0] : "",
          weight: weightMatch ? parseInt(weightMatch[0]) : -1,
        };
      });
    } else
      throw (
        parentDir +
        "/" +
        fontDir +
        "METADATA.pb does not contain any default variant"
      );

    // Get the axes
    let axisMatches = textContent.match(/axes\s*\{[^}]+\}/g);
    let axes: { [key in Tag]?: AxisI } = {};
    if (axisMatches) {
      axisMatches.forEach((axisMatch) => {
        const tagMatch = axisMatch.match(/(?<=tag\s*:\s*")[a-zA-Z]+(?=")/g);
        const minMatch = axisMatch.match(
          /(?<=min_value\s*:\s*)-?[0-9]+(\.[0-9]+)?(?=\s)/g
        );
        const maxMatch = axisMatch.match(
          /(?<=max_value\s*:\s*)-?[0-9]+(\.[0-9]+)?(?=\s)/g
        );
        if (tagMatch && minMatch && maxMatch) {
          axes[tagMatch[0] as Tag] = {
            min: parseFloat(minMatch[0]),
            max: parseFloat(maxMatch[0]),
          };
        }
      });
    }

    fontsWithMetaData.push({
      name: name,
      variants: variants,
      hasNormal: hasNormal,
      hasItalic: hasItalic,
      axes: axes
    });
  }
});

let jsonFontsWithMetaData = JSON.stringify(fontsWithMetaData, undefined, 2);
fs.writeFileSync("generated/FontsWithMetaData.json", jsonFontsWithMetaData);

const tjmoraGFontInterface = `// This file is generated by github.com/tjmora/google-fonts-data-generator

import { StringIntRange, StringFloatRange } from "@tjmora/ts-range-types";

type Font_CASL_t<MIN extends number, MAX extends number> = ${"`CASL=${StringFloatRange<MIN, MAX, 2>}`"};
type Font_CRSV_t<MIN extends number, MAX extends number> = ${"`CRSV=${StringFloatRange<MIN, MAX, 1>}`"};
type Font_EDPT_t<MIN extends number, MAX extends number, D extends 0 | 1 | 2 = 0> = ${"`EDPT=${StringIntRange<MIN, MAX, D>}`"};
type Font_EHLT_t<MIN extends number, MAX extends number, D extends 0 | 1 | 2 = 0> = ${"`EHLT=${StringIntRange<MIN, MAX, D>}`"};
type Font_FILL_t<MIN extends number, MAX extends number> = ${"`FILL=${StringFloatRange<MIN, MAX, 2>}`"};
type Font_GRAD_t<MIN extends number | [number], MAX extends number | [number], D extends 0 | 1 | 2 = 0> = ${"`GRAD=${StringIntRange<MIN, MAX, D>}`"};
type Font_MONO_t<MIN extends number, MAX extends number> = ${"`MONO=${StringFloatRange<MIN, MAX, 2>}`"};
type Font_opsz_t<MIN extends number, MAX extends number> = ${"`opsz=${StringFloatRange<MIN, MAX, 1>}`"};
type Font_slnt_t<MIN extends number | [number], MAX extends number | [number]> = ${"`slnt=${StringIntRange<MIN, MAX>}`"};
type Font_SOFT_t<MIN extends number, MAX extends number> = ${"`SOFT=${StringFloatRange<MIN, MAX, 1>}`"};
type Font_wdth_t<MIN extends number, MAX extends number> = ${"`wdth=${StringFloatRange<MIN, MAX, 1>}`"};
type Font_WONK_t<MIN extends number, MAX extends number> = ${"`WONK=${StringIntRange<MIN, MAX>}`"};
type Font_XOPQ_t<MIN extends number | [number], MAX extends number | [number], D extends 0 | 1 | 2 = 0> = ${"`XOPQ=${StringIntRange<MIN, MAX, D>}`"};
type Font_XTRA_t<MIN extends number | [number], MAX extends number | [number], D extends 0 | 1 | 2 = 0> = ${"`XTRA=${StringIntRange<MIN, MAX, D>}`"};
type Font_YOPQ_t<MIN extends number | [number], MAX extends number | [number], D extends 0 | 1 | 2 = 0> = ${"`YOPQ=${StringIntRange<MIN, MAX, D>}`"};
type Font_YTAS_t<MIN extends number, MAX extends number, D extends 0 | 1 | 2 = 0> = ${"`YTAS=${StringIntRange<MIN, MAX, D>}`"};
type Font_YTDE_t<MIN extends number | [number], MAX extends number | [number], D extends 0 | 1 | 2 = 0> = ${"`YTDE=${StringIntRange<MIN, MAX, D>}`"};
type Font_YTFI_t<MIN extends number | [number], MAX extends number | [number], D extends 0 | 1 | 2 = 0> = ${"`YTFI=${StringIntRange<MIN, MAX, D>}`"};
type Font_YTLC_t<MIN extends number, MAX extends number, D extends 0 | 1 | 2 = 0> = ${"`YTLC=${StringIntRange<MIN, MAX, D>}`"};
type Font_YTUC_t<MIN extends number, MAX extends number, D extends 0 | 1 | 2 = 0> = ${"`YTUC=${StringIntRange<MIN, MAX, D>}`"};

export type GFontName = ${fontsWithMetaData
  .reduce(
    (acc, cur, i) =>
      acc + (i % 5 === 0 ? "\n  " : "") +"|'" + cur.name + "'",
    ""
  )};

${
  fontsWithMetaData.reduce((acc, cur) => {
    return (
      acc +
      "type WeightOf_" +
      cur.name.replace(/\s/g, "_") +
      " = " +
      (
        generateSemanticWeightTypes(cur) +
        generateDefaultNumericWeightTypes(cur) +
        generateWeightRangeType(cur)
      )
      .slice(0, -1) +
      ";\n"
    ) 
  }, "")
}
${
  fontsWithMetaData.reduce((acc, cur) => {
    return (
      acc +
      "type VariationOf_" +
      cur.name.replace(/\s/g, "_") +
      " = " +
      (
        generateFontStyleType(cur) +
        generateFontVariationType(cur)
      )
      .slice(0, -1) +
      ";\n"
    ) 
  }, "")
}
export type IMapForWeights = {
${fontsWithMetaData.reduce((acc, cur) => {
    return (
      acc +
      "  '" +
      cur.name +
      "': WeightOf_" +
      cur.name.replace(/\s/g, "_") +
      ";\n"
    );
  }, "")}}

export type IMapForVariations = {
${fontsWithMetaData.reduce((acc, cur) => {
    return (
      acc +
      "  '" +
      cur.name +
      "': VariationOf_" +
      cur.name.replace(/\s/g, "_") +
      ";\n"
    );
  }, "")}}
`;

fs.writeFileSync("generated/gFontInterfaces.ts", tjmoraGFontInterface);