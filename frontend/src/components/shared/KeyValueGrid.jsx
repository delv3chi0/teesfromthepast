// frontend/src/components/shared/KeyValueGrid.jsx
/**
 * Reusable key-value grid component for displaying configuration data
 */

import React from 'react';
import {
  Grid,
  GridItem,
  Text,
  Badge,
  Code,
  HStack,
  VStack,
  Tooltip,
  IconButton,
  useClipboard
} from '@chakra-ui/react';
import { FaCopy } from 'react-icons/fa';

/**
 * KeyValueGrid component for displaying configuration or status information
 * @param {Object} props
 * @param {Array<Object>} props.items - Array of { key, value, type?, copyable?, tooltip? }
 * @param {number} [props.columns] - Number of columns (default: 2)
 * @param {Object} [props.gridProps] - Additional props for Grid component
 */
export default function KeyValueGrid({ items, columns = 2, gridProps = {} }) {
  const { onCopy } = useClipboard('');

  const renderValue = (item) => {
    const { value, type, copyable, tooltip } = item;

    let renderedValue;

    switch (type) {
      case 'badge':
        renderedValue = (
          <Badge 
            colorScheme={value === true || value === 'enabled' ? 'green' : 'gray'}
            variant="subtle"
          >
            {String(value)}
          </Badge>
        );
        break;
        
      case 'code':
        renderedValue = (
          <Code fontSize="sm" p={1} borderRadius="md">
            {String(value)}
          </Code>
        );
        break;
        
      case 'boolean':
        renderedValue = (
          <Badge 
            colorScheme={value ? 'green' : 'red'}
            variant="subtle"
          >
            {value ? 'Enabled' : 'Disabled'}
          </Badge>
        );
        break;
        
      case 'number':
        renderedValue = (
          <Text fontFamily="mono" fontSize="sm" fontWeight="medium">
            {typeof value === 'number' ? value.toLocaleString() : String(value)}
          </Text>
        );
        break;
        
      case 'array':
        if (Array.isArray(value) && value.length === 0) {
          renderedValue = <Text color="gray.500" fontSize="sm">None</Text>;
        } else if (Array.isArray(value)) {
          renderedValue = (
            <VStack align="start" spacing={1}>
              {value.slice(0, 3).map((item, index) => (
                <Badge key={index} variant="outline" fontSize="xs">
                  {String(item)}
                </Badge>
              ))}
              {value.length > 3 && (
                <Text fontSize="xs" color="gray.500">
                  +{value.length - 3} more
                </Text>
              )}
            </VStack>
          );
        } else {
          renderedValue = <Text>{String(value)}</Text>;
        }
        break;
        
      default:
        renderedValue = <Text>{value || '—'}</Text>;
    }

    if (copyable && value) {
      renderedValue = (
        <HStack spacing={2} align="center">
          {renderedValue}
          <Tooltip label="Copy to clipboard" hasArrow>
            <IconButton
              size="xs"
              variant="ghost"
              icon={<FaCopy />}
              onClick={() => {
                navigator.clipboard.writeText(String(value));
                onCopy();
              }}
              aria-label="Copy value"
            />
          </Tooltip>
        </HStack>
      );
    }

    if (tooltip) {
      renderedValue = (
        <Tooltip label={tooltip} hasArrow placement="top" maxW="300px">
          <Box cursor="help">{renderedValue}</Box>
        </Tooltip>
      );
    }

    return renderedValue;
  };

  return (
    <Grid 
      templateColumns={`repeat(${columns}, 1fr)`}
      gap={4}
      {...gridProps}
    >
      {items.map((item, index) => (
        <React.Fragment key={item.key || index}>
          <GridItem>
            <Text fontSize="sm" fontWeight="medium" color="gray.700">
              {item.key}
            </Text>
          </GridItem>
          <GridItem>
            {renderValue(item)}
          </GridItem>
        </React.Fragment>
      ))}
    </Grid>
  );
}