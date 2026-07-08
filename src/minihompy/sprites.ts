/* ──────────────────────────────────────────────────────────────
   미니룸 도트 스프라이트 데이터 (가구/벽걸이) — minihompy.jsx 원본에서 자동 생성.
   PAL: 팔레트, SPRITES: 도안(map) + 카테고리(cat) + 벽걸이여부(wall).
   ────────────────────────────────────────────────────────────── */

export interface SpriteDef {
  cat: string
  wall: boolean
  map: string[]
  enhanced?: boolean
}

const SPRITE_DATA = {"PAL": {"k": "#3a2b3a", "w": "#ffffff", "W": "#e8edf2", "g": "#9aa3ad", "G": "#5a6470", "r": "#ff6b88", "R": "#d84d63", "p": "#ffb8d6", "P": "#ff7eb3", "h": "#ff4f9b", "o": "#ff9f5a", "y": "#ffe08a", "Y": "#f0b429", "n": "#d9b27c", "N": "#a87b50", "b": "#bfe3ff", "B": "#6aa8e8", "c": "#b8efd6", "C": "#3fb985", "e": "#2e7d52", "m": "#b98a5e", "s": "#f7c9a0", "l": "#d9c7ff", "L": "#9b6bd6", "d": "#5f3f87", "t": "#5a3b2a", "x": "#222a33", "f": "#2bb6a3", "u": "#7ec8ff"}, "SPRITES": {"sofa": {"cat": "가구", "wall": false, "map": ["                  ", "   PPPPPPPPPPPP   ", "  PPpppppppppppP  ", "  PPpppppppppppP  ", "  PPpppppppppppP  ", "  PPpppppppppppP  ", "  PPPPPPPPPPPPPP  ", "  PPPPPPPPPPPPPP  ", "  t            t  "]}, "bed": {"cat": "가구", "wall": false, "map": ["                ", " NN             ", " NNbbbbbbbbbbbb ", " NNwwwbbbbbbbbb ", " NNwwwbbbbbbbbN ", " NNbbbbbbbbbbbN ", " NNNNNNNNNNNNNN ", "  N          N  "]}, "chair": {"cat": "가구", "wall": false, "map": ["  NNNN  ", "  NNNN  ", "  NNNN  ", "  NNNN  ", " NNNNNN ", " nnnnnn ", " NNNNNN ", " N    N ", " N    N "]}, "table": {"cat": "가구", "wall": false, "map": ["              ", "  NNNNNNNNNN  ", " NNNNNNNNNNNN ", " NNNNNNNNNNNN ", "  N        N  ", "  N        N  ", "  N        N  "]}, "drawer": {"cat": "가구", "wall": false, "map": ["            ", " NNNNNNNNNN ", " NnnnnnnnnN ", " NnYYnnYYnN ", " NnnnnnnnnN ", " NnYYnnYYnN ", " NnnnnnnnnN ", " NnYYnnYYnN ", " NnnnnnnnnN ", " NNNNNNNNNN ", "  N      N  "]}, "tv": {"cat": "가전", "wall": false, "map": ["              ", " kkkkkkkkkkkk ", " kxxxxxxxxxxk ", " kxbbbbbbbbxk ", " kxbbbbbbbbxk ", " kxxxxxxxxxxk ", " kkkkkkkkkkkk ", "     kkkk     ", "   GGGGGGGG   "]}, "fridge": {"cat": "가전", "wall": false, "map": ["          ", " WWWWWWWW ", " WWWWWWWW ", " WWWWWWgW ", " WWWWWWWW ", " WWWWWWWW ", " WWWWWWgW ", " WWWWWWWW ", " WWWWWWWW ", " W      W "]}, "laptop": {"cat": "가전", "wall": false, "map": ["            ", "  GGGGGGGG  ", "  GbbbbbbG  ", "  GbuuuubG  ", "  GbbbbbbG  ", "  GGGGGGGG  ", " GGGGGGGGGG ", " gggggggggg "]}, "lamp": {"cat": "가전", "wall": false, "map": ["   yyyy   ", "  yyyyyy  ", " yyyyyyyy ", "  yyyyyy  ", "    GG    ", "    GG    ", "    GG    ", "   GGGG   ", "  GGGGGG  "]}, "plant": {"cat": "식물", "wall": false, "map": ["   CC   ", "  CCCC  ", " CCeCCC ", " CCCCeC ", "  CCCC  ", "   NN   ", "  NNNN  ", "  nnnn  ", "  NNNN  "]}, "cactus": {"cat": "식물", "wall": false, "map": ["        ", "   C    ", " C CC   ", " CeCC C ", " CCCCeC ", "  CCCC  ", "  CCCC  ", "  oooo  ", "  oNNo  "]}, "tree": {"cat": "식물", "wall": false, "map": ["   CCCC   ", "  CCeeCC  ", " CCeCCeCC ", " CCCCCCCC ", "  CCeeCC  ", "   CCCC   ", "    NN    ", "   NNNN   ", "  nnnnnn  ", "  NNNNNN  "]}, "flower": {"cat": "식물", "wall": false, "map": ["  h  h  ", " hyh hyh", "  h  h  ", "  CeC   ", "  CCC   ", "  oNo   ", "  ooo   "]}, "books": {"cat": "소품", "wall": false, "map": ["            ", "  R         ", "  R   C  B  ", "  R R C  B  ", "  R R C YB  ", "  R R C YB  ", " RRRRRRRRRR "]}, "teddy": {"cat": "소품", "wall": false, "map": ["  m    m  ", " mmm  mmm ", " mmmmmmmm ", " mmkmmkmm ", " mmmoomm  ", "  mmmmmm  ", " mmmmmmmm ", " mm    mm ", " mm    mm "]}, "balloon": {"cat": "소품", "wall": false, "map": ["   hhhh   ", "  hhhhhh  ", "  hhhhhh  ", "  hhhhhh  ", "   hhhh   ", "    hh    ", "    k     ", "   k      ", "    k     "]}, "cushion": {"cat": "소품", "wall": false, "map": ["          ", " PPPPPPPP ", " PppppppP ", " PppppppP ", " PppppppP ", " PPPPPPPP "]}, "cat": {"cat": "동물", "wall": false, "map": [" g    g  ", " gg  gg  ", " gggggg  ", " gkggkg  ", " ggppgg  ", " gggggg  ", "ggggggg g", " g    ggg"]}, "dog": {"cat": "동물", "wall": false, "map": [" N    N ", " NN  NN ", " nnnnnn ", " nknnkn ", " nntonn ", " nnnnnn ", "nnnnnnn ", " n   nnn"]}, "rabbit": {"cat": "동물", "wall": false, "map": [" W  W  ", " W  W  ", " WW WW ", " WWWWW ", " WkWkW ", " WWpWW ", " WWWWW ", "WWWWWWW", " W   WW"]}, "frame_land": {"cat": "액자", "wall": true, "map": [" YYYYYYYYYY ", " YbbbbbbbbY ", " YbbbCCbbbY ", " YbeCCCCbbY ", " YCCeCCCeCY ", " YYYYYYYYYY "]}, "frame_port": {"cat": "액자", "wall": true, "map": [" NNNNNN ", " NbbbbN ", " NbssbN ", " NbssbN ", " NbRRbN ", " NbRRbN ", " NNNNNN "]}, "painting": {"cat": "액자", "wall": true, "map": [" kkkkkkkkkk ", " kyyyybbbbk ", " kyyhhbbbbk ", " khhhhPPbbk ", " khhPPPPCck ", " kPPPPCCcck ", " kkkkkkkkkk "]}, "poster": {"cat": "액자", "wall": true, "map": [" WWWWWWWW ", " WhhhhhhW ", " WhwwwwhW ", " WhwLLwhW ", " WhwLLwhW ", " WhwwwwhW ", " WhhhhhhW ", " WWWWWWWW "]}, "photo_heart": {"cat": "액자", "wall": true, "map": [" nnnnnnnn ", " nwwwwwwn ", " nwhwhwwn ", " nwhhhwwn ", " nwwhwwwn ", " nwwwwwwn ", " nnnnnnnn "]}, "window": {"cat": "창문", "wall": true, "map": ["NNNNNNNNNN", "NuuuuNuuuN", "NuwuuNuuuN", "NuuuuNuuuN", "NNNNNNNNNN", "NuuuuNuuuN", "NuuuuNuuuN", "NuuuuNuuuN", "NNNNNNNNNN"]}, "window_round": {"cat": "창문", "wall": true, "map": ["  WWWW  ", " WuuuuW ", " WuwuuW ", "WuuuuuuW", "WuuuuuuW", " WuuuuW ", "  WWWW  "]}, "sconce": {"cat": "조명", "wall": true, "map": ["   GG   ", "  yyyy  ", " yyyyyy ", " yyyyyy ", "  yyyy  ", "   GG   ", "   GG   "]}, "neon_heart": {"cat": "조명", "wall": true, "map": [" h h  h h ", "hhhhhhhhhh", "hhhhhhhhhh", " hhhhhhhh ", "  hhhhhh  ", "   hhhh   ", "    hh    "]}, "clock": {"cat": "시계", "wall": true, "map": ["  GGGG  ", " GWWWWG ", " GWkWWG ", " GWkkWG ", " GWWWWG ", "  GGGG  "]}, "calendar": {"cat": "시계", "wall": true, "map": [" RRRRRR ", " RwwwwR ", " WkWkWW ", " WWWWWW ", " WWkWWW ", " WWWWkW ", " WWWWWW "]}, "shelf": {"cat": "장식", "wall": true, "map": ["            ", "  R  C  B   ", "  R RC YB t ", "  R RC YB t ", " tttttttttt "]}, "mirror_round": {"cat": "장식", "wall": true, "map": ["  YYYY  ", " YuuuuY ", "YuuwuuuY", "YuuuuuuY", " YuuuuY ", "  YYYY  "]}, "pennants": {"cat": "장식", "wall": true, "map": ["kkkkkkkkkkkk", "PPbbyyPPbbyy", "PPbbyyPPbbyy", " PbbyyPPbby ", "  byy  Pbb  ", "   y    P   "]}, "ivy": {"cat": "장식", "wall": true, "map": [" e  e  e ", " Ce CeCe ", " eC eC C ", "  C  e e ", "  e  C C ", "  C  e   ", "  e      "]}, "garland_star": {"cat": "장식", "wall": true, "map": ["kkkkkkkkkkk", " y   o   y ", "yyy oo  yyy", " y   o   y "]}}} as const

export const PAL: Record<string, string> = SPRITE_DATA.PAL

const SPRITE_UPGRADES: Record<string, { map: string[] }> = {
  sofa: {
    map: [
      "                      ",
      "     kkkkkkkkkkkk     ",
      "   kkPPPPPPPPPPPPkk   ",
      "  kPPppPPppPPppPPPPk  ",
      " kPPppPPppPPppPPppPPk ",
      " kPPPPPPPPPPPPPPPPPPk ",
      " kPPRRRRRRRRRRRRRRPPk ",
      " kPPppppppppppppppPPk ",
      "  kPPPPPPPPPPPPPPPPk  ",
      "   kkkkkkkkkkkkkkkk   ",
      "    tt            tt   ",
      "   tttt          tttt  ",
    ],
  },
  bed: {
    map: [
      "                      ",
      "  NNNNNNNNNNNNNNNNNN  ",
      " NNwwwwWbbbbbbbbbbbNN ",
      " NNwwwwWbbbbbbbbbbbNN ",
      " NNwwwwWbbbbbbbbbbbNN ",
      " NNNNNNNbbbbbbbbbbbNN ",
      " NNbbbbbbbbbbbbbbbbNN ",
      " NNbbbbbbbuuubbbbbbNN ",
      " NNbbbbbbbbbbbbbbbbNN ",
      " NNNNNNNNNNNNNNNNNNNN ",
      "   NN              NN  ",
      "  NNNN            NNNN ",
    ],
  },
  chair: {
    map: [
      "                ",
      "    kkkkkkkk    ",
      "   kNNNNNNNNk   ",
      "   kNnnnnnnNk   ",
      "   kNnnYYnnNk   ",
      "   kNNNNNNNNk   ",
      "    kNNNNNNk    ",
      "   kNNNNNNNNk   ",
      "  kNnnnnnnnnNk  ",
      "  kNNNNNNNNNNk  ",
      "   NN      NN   ",
      "  NNN      NNN  ",
    ],
  },
  table: {
    map: [
      "                    ",
      "    kkkkkkkkkkkk    ",
      "  kkNNNNNNNNNNNNkk  ",
      " kNNnnnnnnnnnnnnNNk ",
      " kNNNNNNNNNNNNNNNNk ",
      "  kNNNNNNNNNNNNNNk  ",
      "    NN        NN    ",
      "    NN        NN    ",
      "   NNN        NNN   ",
      "   NN          NN   ",
      "  tt            tt  ",
      " tttt          tttt ",
    ],
  },
  drawer: {
    map: [
      "                  ",
      "   kkkkkkkkkkkk   ",
      "  kNNNNNNNNNNNNk  ",
      "  kNnnnnnnnnnnNk  ",
      "  kNnYYnNNnYYnNk  ",
      "  kNNNNNNNNNNNNk  ",
      "  kNnnnnnnnnnnNk  ",
      "  kNnYYnNNnYYnNk  ",
      "  kNNNNNNNNNNNNk  ",
      "  kNnnnnnnnnnnNk  ",
      "  kNnYYnNNnYYnNk  ",
      "  kNNNNNNNNNNNNk  ",
      "   NN        NN   ",
      "  NNN        NNN  ",
    ],
  },
  tv: {
    map: [
      "                    ",
      "   kkkkkkkkkkkkkk   ",
      "  kkxxxxxxxxxxxxkk  ",
      "  kxbbbbbbbbbbbbxk  ",
      "  kxbbuuubbbuuubxk  ",
      "  kxbbbbbbbbbbbbxk  ",
      "  kxbbbbWWbbbbbbxk  ",
      "  kxxxxxxxxxxxxxxk  ",
      "   kkkkkkkkkkkkkk   ",
      "        kkkk        ",
      "      GGGGGGGG      ",
      "     GGGGGGGGGG     ",
    ],
  },
  fridge: {
    map: [
      "                ",
      "   kkkkkkkkkk   ",
      "  kWWWWWWWWWWk  ",
      "  kWwwwwwwwwWk  ",
      "  kWwwwwGwwwWk  ",
      "  kWWWWWWWWWWk  ",
      "  kGGGGGGGGGGk  ",
      "  kWWWWWWWWWWk  ",
      "  kWwwwwGwwwWk  ",
      "  kWwwwwwwwwWk  ",
      "  kWWWWWWWWWWk  ",
      "   kkk    kkk   ",
      "   GG      GG   ",
    ],
  },
  laptop: {
    map: [
      "                  ",
      "    kkkkkkkkkk    ",
      "   kGGGGGGGGGGk   ",
      "   kGbbbbbbbbGk   ",
      "   kGbuuuuubGk    ",
      "   kGbbbbbbbbGk   ",
      "   kGGGGGGGGGGk   ",
      "    kkkkkkkkkk    ",
      "  kGGGGGGGGGGGGk  ",
      " kGggggggggggggGk ",
      " kGGGGGGGGGGGGGGk ",
      "  kkkkkkkkkkkkkk  ",
    ],
  },
  lamp: {
    map: [
      "                ",
      "      yyyy      ",
      "    yyyyyyyy    ",
      "   yyyyyyyyyy   ",
      "  yyYYYYYYYYyy  ",
      "   yyyyyyyyyy   ",
      "    yyyyYYyy    ",
      "       GG       ",
      "       GG       ",
      "       GG       ",
      "     GGGGGG     ",
      "    GGGGGGGG    ",
    ],
  },
}

export const SPRITES: Record<string, SpriteDef> = Object.fromEntries(
  Object.entries(SPRITE_DATA.SPRITES).map(([key, sprite]) => {
    const upgrade = SPRITE_UPGRADES[key]
    return [key, upgrade ? { ...sprite, ...upgrade, enhanced: true } : sprite]
  })
) as Record<string, SpriteDef>

export const CAT_ORDER = ['가구', '가전', '식물', '소품', '동물', '액자', '창문', '조명', '시계', '장식'] as const

export interface CatDef { name: string; wall: boolean; keys: string[] }

export const CATS: CatDef[] = CAT_ORDER.map((name) => {
  const keys = Object.keys(SPRITES).filter((k) => SPRITES[k].cat === name)
  const wall = keys.length ? !!SPRITES[keys[0]].wall : false
  return { name, wall, keys }
}).filter((c) => c.keys.length)
