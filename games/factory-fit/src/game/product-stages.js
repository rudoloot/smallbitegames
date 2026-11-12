// Fixed production layouts and inventory draws.
export const productStages = [
  {
    "factory": "glasses",
    "width": 11,
    "height": 4,
    "cells": [
      "9,2",
      "10,2",
      "9,3",
      "10,3",
      "8,2",
      "6,2",
      "7,2",
      "6,3",
      "5,3",
      "4,2",
      "5,2",
      "4,3",
      "3,3",
      "2,3",
      "2,2",
      "3,2",
      "3,1",
      "2,0",
      "3,0",
      "2,1",
      "1,1",
      "0,2",
      "1,2",
      "0,3",
      "1,3",
      "4,1",
      "5,1",
      "6,1",
      "7,1",
      "4,0"
    ],
    "pillars": [
      {
        "x": 6,
        "y": 1
      }
    ],
    "fixtures": [
      {
        "id": "inbound",
        "x": 0,
        "y": 2,
        "width": 2,
        "height": 2,
        "access": {
          "x": 1,
          "y": 1
        },
        "label": "입고장",
        "color": "#b98950"
      },
      {
        "id": "outbound",
        "x": 9,
        "y": 2,
        "width": 2,
        "height": 2,
        "access": {
          "x": 8,
          "y": 2
        },
        "label": "출고장",
        "color": "#579087"
      }
    ],
    "inventory": [
      {
        "id": "m1",
        "type": "machining",
        "variant": "S"
      },
      {
        "id": "m2",
        "type": "assembly",
        "variant": "Z"
      },
      {
        "id": "m3",
        "type": "inspection",
        "variant": "S"
      },
      {
        "id": "m4",
        "type": "packing",
        "variant": "S"
      },
      {
        "id": "m1-1",
        "type": "machining",
        "variant": "Z"
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "variant": "L"
      },
      {
        "id": "m3-1",
        "type": "inspection",
        "variant": "T"
      },
      {
        "id": "m4-1",
        "type": "packing",
        "variant": "T"
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "machining",
        "variant": "S",
        "rotation": 0,
        "x": 1,
        "y": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "variant": "Z",
        "rotation": 3,
        "x": 2,
        "y": 1
      },
      {
        "id": "m3",
        "type": "inspection",
        "variant": "S",
        "rotation": 0,
        "x": 3,
        "y": 2
      },
      {
        "id": "m4",
        "type": "packing",
        "variant": "S",
        "rotation": 0,
        "x": 5,
        "y": 2
      }
    ],
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m4",
      "w5": "outbound"
    },
    "referenceMeanSeconds": 15.2317,
    "targetPerMinute": 3.9
  },
  {
    "factory": "slipper",
    "width": 9,
    "height": 6,
    "cells": [
      "7,0",
      "8,0",
      "7,1",
      "8,1",
      "6,0",
      "4,0",
      "5,0",
      "4,1",
      "3,1",
      "0,1",
      "1,1",
      "2,1",
      "1,2",
      "1,5",
      "1,4",
      "1,3",
      "2,4",
      "3,5",
      "2,5",
      "3,4",
      "4,4",
      "6,1",
      "6,2",
      "6,3",
      "6,4",
      "5,1",
      "5,2",
      "5,3",
      "5,4",
      "4,2",
      "2,2",
      "3,2",
      "2,3",
      "3,3",
      "4,3",
      "7,2",
      "8,2",
      "7,3",
      "7,4"
    ],
    "pillars": [
      {
        "x": 7,
        "y": 2
      }
    ],
    "fixtures": [
      {
        "id": "inbound",
        "x": 2,
        "y": 2,
        "width": 2,
        "height": 2,
        "access": {
          "x": 4,
          "y": 2
        },
        "label": "입고장",
        "color": "#b98950"
      },
      {
        "id": "outbound",
        "x": 7,
        "y": 0,
        "width": 2,
        "height": 2,
        "access": {
          "x": 6,
          "y": 0
        },
        "label": "출고장",
        "color": "#579087"
      }
    ],
    "inventory": [
      {
        "id": "m1",
        "type": "injection",
        "variant": "original"
      },
      {
        "id": "m2",
        "type": "grinder",
        "variant": "S"
      },
      {
        "id": "m3",
        "type": "assembly",
        "variant": "T"
      },
      {
        "id": "m4",
        "type": "inspection",
        "variant": "T"
      },
      {
        "id": "m5",
        "type": "packing",
        "variant": "S"
      },
      {
        "id": "m1-1",
        "type": "injection",
        "variant": "mirror"
      },
      {
        "id": "m2-1",
        "type": "grinder",
        "variant": "Z"
      },
      {
        "id": "m3-1",
        "type": "assembly",
        "variant": "L"
      },
      {
        "id": "m4-1",
        "type": "inspection",
        "variant": "J"
      },
      {
        "id": "m5-1",
        "type": "packing",
        "variant": "Z"
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "injection",
        "variant": "original",
        "rotation": 1,
        "x": 5,
        "y": 1
      },
      {
        "id": "m2",
        "type": "grinder",
        "variant": "S",
        "rotation": 2,
        "x": 2,
        "y": 4
      },
      {
        "id": "m3",
        "type": "assembly",
        "variant": "T",
        "rotation": 3,
        "x": 1,
        "y": 3
      },
      {
        "id": "m4",
        "type": "inspection",
        "variant": "T",
        "rotation": 0,
        "x": 0,
        "y": 1
      },
      {
        "id": "m5",
        "type": "packing",
        "variant": "S",
        "rotation": 0,
        "x": 3,
        "y": 0
      }
    ],
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m4",
      "w5": "m5",
      "w6": "outbound"
    },
    "referenceMeanSeconds": 19.2301,
    "targetPerMinute": 3.1
  },
  {
    "factory": "desk",
    "width": 8,
    "height": 7,
    "cells": [
      "6,0",
      "7,0",
      "6,1",
      "7,1",
      "5,0",
      "2,0",
      "3,0",
      "4,0",
      "3,1",
      "0,1",
      "1,1",
      "2,1",
      "1,2",
      "2,3",
      "2,2",
      "3,3",
      "3,2",
      "4,4",
      "4,3",
      "4,2",
      "5,3",
      "5,4",
      "5,5",
      "4,5",
      "4,6",
      "1,6",
      "2,6",
      "3,6",
      "1,5",
      "0,3",
      "1,3",
      "0,4",
      "1,4",
      "4,1",
      "0,2",
      "6,2",
      "5,2",
      "6,3",
      "6,4",
      "6,5"
    ],
    "pillars": [
      {
        "x": 0,
        "y": 2
      }
    ],
    "fixtures": [
      {
        "id": "inbound",
        "x": 0,
        "y": 3,
        "width": 2,
        "height": 2,
        "access": {
          "x": 1,
          "y": 5
        },
        "label": "입고장",
        "color": "#b98950"
      },
      {
        "id": "outbound",
        "x": 6,
        "y": 0,
        "width": 2,
        "height": 2,
        "access": {
          "x": 5,
          "y": 0
        },
        "label": "출고장",
        "color": "#579087"
      }
    ],
    "inventory": [
      {
        "id": "m1",
        "type": "cutter",
        "variant": "J"
      },
      {
        "id": "m2",
        "type": "gluing",
        "variant": "Z"
      },
      {
        "id": "m3",
        "type": "machining",
        "variant": "T"
      },
      {
        "id": "m4",
        "type": "assembly",
        "variant": "O"
      },
      {
        "id": "m5",
        "type": "inspection",
        "variant": "T"
      },
      {
        "id": "m6",
        "type": "packing",
        "variant": "T"
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "variant": "O"
      },
      {
        "id": "m2-1",
        "type": "gluing",
        "variant": "S"
      },
      {
        "id": "m3-1",
        "type": "machining",
        "variant": "Z"
      },
      {
        "id": "m4-1",
        "type": "assembly",
        "variant": "T"
      },
      {
        "id": "m5-1",
        "type": "inspection",
        "variant": "O"
      },
      {
        "id": "m6-1",
        "type": "packing",
        "variant": "O"
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "variant": "J",
        "rotation": 0,
        "x": 1,
        "y": 5
      },
      {
        "id": "m2",
        "type": "gluing",
        "variant": "Z",
        "rotation": 1,
        "x": 4,
        "y": 4
      },
      {
        "id": "m3",
        "type": "machining",
        "variant": "T",
        "rotation": 3,
        "x": 4,
        "y": 2
      },
      {
        "id": "m4",
        "type": "assembly",
        "variant": "O",
        "rotation": 3,
        "x": 2,
        "y": 2
      },
      {
        "id": "m5",
        "type": "inspection",
        "variant": "T",
        "rotation": 0,
        "x": 0,
        "y": 1
      },
      {
        "id": "m6",
        "type": "packing",
        "variant": "T",
        "rotation": 0,
        "x": 2,
        "y": 0
      }
    ],
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m4",
      "w5": "m5",
      "w6": "m6",
      "w7": "outbound"
    },
    "referenceMeanSeconds": 18.5317,
    "targetPerMinute": 3.2
  },
  {
    "factory": "speaker",
    "width": 7,
    "height": 11,
    "cells": [
      "5,1",
      "6,1",
      "5,2",
      "6,2",
      "4,1",
      "2,0",
      "3,0",
      "4,0",
      "3,1",
      "2,1",
      "1,1",
      "0,1",
      "0,2",
      "1,3",
      "0,3",
      "1,2",
      "2,2",
      "2,4",
      "2,3",
      "3,4",
      "3,3",
      "4,5",
      "4,4",
      "4,3",
      "3,5",
      "1,5",
      "2,5",
      "1,6",
      "2,6",
      "3,6",
      "3,7",
      "3,8",
      "4,8",
      "3,9",
      "4,9",
      "3,10",
      "4,10",
      "3,2",
      "4,2",
      "1,4",
      "2,7",
      "1,7",
      "2,8",
      "2,9",
      "2,10"
    ],
    "pillars": [
      {
        "x": 2,
        "y": 8
      }
    ],
    "fixtures": [
      {
        "id": "inbound",
        "x": 3,
        "y": 9,
        "width": 2,
        "height": 2,
        "access": {
          "x": 4,
          "y": 8
        },
        "label": "입고장",
        "color": "#b98950"
      },
      {
        "id": "outbound",
        "x": 5,
        "y": 1,
        "width": 2,
        "height": 2,
        "access": {
          "x": 4,
          "y": 1
        },
        "label": "출고장",
        "color": "#579087"
      }
    ],
    "inventory": [
      {
        "id": "m1",
        "type": "cutter",
        "variant": "L"
      },
      {
        "id": "m2",
        "type": "machining",
        "variant": "O"
      },
      {
        "id": "m3",
        "type": "gluing",
        "variant": "J"
      },
      {
        "id": "m4",
        "type": "painting",
        "variant": "O"
      },
      {
        "id": "m5",
        "type": "electronics",
        "variant": "S"
      },
      {
        "id": "m6",
        "type": "inspection",
        "variant": "L"
      },
      {
        "id": "m7",
        "type": "packing",
        "variant": "T"
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "variant": "T"
      },
      {
        "id": "m2-1",
        "type": "machining",
        "variant": "J"
      },
      {
        "id": "m3-1",
        "type": "gluing",
        "variant": "L"
      },
      {
        "id": "m4-1",
        "type": "painting",
        "variant": "S"
      },
      {
        "id": "m5-1",
        "type": "electronics",
        "variant": "T"
      },
      {
        "id": "m6-1",
        "type": "inspection",
        "variant": "S"
      },
      {
        "id": "m7-1",
        "type": "packing",
        "variant": "Z"
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "variant": "L",
        "rotation": 1,
        "x": 3,
        "y": 6
      },
      {
        "id": "m2",
        "type": "machining",
        "variant": "O",
        "rotation": 0,
        "x": 1,
        "y": 5
      },
      {
        "id": "m3",
        "type": "gluing",
        "variant": "J",
        "rotation": 3,
        "x": 3,
        "y": 3
      },
      {
        "id": "m4",
        "type": "painting",
        "variant": "O",
        "rotation": 3,
        "x": 2,
        "y": 3
      },
      {
        "id": "m5",
        "type": "electronics",
        "variant": "S",
        "rotation": 2,
        "x": 0,
        "y": 2
      },
      {
        "id": "m6",
        "type": "inspection",
        "variant": "L",
        "rotation": 2,
        "x": 0,
        "y": 1
      },
      {
        "id": "m7",
        "type": "packing",
        "variant": "T",
        "rotation": 0,
        "x": 2,
        "y": 0
      }
    ],
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m4",
      "w5": "m5",
      "w6": "m6",
      "w7": "m7",
      "w8": "outbound"
    },
    "referenceMeanSeconds": 20.6624,
    "targetPerMinute": 2.9
  },
  {
    "factory": "plush",
    "width": 9,
    "height": 8,
    "cells": [
      "7,3",
      "8,3",
      "7,4",
      "8,4",
      "6,3",
      "6,2",
      "6,1",
      "6,0",
      "5,0",
      "4,0",
      "3,0",
      "2,0",
      "2,1",
      "3,1",
      "4,1",
      "4,2",
      "5,2",
      "4,3",
      "5,3",
      "4,4",
      "5,4",
      "4,5",
      "5,5",
      "4,6",
      "3,6",
      "3,7",
      "2,7",
      "2,6",
      "1,6",
      "3,5",
      "2,5",
      "1,5",
      "2,4",
      "3,2",
      "3,3",
      "3,4",
      "2,3",
      "0,2",
      "1,2",
      "0,3",
      "1,3",
      "5,1",
      "2,2",
      "1,4",
      "6,4",
      "7,2",
      "8,2",
      "7,1",
      "7,0"
    ],
    "pillars": [
      {
        "x": 7,
        "y": 1
      }
    ],
    "fixtures": [
      {
        "id": "inbound",
        "x": 0,
        "y": 2,
        "width": 2,
        "height": 2,
        "access": {
          "x": 2,
          "y": 3
        },
        "label": "입고장",
        "color": "#b98950"
      },
      {
        "id": "outbound",
        "x": 7,
        "y": 3,
        "width": 2,
        "height": 2,
        "access": {
          "x": 6,
          "y": 3
        },
        "label": "출고장",
        "color": "#579087"
      }
    ],
    "inventory": [
      {
        "id": "m1",
        "type": "cutting",
        "variant": "T"
      },
      {
        "id": "m2",
        "type": "sewing",
        "variant": "T"
      },
      {
        "id": "m3",
        "type": "sewing",
        "variant": "Z"
      },
      {
        "id": "m4",
        "type": "assembly",
        "variant": "S"
      },
      {
        "id": "m5",
        "type": "filling",
        "variant": "O"
      },
      {
        "id": "m6",
        "type": "sewing",
        "variant": "Z"
      },
      {
        "id": "m7",
        "type": "inspection",
        "variant": "L"
      },
      {
        "id": "m8",
        "type": "packing",
        "variant": "L"
      },
      {
        "id": "m1-1",
        "type": "cutting",
        "variant": "Z"
      },
      {
        "id": "m2-1",
        "type": "sewing",
        "variant": "Z"
      },
      {
        "id": "m4-1",
        "type": "assembly",
        "variant": "Z"
      },
      {
        "id": "m5-1",
        "type": "filling",
        "variant": "T"
      },
      {
        "id": "m7-1",
        "type": "inspection",
        "variant": "J"
      },
      {
        "id": "m8-1",
        "type": "packing",
        "variant": "T"
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutting",
        "variant": "T",
        "rotation": 1,
        "x": 3,
        "y": 2
      },
      {
        "id": "m2",
        "type": "sewing",
        "variant": "T",
        "rotation": 2,
        "x": 1,
        "y": 5
      },
      {
        "id": "m3",
        "type": "sewing",
        "variant": "Z",
        "rotation": 2,
        "x": 1,
        "y": 6
      },
      {
        "id": "m4",
        "type": "assembly",
        "variant": "S",
        "rotation": 0,
        "x": 3,
        "y": 5
      },
      {
        "id": "m5",
        "type": "filling",
        "variant": "O",
        "rotation": 0,
        "x": 4,
        "y": 3
      },
      {
        "id": "m6",
        "type": "sewing",
        "variant": "Z",
        "rotation": 0,
        "x": 3,
        "y": 1
      },
      {
        "id": "m7",
        "type": "inspection",
        "variant": "L",
        "rotation": 2,
        "x": 2,
        "y": 0
      },
      {
        "id": "m8",
        "type": "packing",
        "variant": "L",
        "rotation": 3,
        "x": 5,
        "y": 0
      }
    ],
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m4",
      "w5": "m5",
      "w6": "m6",
      "w7": "m7",
      "w8": "m8",
      "w9": "outbound"
    },
    "referenceMeanSeconds": 16.5232,
    "targetPerMinute": 3.6
  }
];
