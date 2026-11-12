// Two pillars occupy spare tiles outside the reference production line.
export const firstBoxStage = {
  "width": 9,
  "height": 5,
  "fixtures": [
    {
      "id": "inbound",
      "x": 0,
      "y": 0,
      "width": 2,
      "height": 2,
      "access": {
        "x": 2,
        "y": 1
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
  "pillars": [
    {"x": 1, "y": 2},
    {"x": 7, "y": 2}
  ],
  "inventory": [
    {
      "type": "cutter",
      "id": "m1",
      "variant": "S"
    },
    {
      "type": "assembly",
      "id": "m2",
      "variant": "S"
    },
    {
      "type": "packing",
      "id": "m3",
      "variant": "J"
    },
    {
      "type": "cutter",
      "id": "extra1",
      "variant": "J"
    },
    {
      "type": "assembly",
      "id": "extra2",
      "variant": "O"
    },
    {
      "type": "packing",
      "id": "extra3",
      "variant": "L"
    }
  ],
  "referenceLayout": [
    {
      "type": "cutter",
      "id": "m1",
      "variant": "S",
      "x": 2,
      "y": 0,
      "rotation": 0
    },
    {
      "type": "assembly",
      "id": "m2",
      "variant": "S",
      "x": 4,
      "y": 1,
      "rotation": 1
    },
    {
      "type": "packing",
      "id": "m3",
      "variant": "J",
      "x": 4,
      "y": 3,
      "rotation": 0
    }
  ],
  "referenceMeanSeconds": 16.1548,
  "targetPerMinute": 3.7,
  "cells": [
    "0,0",
    "1,0",
    "2,0",
    "3,0",
    "4,0",
    "5,0",
    "0,1",
    "1,1",
    "2,1",
    "3,1",
    "4,1",
    "5,1",
    "0,2",
    "1,2",
    "2,2",
    "3,2",
    "4,2",
    "5,2",
    "6,2",
    "7,2",
    "8,2",
    "3,3",
    "4,3",
    "5,3",
    "6,3",
    "7,3",
    "8,3",
    "3,4",
    "4,4",
    "5,4",
    "6,4",
    "7,4",
    "8,4"
  ]
};
