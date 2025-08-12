// frontend/src/components/ColorDots.jsx
import React from "react";
import { HStack, Box, Tooltip } from "@chakra-ui/react";
import { nameToHex } from "../data/colorPalette";

export default function ColorDots({ colors = [], max = 10, size = 4 }) {
  if (!colors.length) return null;
  const shown = colors.slice(0, max);
  const overflow = colors.length - shown.length;

  return (
    <HStack spacing={2} wrap="wrap">
      {shown.map((c) => {
        const hex = nameToHex(c);
        return (
          <Tooltip label={c} key={c}>
            <Box
              as="span"
              w={`${size}ch`}
              h={`${size}ch`}
              borderRadius="full"
              border="2px solid rgba(255,255,255,0.25)"
              style={{ background: hex }}
              boxShadow="inset 0 0 0 1px rgba(0,0,0,0.25)"
            />
          </Tooltip>
        );
      })}
      {overflow > 0 && (
        <Box as="span" fontSize="xs" color="whiteAlpha.800">+{overflow}</Box>
      )}
    </HStack>
  );
}
