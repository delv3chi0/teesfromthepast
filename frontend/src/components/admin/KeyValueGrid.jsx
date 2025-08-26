import React from "react";
import { SimpleGrid, Box, Text } from "@chakra-ui/react";
export default function KeyValueGrid({ data }) {
  if (!data) return null;
  return (
    <SimpleGrid columns={[1,2,3]} spacing={4}>
      {Object.entries(data).map(([k,v]) => (
        <Box key={k} p={2} bg="gray.50" borderRadius="md">
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" mb={1}>{k}</Text>
          <Text fontFamily="mono" fontSize="sm">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}