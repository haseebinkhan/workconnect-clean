export type NIAreaOption = {
  value: string;
  label: string;
  btPrefixes: string[];
};

export const NI_LOCATION_OPTIONS: NIAreaOption[] = [
  { value: "belfast", label: "Belfast", btPrefixes: ["BT1", "BT2", "BT3", "BT4", "BT5", "BT6", "BT7", "BT8", "BT9", "BT10", "BT11", "BT12", "BT13", "BT14", "BT15", "BT16", "BT17"] },
  { value: "lisburn", label: "Lisburn", btPrefixes: ["BT27", "BT28"] },
  { value: "bangor", label: "Bangor", btPrefixes: ["BT19", "BT20"] },
  { value: "newtownards", label: "Newtownards", btPrefixes: ["BT22", "BT23"] },
  { value: "holywood", label: "Holywood", btPrefixes: ["BT18"] },
  { value: "downpatrick", label: "Downpatrick", btPrefixes: ["BT30"] },
  { value: "newcastle", label: "Newcastle", btPrefixes: ["BT33"] },
  { value: "banbridge", label: "Banbridge", btPrefixes: ["BT32"] },
  { value: "armagh", label: "Armagh", btPrefixes: ["BT60", "BT61"] },
  { value: "newry", label: "Newry", btPrefixes: ["BT34", "BT35"] },
  { value: "portadown", label: "Portadown", btPrefixes: ["BT62", "BT63"] },
  { value: "lurgan", label: "Lurgan", btPrefixes: ["BT66", "BT67"] },
  { value: "craigavon", label: "Craigavon", btPrefixes: ["BT64", "BT65"] },
  { value: "dungannon", label: "Dungannon", btPrefixes: ["BT70", "BT71"] },
  { value: "enniskillen", label: "Enniskillen", btPrefixes: ["BT74", "BT92", "BT93", "BT94"] },
  { value: "omagh", label: "Omagh", btPrefixes: ["BT78", "BT79"] },
  { value: "cookstown", label: "Cookstown", btPrefixes: ["BT80"] },
  { value: "magherafelt", label: "Magherafelt", btPrefixes: ["BT45"] },
  { value: "coleraine", label: "Coleraine", btPrefixes: ["BT51", "BT52"] },
  { value: "ballymena", label: "Ballymena", btPrefixes: ["BT42", "BT43", "BT44"] },
  { value: "antrim", label: "Antrim", btPrefixes: ["BT41"] },
  { value: "carrickfergus", label: "Carrickfergus", btPrefixes: ["BT38"] },
  { value: "newtownabbey", label: "Newtownabbey", btPrefixes: ["BT36", "BT37"] },
  { value: "larne", label: "Larne", btPrefixes: ["BT40"] },
  { value: "ballycastle", label: "Ballycastle", btPrefixes: ["BT54"] },
  { value: "londonderry", label: "Derry / Londonderry", btPrefixes: ["BT47", "BT48"] },
  { value: "limavady", label: "Limavady", btPrefixes: ["BT49"] },
  { value: "strabane", label: "Strabane", btPrefixes: ["BT82"] },
];

export const NI_AREA_VALUES = NI_LOCATION_OPTIONS.map((item) => item.value);

export function getAreaLabel(areaSlug?: string | null) {
  if (!areaSlug) return "Not specified";

  const found = NI_LOCATION_OPTIONS.find((item) => item.value === areaSlug);
  if (found) return found.label;

  return areaSlug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function getPrefixesForArea(areaSlug?: string | null) {
  return NI_LOCATION_OPTIONS.find((item) => item.value === areaSlug)?.btPrefixes || [];
}

export function normalizeBTPrefix(value?: string | null) {
  if (!value) return "";

  const cleaned = value.toUpperCase().replace(/\s+/g, "");
  const match = cleaned.match(/^BT\d{1,2}/);

  return match ? match[0] : "";
}

