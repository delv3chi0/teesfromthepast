// frontend/src/components/VirtualizedTable.jsx
import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';

const ITEM_HEIGHT = 60; // Height of each table row in pixels

// Row component for virtualized rendering
const TableRow = ({ index, style, data }) => {
  const { items, columns, onRowClick } = data;
  const item = items[index];
  
  return (
    <div style={style}>
      <Tr 
        key={item.id || index}
        _hover={{ bg: 'whiteAlpha.100' }}
        cursor={onRowClick ? 'pointer' : 'default'}
        onClick={() => onRowClick && onRowClick(item)}
      >
        {columns.map((col, colIndex) => (
          <Td key={colIndex} py={2}>
            {col.render ? col.render(item) : item[col.key]}
          </Td>
        ))}
      </Tr>
    </div>
  );
};

/**
 * Virtualized table component for large datasets
 * @param {Array} items - Array of data items to display
 * @param {Array} columns - Array of column definitions { key, header, render? }
 * @param {number} height - Height of the virtualized container (default: 400px)
 * @param {Function} onRowClick - Optional click handler for rows
 */
export default function VirtualizedTable({ items, columns, height = 400, onRowClick }) {
  // Only use virtualization for lists with more than 100 items
  const shouldVirtualize = items.length > 100;
  
  if (!shouldVirtualize) {
    // Render normal table for smaller lists
    return (
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              {columns.map((col, index) => (
                <Th key={index}>{col.header}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {items.map((item, index) => (
              <Tr
                key={item.id || index}
                _hover={{ bg: 'whiteAlpha.100' }}
                cursor={onRowClick ? 'pointer' : 'default'}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((col, colIndex) => (
                  <Td key={colIndex}>
                    {col.render ? col.render(item) : item[col.key]}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }
  
  // Render virtualized table for large lists
  return (
    <Box>
      {/* Table header */}
      <Table variant="simple">
        <Thead>
          <Tr>
            {columns.map((col, index) => (
              <Th key={index}>{col.header}</Th>
            ))}
          </Tr>
        </Thead>
      </Table>
      
      {/* Virtualized table body */}
      <Box position="relative" height={height}>
        <List
          height={height}
          itemCount={items.length}
          itemSize={ITEM_HEIGHT}
          itemData={{ items, columns, onRowClick }}
        >
          {TableRow}
        </List>
      </Box>
    </Box>
  );
}