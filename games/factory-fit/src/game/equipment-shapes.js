// Fixed tile masks shared by rendering, placement and operator positioning.
export const EQUIPMENT_SHAPES = {
  "cutter": {
    "seconds": 2.4,
    "name": "절단기",
    "mask": [
      "###",
      "..O"
    ],
    "workCell": [
      1,
      1
    ],
    "width": 3,
    "height": 2
  },
  "machining": {
    "seconds": 5.5,
    "name": "가공기",
    "mask": [
      "##",
      "O#"
    ],
    "workCell": [
      1,
      2
    ],
    "width": 2,
    "height": 2
  },
  "grinder": {
    "seconds": 3.2,
    "name": "연마기",
    "mask": [
      "#O"
    ],
    "workCell": [
      0,
      1
    ],
    "width": 2,
    "height": 1
  },
  "injection": {
    "seconds": 8,
    "name": "사출기",
    "mask": [
      "####",
      "###O"
    ],
    "workCell": [
      1,
      2
    ],
    "width": 4,
    "height": 2
  },
  "press": {
    "seconds": 6,
    "name": "성형프레스",
    "mask": [
      "###",
      ".O."
    ],
    "workCell": [
      0,
      1
    ],
    "width": 3,
    "height": 2
  },
  "joining": {
    "seconds": 4.5,
    "name": "접합기",
    "mask": [
      "##.",
      ".#O"
    ],
    "workCell": [
      0,
      1
    ],
    "width": 3,
    "height": 2
  },
  "gluing": {
    "seconds": 2.8,
    "name": "접착대",
    "mask": [
      "##",
      "O."
    ],
    "workCell": [
      1,
      1
    ],
    "width": 2,
    "height": 2
  },
  "painting": {
    "seconds": 3.5,
    "name": "도장기",
    "mask": [
      "###",
      "#.O"
    ],
    "workCell": [
      1,
      1
    ],
    "width": 3,
    "height": 2
  },
  "heating": {
    "seconds": 10,
    "name": "열처리기",
    "mask": [
      "###",
      "##O"
    ],
    "workCell": [
      1,
      2
    ],
    "width": 3,
    "height": 2
  },
  "cutting": {
    "seconds": 3,
    "name": "재단대",
    "mask": [
      "####",
      "...O"
    ],
    "workCell": [
      1,
      1
    ],
    "width": 4,
    "height": 2
  },
  "sewing": {
    "seconds": 5.5,
    "name": "재봉기",
    "mask": [
      "#O"
    ],
    "workCell": [
      0,
      1
    ],
    "width": 2,
    "height": 1
  },
  "assembly": {
    "seconds": 4.8,
    "name": "조립대",
    "mask": [
      "####",
      "#..O"
    ],
    "workCell": [
      1,
      1
    ],
    "width": 4,
    "height": 2
  },
  "electronics": {
    "seconds": 6.5,
    "name": "전자조립대",
    "mask": [
      "###",
      ".#O"
    ],
    "workCell": [
      0,
      1
    ],
    "width": 3,
    "height": 2
  },
  "inspection": {
    "seconds": 2.5,
    "name": "검사대",
    "mask": [
      "##O"
    ],
    "workCell": [
      1,
      1
    ],
    "width": 3,
    "height": 1
  },
  "packing": {
    "seconds": 2.2,
    "name": "포장대",
    "mask": [
      "###",
      "O.."
    ],
    "workCell": [
      1,
      1
    ],
    "width": 3,
    "height": 2
  },
  "casting": {
    "seconds": 9,
    "name": "주조기",
    "mask": [
      "####",
      "O###"
    ],
    "workCell": [
      2,
      2
    ],
    "width": 4,
    "height": 2
  },
  "filling": {
    "seconds": 3.8,
    "name": "충전기",
    "mask": [
      "##",
      ".O"
    ],
    "workCell": [
      0,
      1
    ],
    "width": 2,
    "height": 2
  }
};
