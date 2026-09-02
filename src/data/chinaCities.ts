// Chinese cities the user can pick from in the aid directory.
// Kept small and mostly mainland — municipalities, provincial capitals,
// larger prefecture-level cities. `pinyin` (full + initials) drives search.

export interface ChinaCity {
  name: string;      // 中文
  nameEn: string;    // English
  pinyin: string;    // full pinyin, e.g. "chongqing"
  initial: string;   // pinyin initials, e.g. "cq"
}

export const CHINA_CITIES: ChinaCity[] = [
  // Municipalities
  { name: "北京", nameEn: "Beijing",   pinyin: "beijing",   initial: "bj" },
  { name: "上海", nameEn: "Shanghai",  pinyin: "shanghai",  initial: "sh" },
  { name: "天津", nameEn: "Tianjin",   pinyin: "tianjin",   initial: "tj" },
  { name: "重庆", nameEn: "Chongqing", pinyin: "chongqing", initial: "cq" },

  // Provincial capitals + major cities
  { name: "广州", nameEn: "Guangzhou",   pinyin: "guangzhou",   initial: "gz" },
  { name: "深圳", nameEn: "Shenzhen",    pinyin: "shenzhen",    initial: "sz" },
  { name: "杭州", nameEn: "Hangzhou",    pinyin: "hangzhou",    initial: "hz" },
  { name: "南京", nameEn: "Nanjing",     pinyin: "nanjing",     initial: "nj" },
  { name: "苏州", nameEn: "Suzhou",      pinyin: "suzhou",      initial: "sz" },
  { name: "武汉", nameEn: "Wuhan",       pinyin: "wuhan",       initial: "wh" },
  { name: "成都", nameEn: "Chengdu",     pinyin: "chengdu",     initial: "cd" },
  { name: "西安", nameEn: "Xi'an",       pinyin: "xian",        initial: "xa" },
  { name: "长沙", nameEn: "Changsha",    pinyin: "changsha",    initial: "cs" },
  { name: "郑州", nameEn: "Zhengzhou",   pinyin: "zhengzhou",   initial: "zz" },
  { name: "青岛", nameEn: "Qingdao",     pinyin: "qingdao",     initial: "qd" },
  { name: "济南", nameEn: "Jinan",       pinyin: "jinan",       initial: "jn" },
  { name: "沈阳", nameEn: "Shenyang",    pinyin: "shenyang",    initial: "sy" },
  { name: "大连", nameEn: "Dalian",      pinyin: "dalian",      initial: "dl" },
  { name: "哈尔滨", nameEn: "Harbin",    pinyin: "haerbin",     initial: "hrb" },
  { name: "长春", nameEn: "Changchun",   pinyin: "changchun",   initial: "cc" },
  { name: "石家庄", nameEn: "Shijiazhuang", pinyin: "shijiazhuang", initial: "sjz" },
  { name: "太原", nameEn: "Taiyuan",     pinyin: "taiyuan",     initial: "ty" },
  { name: "呼和浩特", nameEn: "Hohhot",  pinyin: "huhehaote",   initial: "hhht" },
  { name: "合肥", nameEn: "Hefei",       pinyin: "hefei",       initial: "hf" },
  { name: "南昌", nameEn: "Nanchang",    pinyin: "nanchang",    initial: "nc" },
  { name: "福州", nameEn: "Fuzhou",      pinyin: "fuzhou",      initial: "fz" },
  { name: "厦门", nameEn: "Xiamen",      pinyin: "xiamen",      initial: "xm" },
  { name: "南宁", nameEn: "Nanning",     pinyin: "nanning",     initial: "nn" },
  { name: "海口", nameEn: "Haikou",      pinyin: "haikou",      initial: "hk" },
  { name: "三亚", nameEn: "Sanya",       pinyin: "sanya",       initial: "sy" },
  { name: "贵阳", nameEn: "Guiyang",     pinyin: "guiyang",     initial: "gy" },
  { name: "昆明", nameEn: "Kunming",     pinyin: "kunming",     initial: "km" },
  { name: "拉萨", nameEn: "Lhasa",       pinyin: "lasa",        initial: "ls" },
  { name: "兰州", nameEn: "Lanzhou",     pinyin: "lanzhou",     initial: "lz" },
  { name: "西宁", nameEn: "Xining",      pinyin: "xining",      initial: "xn" },
  { name: "银川", nameEn: "Yinchuan",    pinyin: "yinchuan",    initial: "yc" },
  { name: "乌鲁木齐", nameEn: "Urumqi",  pinyin: "wulumuqi",    initial: "wlmq" },
  { name: "宁波", nameEn: "Ningbo",      pinyin: "ningbo",      initial: "nb" },
  { name: "温州", nameEn: "Wenzhou",     pinyin: "wenzhou",     initial: "wz" },
  { name: "无锡", nameEn: "Wuxi",        pinyin: "wuxi",        initial: "wx" },
  { name: "东莞", nameEn: "Dongguan",    pinyin: "dongguan",    initial: "dg" },
  { name: "佛山", nameEn: "Foshan",      pinyin: "foshan",      initial: "fs" },
  { name: "珠海", nameEn: "Zhuhai",      pinyin: "zhuhai",      initial: "zh" },
  { name: "泉州", nameEn: "Quanzhou",    pinyin: "quanzhou",    initial: "qz" },
  { name: "烟台", nameEn: "Yantai",      pinyin: "yantai",      initial: "yt" },
  { name: "唐山", nameEn: "Tangshan",    pinyin: "tangshan",    initial: "ts" },
  { name: "洛阳", nameEn: "Luoyang",     pinyin: "luoyang",     initial: "ly" },
  { name: "徐州", nameEn: "Xuzhou",      pinyin: "xuzhou",      initial: "xz" },
  { name: "香港", nameEn: "Hong Kong",   pinyin: "xianggang",   initial: "xg" },
  { name: "澳门", nameEn: "Macau",       pinyin: "aomen",       initial: "am" },
];

/** Case-insensitive fuzzy match on name / English / full pinyin / initials. */
export function cityMatchesQuery(city: ChinaCity, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    city.name.includes(q) ||
    city.nameEn.toLowerCase().includes(q) ||
    city.pinyin.includes(q) ||
    city.initial.includes(q)
  );
}
