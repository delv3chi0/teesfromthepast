// frontend/src/components/admin/common/KeyValueGrid.jsx
// Key-value display grid for configuration data
import React from 'react';
import { SimpleGrid, Box, Text, Badge, HStack, Tooltip, VStack } from '@chakra-ui/react';

/**
 * KeyValueGrid - Display key-value pairs in a responsive grid
 */
export default function KeyValueGrid({ 
  data = {}, 
  columns = { base: 1, md: 2, lg: 3 },
  spacing = 4 
}) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <Text color="gray.500" fontStyle="italic">
        No data available
      </Text>
    );
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return <Badge colorScheme="gray">null</Badge>;
    }
    if (typeof value === 'boolean') {
      return <Badge colorScheme={value ? 'green' : 'red'}>{value ? 'true' : 'false'}</Badge>;
    }
    if (typeof value === 'object') {
      return <Badge colorScheme="blue">object</Badge>;
    }
    if (typeof value === 'string' && value.length > 50) {
      return (
        <Tooltip label={value}>
          <Text noOfLines={1} cursor="help">
            {value}
          </Text>
        </Tooltip>
      );
    }
    return <Text>{String(value)}</Text>;
  };

  return (
    <SimpleGrid columns={columns} spacing={spacing}>
      {entries.map(([key, value]) => (
        <Box key={key} p={3} borderWidth="1px" borderRadius="md" bg="white">
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" fontWeight="bold" color="gray.600" noOfLines={1}>
              {key}
            </Text>
            {formatValue(value)}
          </VStack>
        </Box>
      ))}
    </SimpleGrid>
  );
}