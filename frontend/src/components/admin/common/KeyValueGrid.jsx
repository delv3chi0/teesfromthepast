// frontend/src/components/admin/common/KeyValueGrid.jsx
// Grid component for displaying key-value pairs
import React from 'react';
import { SimpleGrid, Text, Code, Box } from '@chakra-ui/react';

const KeyValueGrid = ({ data, columns = 2, spacing = 4 }) => {
  if (!data || typeof data !== 'object') {
    return <Text color="gray.500">No data available</Text>;
  }

  const entries = Object.entries(data);

  return (
    <SimpleGrid columns={columns} spacing={spacing}>
      {entries.map(([key, value]) => (
        <Box key={key}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </Text>
          <Code 
            fontSize="sm" 
            colorScheme="gray" 
            p={2} 
            borderRadius="md"
            display="block"
            wordBreak="break-word"
          >
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </Code>
        </Box>
      ))}
    </SimpleGrid>
  );
};

export default KeyValueGrid;