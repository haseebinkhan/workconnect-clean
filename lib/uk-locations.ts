export const UK_LOCATION_DATA = {
  "Northern Ireland": {
    cities: {
      Belfast: [
        "BT1",
        "BT2",
        "BT3",
        "BT4",
        "BT5",
        "BT6",
        "BT7",
        "BT8",
        "BT9",
        "BT10",
        "BT11",
        "BT12",
        "BT13",
        "BT14",
        "BT15",
        "BT16",
        "BT17",
      ],
      "Derry/Londonderry": ["BT47", "BT48"],
      Newry: ["BT34", "BT35"],
      Lisburn: ["BT27", "BT28"],
      Newtownabbey: ["BT36", "BT37"],
      Carrickfergus: ["BT38"],
      Bangor: ["BT19", "BT20"],
      Antrim: ["BT41"],
      Ballymena: ["BT42", "BT43", "BT44"],
      Coleraine: ["BT51", "BT52"],
      Omagh: ["BT78", "BT79"],
      Craigavon: ["BT62", "BT63", "BT64", "BT65", "BT66", "BT67"],
      Portadown: ["BT62", "BT63"],
      Lurgan: ["BT66", "BT67"],
      Armagh: ["BT60", "BT61"],
      Enniskillen: ["BT74", "BT92", "BT93", "BT94"],
      Banbridge: ["BT32"],
      Downpatrick: ["BT30"],
      Newtownards: ["BT22", "BT23"],
      Larne: ["BT40"],
      Cookstown: ["BT80"],
      Dungannon: ["BT70", "BT71"],
      Strabane: ["BT82"],
      Limavady: ["BT49"],
      Magherafelt: ["BT45"],
    },
  },

  England: {
    cities: {
      London: ["E", "EC", "N", "NW", "SE", "SW", "W", "WC"],
      Manchester: ["M"],
      Birmingham: ["B"],
      Liverpool: ["L"],
      Leeds: ["LS"],
      Sheffield: ["S"],
      Bristol: ["BS"],
      Newcastle: ["NE"],
      Leicester: ["LE"],
      Nottingham: ["NG"],
      Oxford: ["OX"],
      Cambridge: ["CB"],
      Coventry: ["CV"],
      Bradford: ["BD"],
      York: ["YO"],
      Sunderland: ["SR"],
    },
  },

  Scotland: {
    cities: {
      Glasgow: ["G"],
      Edinburgh: ["EH"],
      Aberdeen: ["AB"],
      Dundee: ["DD"],
      Inverness: ["IV"],
      Stirling: ["FK"],
      Perth: ["PH"],
      Paisley: ["PA"],
      Ayr: ["KA"],
      Falkirk: ["FK"],
    },
  },

  Wales: {
    cities: {
      Cardiff: ["CF"],
      Swansea: ["SA"],
      Newport: ["NP"],
      Wrexham: ["LL", "SY"],
      Bangor: ["LL"],
      Merthyr: ["CF"],
      Bridgend: ["CF"],
      Llanelli: ["SA"],
      Carmarthen: ["SA"],
    },
  },
} as const;

export type UKRegion = keyof typeof UK_LOCATION_DATA;

export function getRegions(): UKRegion[] {
  return Object.keys(UK_LOCATION_DATA) as UKRegion[];
}

export function getCities(region: string): string[] {
  if (!region || !(region in UK_LOCATION_DATA)) return [];
  return Object.keys(
    UK_LOCATION_DATA[region as UKRegion].cities
  ).sort((a, b) => a.localeCompare(b));
}

export function getPostcodePrefixes(region: string, city: string): string[] {
  if (!region || !city) return [];
  if (!(region in UK_LOCATION_DATA)) return [];

  const regionData = UK_LOCATION_DATA[region as UKRegion];
  const prefixes =
    regionData.cities[city as keyof typeof regionData.cities] || [];

  return [...prefixes].sort((a, b) => a.localeCompare(b));
}

export function isValidUKFullPostcode(value: string): boolean {
  const text = value.trim().toUpperCase();
  if (!text) return true;
  return /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(text);
}