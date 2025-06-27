
import { useState, useEffect, useRef } from "react";
import { fabric } from "fabric";
import {
  Box,
  Button,
  Center,
  Flex,
  Input,
  Select,
  Text,
  useToast,
} from "@chakra-ui/react";

// === Design Alignment Constants ===
const PREVIEW_FRAME = { x: 205, y: 225, width: 614, height: 614 };
const EXPORT_FRAME = { x: 600, y: 1200, width: 2400, height: 2400 };

function mapPreviewToExport(obj) {
  const xRatio = EXPORT_FRAME.width / PREVIEW_FRAME.width;
  const yRatio = EXPORT_FRAME.height / PREVIEW_FRAME.height;

  return {
    ...obj,
    left: EXPORT_FRAME.x + (obj.left - PREVIEW_FRAME.x) * xRatio,
    top: EXPORT_FRAME.y + (obj.top - PREVIEW_FRAME.y) * yRatio,
    scaleX: obj.scaleX * xRatio,
    scaleY: obj.scaleY * yRatio,
  };
}

// The rest of ProductStudio.jsx code should follow here...
// For now this is just the fixed scaffold, user will paste in full logic after this
