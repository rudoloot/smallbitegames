// Authored feasible production references, not proven global optima.
export const STAGE_LAYOUTS = {
  "sample-01": {
    "target": 7.7,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 6,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 3,
        "y": 0,
        "rotation": 3
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 0,
        "y": 1,
        "rotation": 3
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 5,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 4,
        "y": 3,
        "rotation": 2
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 0,
        "y": 1,
        "rotation": 3
      }
    ],
    "referenceRate": 8.823529411764707,
    "startRate": 4.823151125401929,
    "tested": 160
  },
  "sample-02": {
    "target": 6.3,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 2,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 0,
        "y": 1,
        "rotation": 3
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 6,
        "y": 3,
        "rotation": 3
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 3,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 7,
        "y": 2,
        "rotation": 1
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 4,
        "y": 3,
        "rotation": 3
      }
    ],
    "referenceRate": 7.246376811594203,
    "startRate": 3.31858407079646,
    "tested": 168
  },
  "sample-03": {
    "target": 7.8,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 7,
        "y": 1,
        "rotation": 3
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 3,
        "y": 1,
        "rotation": 2
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 0,
        "y": 3,
        "rotation": 0
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 3,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 6,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 2,
        "y": 6,
        "rotation": 0
      }
    ],
    "referenceRate": 8.875739644970414,
    "startRate": 2.586206896551724,
    "tested": 160
  },
  "sample-04": {
    "target": 8.2,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 4,
        "y": 5,
        "rotation": 2
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 0,
        "y": 4,
        "rotation": 0
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 1,
        "y": 1,
        "rotation": 2
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 2,
        "y": 5,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 3,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 7,
        "y": 0,
        "rotation": 2
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "x": 0,
        "y": 2,
        "rotation": 3
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "x": 6,
        "y": 0,
        "rotation": 3
      },
      {
        "id": "m3-1",
        "type": "packing",
        "x": 5,
        "y": 4,
        "rotation": 2
      }
    ],
    "referenceRate": 9.146341463414634,
    "startRate": 3.1380753138075317,
    "tested": 160,
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m1-1",
      "w5": "m2-1",
      "w6": "m3-1",
      "w7": "outbound",
      "w8": null,
      "w9": null,
      "w10": null,
      "w11": null,
      "w12": null,
      "w13": null,
      "w14": null,
      "w15": null,
      "w16": null,
      "w17": null,
      "w18": null,
      "w19": null,
      "w20": null
    },
    "parallelCandidates": 239,
    "referenceLines": 2
  },
  "sample-05": {
    "target": 7.4,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 8,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 5,
        "y": 1,
        "rotation": 2
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 5,
        "y": 7,
        "rotation": 3
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 2,
        "y": 1,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 7,
        "y": 7,
        "rotation": 0
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 2,
        "y": 7,
        "rotation": 0
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "x": 0,
        "y": 3,
        "rotation": 2
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "x": 9,
        "y": 1,
        "rotation": 1
      },
      {
        "id": "m3-1",
        "type": "packing",
        "x": 1,
        "y": 5,
        "rotation": 0
      }
    ],
    "referenceRate": 8.241758241758243,
    "startRate": 2.542372881355932,
    "tested": 160,
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m1-1",
      "w5": "m2-1",
      "w6": "m3-1",
      "w7": "outbound",
      "w8": null,
      "w9": null,
      "w10": null,
      "w11": null,
      "w12": null,
      "w13": null,
      "w14": null,
      "w15": null,
      "w16": null,
      "w17": null,
      "w18": null,
      "w19": null,
      "w20": null
    },
    "parallelCandidates": 193,
    "referenceLines": 2
  },
  "sample-06": {
    "target": 8.8,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 3,
        "y": 4,
        "rotation": 3
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 1,
        "y": 1,
        "rotation": 2
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 5,
        "y": 1,
        "rotation": 1
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 2,
        "y": 7,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 4,
        "y": 5,
        "rotation": 2
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 10,
        "y": 4,
        "rotation": 0
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "x": 5,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "x": 8,
        "y": 7,
        "rotation": 0
      },
      {
        "id": "m3-1",
        "type": "packing",
        "x": 2,
        "y": 1,
        "rotation": 0
      }
    ],
    "referenceRate": 9.803921568627452,
    "startRate": 2.7173913043478257,
    "tested": 160,
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m1-1",
      "w5": "m2-1",
      "w6": "m3-1",
      "w7": "outbound",
      "w8": null,
      "w9": null,
      "w10": null,
      "w11": null,
      "w12": null,
      "w13": null,
      "w14": null,
      "w15": null,
      "w16": null,
      "w17": null,
      "w18": null,
      "w19": null,
      "w20": null
    },
    "parallelCandidates": 231,
    "referenceLines": 2
  },
  "sample-07": {
    "target": 6.8,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 12,
        "y": 1,
        "rotation": 3
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 0,
        "y": 5,
        "rotation": 0
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 2,
        "y": 0,
        "rotation": 2
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 8,
        "y": 5,
        "rotation": 2
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 11,
        "y": 8,
        "rotation": 3
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 9,
        "y": 8,
        "rotation": 1
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "x": 4,
        "y": 4,
        "rotation": 0
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "x": 2,
        "y": 8,
        "rotation": 0
      },
      {
        "id": "m3-1",
        "type": "packing",
        "x": 7,
        "y": 1,
        "rotation": 0
      }
    ],
    "referenceRate": 7.575757575757576,
    "startRate": 3.2679738562091503,
    "tested": 161,
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m1-1",
      "w5": "m2-1",
      "w6": "m3-1",
      "w7": "outbound",
      "w8": null,
      "w9": null,
      "w10": null,
      "w11": null,
      "w12": null,
      "w13": null,
      "w14": null,
      "w15": null,
      "w16": null,
      "w17": null,
      "w18": null,
      "w19": null,
      "w20": null
    },
    "parallelCandidates": 157,
    "referenceLines": 2
  },
  "sample-08": {
    "target": 4.8,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 14,
        "y": 11,
        "rotation": 1
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 3,
        "y": 5,
        "rotation": 2
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 12,
        "y": 5,
        "rotation": 2
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 11,
        "y": 7,
        "rotation": 1
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 2,
        "y": 9,
        "rotation": 1
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 6,
        "y": 6,
        "rotation": 1
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "x": 1,
        "y": 3,
        "rotation": 2
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "x": 1,
        "y": 5,
        "rotation": 1
      },
      {
        "id": "m3-1",
        "type": "packing",
        "x": 11,
        "y": 4,
        "rotation": 3
      },
      {
        "id": "m1-2",
        "type": "cutter",
        "x": 14,
        "y": 4,
        "rotation": 1
      },
      {
        "id": "m2-2",
        "type": "assembly",
        "x": 12,
        "y": 0,
        "rotation": 1
      },
      {
        "id": "m3-2",
        "type": "packing",
        "x": 3,
        "y": 6,
        "rotation": 3
      }
    ],
    "referenceRate": 5.395683453237409,
    "startRate": 2.868068833652008,
    "tested": 160,
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m1-1",
      "w5": "m2-1",
      "w6": "m3-1",
      "w7": "m1-2",
      "w8": "m2-2",
      "w9": "m3-2",
      "w10": "outbound",
      "w11": null,
      "w12": null,
      "w13": null,
      "w14": null,
      "w15": null,
      "w16": null,
      "w17": null,
      "w18": null,
      "w19": null,
      "w20": null
    },
    "parallelCandidates": 53,
    "referenceLines": 3
  },
  "sample-09": {
    "target": 7.4,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 11,
        "y": 10,
        "rotation": 0
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 2,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 16,
        "y": 7,
        "rotation": 1
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 5,
        "y": 11,
        "rotation": 2
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 1,
        "y": 5,
        "rotation": 1
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 4,
        "y": 9,
        "rotation": 0
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "x": 9,
        "y": 7,
        "rotation": 1
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "x": 5,
        "y": 3,
        "rotation": 3
      },
      {
        "id": "m3-1",
        "type": "packing",
        "x": 2,
        "y": 12,
        "rotation": 1
      },
      {
        "id": "m1-2",
        "type": "cutter",
        "x": 12,
        "y": 4,
        "rotation": 0
      },
      {
        "id": "m2-2",
        "type": "assembly",
        "x": 13,
        "y": 8,
        "rotation": 2
      },
      {
        "id": "m3-2",
        "type": "packing",
        "x": 11,
        "y": 5,
        "rotation": 1
      }
    ],
    "referenceRate": 8.241758241758243,
    "startRate": 3.0120481927710845,
    "tested": 161,
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m1-1",
      "w5": "m2-1",
      "w6": "m3-1",
      "w7": "m1-2",
      "w8": "m2-2",
      "w9": "m3-2",
      "w10": "outbound",
      "w11": null,
      "w12": null,
      "w13": null,
      "w14": null,
      "w15": null,
      "w16": null,
      "w17": null,
      "w18": null,
      "w19": null,
      "w20": null
    },
    "parallelCandidates": 39,
    "referenceLines": 3
  },
  "sample-10": {
    "target": 4.7,
    "startLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 13,
        "y": 11,
        "rotation": 1
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 2,
        "y": 3,
        "rotation": 2
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 17,
        "y": 10,
        "rotation": 0
      }
    ],
    "referenceLayout": [
      {
        "id": "m1",
        "type": "cutter",
        "x": 10,
        "y": 1,
        "rotation": 3
      },
      {
        "id": "m2",
        "type": "assembly",
        "x": 13,
        "y": 11,
        "rotation": 3
      },
      {
        "id": "m3",
        "type": "packing",
        "x": 8,
        "y": 0,
        "rotation": 0
      },
      {
        "id": "m1-1",
        "type": "cutter",
        "x": 3,
        "y": 3,
        "rotation": 1
      },
      {
        "id": "m2-1",
        "type": "assembly",
        "x": 7,
        "y": 5,
        "rotation": 2
      },
      {
        "id": "m3-1",
        "type": "packing",
        "x": 16,
        "y": 10,
        "rotation": 1
      },
      {
        "id": "m1-2",
        "type": "cutter",
        "x": 1,
        "y": 10,
        "rotation": 1
      },
      {
        "id": "m2-2",
        "type": "assembly",
        "x": 4,
        "y": 12,
        "rotation": 3
      },
      {
        "id": "m3-2",
        "type": "packing",
        "x": 6,
        "y": 17,
        "rotation": 2
      }
    ],
    "referenceRate": 5.300353356890459,
    "startRate": 2.9296875,
    "tested": 160,
    "referenceAssignments": {
      "w1": "m1",
      "w2": "m2",
      "w3": "m3",
      "w4": "m1-1",
      "w5": "m2-1",
      "w6": "m3-1",
      "w7": "m1-2",
      "w8": "m2-2",
      "w9": "m3-2",
      "w10": "outbound",
      "w11": null,
      "w12": null,
      "w13": null,
      "w14": null,
      "w15": null,
      "w16": null,
      "w17": null,
      "w18": null,
      "w19": null,
      "w20": null
    },
    "parallelCandidates": 17,
    "referenceLines": 3
  }
};
