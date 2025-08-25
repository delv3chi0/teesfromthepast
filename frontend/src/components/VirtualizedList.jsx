// frontend/src/components/VirtualizedList.jsx
import { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box } from '@chakra-ui/react';

/**
 * VirtualizedList component for efficient rendering of large datasets
 * Uses react-window for performance optimization
 */
function VirtualizedList({
  items = [],
  itemHeight = 80,
  height = 400,
  width = '100%',
  overscanCount = 5,
  renderItem,
  itemData = null,
  className,
  ...props
}) {
  // Memoize item data to prevent unnecessary re-renders
  const listItemData = useMemo(() => ({
    items,
    renderItem,
    ...itemData
  }), [items, renderItem, itemData]);

  // Row renderer for react-window
  const Row = useCallback(({ index, style, data }) => {
    const item = data.items[index];
    const itemElement = data.renderItem ? data.renderItem(item, index) : item;
    
    return (
      <div style={style}>
        <Box height={`${itemHeight}px`} display="flex" alignItems="center">
          {itemElement}
        </Box>
      </div>
    );
  }, [itemHeight]);

  if (!items || items.length === 0) {
    return (
      <Box 
        height={height} 
        width={width} 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        color="gray.500"
        fontSize="sm"
      >
        No items to display
      </Box>
    );
  }

  return (
    <Box className={className} {...props}>
      <List
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={listItemData}
        overscanCount={overscanCount}
      >
        {Row}
      </List>
    </Box>
  );
}

/**
 * VirtualizedGrid component for grid layouts
 */
function VirtualizedGrid({
  items = [],
  itemWidth = 200,
  itemHeight = 200,
  height = 400,
  width = '100%',
  columnsCount = 'auto',
  gap = 16,
  renderItem,
  className,
  ...props
}) {
  // Calculate columns based on container width if auto
  const calculatedColumns = useMemo(() => {
    if (columnsCount === 'auto' && typeof width === 'number') {
      return Math.floor((width - gap) / (itemWidth + gap));
    }
    return typeof columnsCount === 'number' ? columnsCount : 3;
  }, [columnsCount, width, itemWidth, gap]);

  // Convert items to rows for virtualization
  const rows = useMemo(() => {
    const rowsArray = [];
    for (let i = 0; i < items.length; i += calculatedColumns) {
      rowsArray.push(items.slice(i, i + calculatedColumns));
    }
    return rowsArray;
  }, [items, calculatedColumns]);

  const rowHeight = itemHeight + gap;

  const GridRow = useCallback(({ index, style, data }) => {
    const rowItems = data.rows[index];
    
    return (
      <div style={style}>
        <Box 
          display="flex" 
          gap={`${gap}px`} 
          height={`${itemHeight}px`}
          alignItems="start"
        >
          {rowItems.map((item, itemIndex) => {
            const globalIndex = index * calculatedColumns + itemIndex;
            return (
              <Box 
                key={globalIndex} 
                width={`${itemWidth}px`} 
                height={`${itemHeight}px`}
                flexShrink={0}
              >
                {data.renderItem ? data.renderItem(item, globalIndex) : item}
              </Box>
            );
          })}
        </Box>
      </div>
    );
  }, [itemHeight, itemWidth, gap, calculatedColumns]);

  const listItemData = useMemo(() => ({
    rows,
    renderItem
  }), [rows, renderItem]);

  if (!items || items.length === 0) {
    return (
      <Box 
        height={height} 
        width={width} 
        display="flex" 
        alignItems="center" 
        justifyContent="center"
        color="gray.500"
        fontSize="sm"
      >
        No items to display
      </Box>
    );
  }

  return (
    <Box className={className} {...props}>
      <List
        height={height}
        width={width}
        itemCount={rows.length}
        itemSize={rowHeight}
        itemData={listItemData}
        overscanCount={2}
      >
        {GridRow}
      </List>
    </Box>
  );
}

export { VirtualizedList, VirtualizedGrid };
export default VirtualizedList;