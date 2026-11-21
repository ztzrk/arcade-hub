export type HairStyle =
  | "short"
  | "spiky"
  | "curly"
  | "bob"
  | "long"
  | "bun"
  | "ponytail"
  | "bald"
  | "sidepart"
  | "afro";

export type Headwear = "none" | "cap" | "beanie" | "beret" | "headband";

export type Eyewear = "none" | "round" | "square" | "sunglasses";

export type FacialHair = "none" | "mustache" | "goatee" | "beard";

export type CharacterExpression =
  | "smile"
  | "smirk"
  | "surprised"
  | "chill"
  | "wink";

export type CharacterAccessory =
  | "none"
  | "earrings"
  | "freckles"
  | "blush"
  | "scarf";

export interface TebakKarakterCharacter {
  id: string;
  name: string;
  bg: string;
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  headwear: Headwear;
  headwearColor?: string;
  eyewear: Eyewear;
  facialHair: FacialHair;
  expression: CharacterExpression;
  accessory: CharacterAccessory;
  shirtColor: string;
}

export const TEBAK_KARAKTER_ROSTER: readonly TebakKarakterCharacter[] = [
  {
    id: "adit",
    name: "Adit",
    bg: "#263830",
    skin: "#d8a57d",
    hairStyle: "short",
    hairColor: "#1f1d1c",
    headwear: "cap",
    headwearColor: "#c84b3c",
    eyewear: "none",
    facialHair: "none",
    expression: "smirk",
    accessory: "freckles",
    shirtColor: "#48634a",
  },
  {
    id: "bela",
    name: "Bela",
    bg: "#3b2c32",
    skin: "#f0c7a8",
    hairStyle: "long",
    hairColor: "#4a3222",
    headwear: "none",
    eyewear: "round",
    facialHair: "none",
    expression: "smile",
    accessory: "blush",
    shirtColor: "#c99646",
  },
  {
    id: "candra",
    name: "Candra",
    bg: "#2c313d",
    skin: "#b87f58",
    hairStyle: "bald",
    hairColor: "#1f1d1c",
    headwear: "none",
    eyewear: "round",
    facialHair: "beard",
    expression: "chill",
    accessory: "none",
    shirtColor: "#7c2d36",
  },
  {
    id: "dina",
    name: "Dina",
    bg: "#353326",
    skin: "#e5b592",
    hairStyle: "bob",
    hairColor: "#1f1d1c",
    headwear: "beret",
    headwearColor: "#b8444b",
    eyewear: "none",
    facialHair: "none",
    expression: "wink",
    accessory: "earrings",
    shirtColor: "#2e6b58",
  },
  {
    id: "eko",
    name: "Eko",
    bg: "#23363f",
    skin: "#f3cdb0",
    hairStyle: "spiky",
    hairColor: "#a84a28",
    headwear: "none",
    eyewear: "none",
    facialHair: "goatee",
    expression: "surprised",
    accessory: "freckles",
    shirtColor: "#334e70",
  },
  {
    id: "fira",
    name: "Fira",
    bg: "#3d293b",
    skin: "#dfb08c",
    hairStyle: "bun",
    hairColor: "#d9b054",
    headwear: "none",
    eyewear: "sunglasses",
    facialHair: "none",
    expression: "smirk",
    accessory: "earrings",
    shirtColor: "#753c6b",
  },
  {
    id: "gilang",
    name: "Gilang",
    bg: "#382f24",
    skin: "#9c6844",
    hairStyle: "afro",
    hairColor: "#1d1a19",
    headwear: "none",
    eyewear: "none",
    facialHair: "mustache",
    expression: "smile",
    accessory: "blush",
    shirtColor: "#b88a32",
  },
  {
    id: "hana",
    name: "Hana",
    bg: "#233936",
    skin: "#ecc09d",
    hairStyle: "ponytail",
    hairColor: "#a44a28",
    headwear: "headband",
    headwearColor: "#d4a24c",
    eyewear: "round",
    facialHair: "none",
    expression: "smile",
    accessory: "freckles",
    shirtColor: "#2d7370",
  },
  {
    id: "ivan",
    name: "Ivan",
    bg: "#2a3038",
    skin: "#e8bea0",
    hairStyle: "sidepart",
    hairColor: "#c9c9c5",
    headwear: "none",
    eyewear: "square",
    facialHair: "beard",
    expression: "chill",
    accessory: "none",
    shirtColor: "#495464",
  },
  {
    id: "jihan",
    name: "Jihan",
    bg: "#3b282b",
    skin: "#c78e66",
    hairStyle: "curly",
    hairColor: "#3c2618",
    headwear: "none",
    eyewear: "none",
    facialHair: "none",
    expression: "wink",
    accessory: "earrings",
    shirtColor: "#a64d5d",
  },
  {
    id: "kiki",
    name: "Kiki",
    bg: "#2c2b3b",
    skin: "#f2cbb0",
    hairStyle: "short",
    hairColor: "#c75d7e",
    headwear: "beanie",
    headwearColor: "#4f6d7a",
    eyewear: "square",
    facialHair: "none",
    expression: "smirk",
    accessory: "none",
    shirtColor: "#383b45",
  },
  {
    id: "lutfi",
    name: "Lutfi",
    bg: "#2b3728",
    skin: "#cf9970",
    hairStyle: "curly",
    hairColor: "#4a3222",
    headwear: "cap",
    headwearColor: "#3d6b4e",
    eyewear: "none",
    facialHair: "mustache",
    expression: "smile",
    accessory: "none",
    shirtColor: "#5c4d3c",
  },
  {
    id: "maya",
    name: "Maya",
    bg: "#282e40",
    skin: "#d6a17a",
    hairStyle: "long",
    hairColor: "#c9c9c5",
    headwear: "none",
    eyewear: "none",
    facialHair: "none",
    expression: "chill",
    accessory: "scarf",
    shirtColor: "#424f7d",
  },
  {
    id: "nando",
    name: "Nando",
    bg: "#3c2b22",
    skin: "#a8704a",
    hairStyle: "bald",
    hairColor: "#1f1d1c",
    headwear: "none",
    eyewear: "sunglasses",
    facialHair: "goatee",
    expression: "smirk",
    accessory: "none",
    shirtColor: "#9c4d2f",
  },
  {
    id: "olin",
    name: "Olin",
    bg: "#3b3226",
    skin: "#f4cfb5",
    hairStyle: "bob",
    hairColor: "#d9b054",
    headwear: "headband",
    headwearColor: "#c85a48",
    eyewear: "none",
    facialHair: "none",
    expression: "surprised",
    accessory: "blush",
    shirtColor: "#c4654b",
  },
  {
    id: "putra",
    name: "Putra",
    bg: "#323027",
    skin: "#dfb18b",
    hairStyle: "sidepart",
    hairColor: "#1f1d1c",
    headwear: "none",
    eyewear: "square",
    facialHair: "none",
    expression: "smile",
    accessory: "scarf",
    shirtColor: "#756548",
  },
  {
    id: "qori",
    name: "Qori",
    bg: "#273831",
    skin: "#915d3c",
    hairStyle: "afro",
    hairColor: "#4a3222",
    headwear: "none",
    eyewear: "round",
    facialHair: "none",
    expression: "chill",
    accessory: "earrings",
    shirtColor: "#537a62",
  },
  {
    id: "raka",
    name: "Raka",
    bg: "#242e3d",
    skin: "#c9916a",
    hairStyle: "spiky",
    hairColor: "#1f1d1c",
    headwear: "beanie",
    headwearColor: "#9c3c35",
    eyewear: "none",
    facialHair: "beard",
    expression: "wink",
    accessory: "none",
    shirtColor: "#365685",
  },
  {
    id: "sari",
    name: "Sari",
    bg: "#3a2c26",
    skin: "#e8b996",
    hairStyle: "bun",
    hairColor: "#1f1d1c",
    headwear: "none",
    eyewear: "none",
    facialHair: "none",
    expression: "smile",
    accessory: "scarf",
    shirtColor: "#a8543d",
  },
  {
    id: "tama",
    name: "Tama",
    bg: "#28353b",
    skin: "#ecc2a1",
    hairStyle: "long",
    hairColor: "#4f7da6",
    headwear: "beret",
    headwearColor: "#d4a24c",
    eyewear: "none",
    facialHair: "mustache",
    expression: "surprised",
    accessory: "none",
    shirtColor: "#5a6b3d",
  },
] as const;

export const TEBAK_KARAKTER_BY_ID = new Map<string, TebakKarakterCharacter>(
  TEBAK_KARAKTER_ROSTER.map((c) => [c.id, c])
);
