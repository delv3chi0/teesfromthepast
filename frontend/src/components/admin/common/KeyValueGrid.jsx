// frontend/src/components/admin/common/KeyValueGrid.jsx
import { SimpleGrid, Box, Text, Code } from '@chakra-ui/react';

/**
 * Displays key-value pairs in a consistent grid layout
 */
export default function KeyValueGrid({ data, columns = 2, ...props }) {
  const entries = Array.isArray(data) ? data : Object.entries(data || {});

  return (
    <SimpleGrid columns={columns} spacing={3} {...props}>
      {entries.map(([key, value], index) => (
        <Box key={index}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
            {key}
          </Text>
          <Code fontSize="sm" colorScheme="gray" p={2} borderRadius="md" display="block">
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </Code>
        </Box>
      ))}
    </SimpleGrid>
  );
}