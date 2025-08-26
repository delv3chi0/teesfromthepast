// frontend/src/components/admin/common/KeyValueGrid.jsx
// Component for displaying key-value pairs in a grid

import React from 'react';
import { 
  Box, 
  Text, 
  SimpleGrid, 
  VStack, 
  HStack,
  Badge,
  Code 
} from '@chakra-ui/react';

const KeyValueRow = ({ label, value, valueColor, badge, mono = false }) => {
  const renderValue = () => {
    if (badge) {
      return <Badge colorScheme={badge.colorScheme || 'gray'}>{value}</Badge>;
    }
    
    if (mono) {
      return <Code fontSize="sm">{value}</Code>;
    }
    
    return (
      <Text 
        fontSize="sm" 
        color={valueColor || 'gray.600'}
        wordBreak="break-word"
      >
        {value}
      </Text>
    );
  };

  return (
    <HStack justify="space-between" align="start" spacing={4}>
      <Text 
        fontSize="sm" 
        fontWeight="medium" 
        color="gray.700"
        minW="120px"
        flexShrink={0}
      >
        {label}:
      </Text>
      <Box textAlign="right" flex={1}>
        {renderValue()}
      </Box>
    </HStack>
  );
};

const KeyValueGrid = ({ 
  data, 
  columns = 1, 
  spacing = 3,
  ...props 
}) => {
  if (!data || !Array.isArray(data)) {
    return null;
  }

  if (columns === 1) {
    return (
      <VStack spacing={spacing} align="stretch" {...props}>
        {data.map((item, index) => (
          <KeyValueRow 
            key={item.key || index}
            label={item.label}
            value={item.value}
            valueColor={item.valueColor}
            badge={item.badge}
            mono={item.mono}
          />
        ))}
      </VStack>
    );
  }

  return (
    <SimpleGrid columns={columns} spacing={spacing} {...props}>
      {data.map((item, index) => (
        <KeyValueRow 
          key={item.key || index}
          label={item.label}
          value={item.value}
          valueColor={item.valueColor}
          badge={item.badge}
          mono={item.mono}
        />
      ))}
    </SimpleGrid>
  );
};

export default KeyValueGrid;