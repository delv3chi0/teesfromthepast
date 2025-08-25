// frontend/src/components/Skeleton.jsx
import { Box, Skeleton as ChakraSkeleton, SkeletonText, HStack, VStack, AspectRatio } from '@chakra-ui/react';

/**
 * Card Skeleton - for design cards, product cards, etc.
 */
export function SkeletonCard({ aspectRatio = 4/3, showText = true, ...props }) {
  return (
    <Box borderRadius="md" overflow="hidden" {...props}>
      <AspectRatio ratio={aspectRatio}>
        <ChakraSkeleton borderRadius="md" />
      </AspectRatio>
      {showText && (
        <VStack p={3} spacing={2} align="stretch">
          <ChakraSkeleton height="20px" />
          <SkeletonText noOfLines={2} spacing="2" />
        </VStack>
      )}
    </Box>
  );
}

/**
 * List Item Skeleton - for lists, tables, etc.
 */
export function SkeletonListItem({ showAvatar = false, lines = 2, ...props }) {
  return (
    <HStack spacing={3} p={3} {...props}>
      {showAvatar && (
        <ChakraSkeleton borderRadius="full" boxSize="40px" />
      )}
      <VStack flex={1} spacing={2} align="stretch">
        <ChakraSkeleton height="20px" />
        {lines > 1 && <SkeletonText noOfLines={lines - 1} spacing="2" />}
      </VStack>
    </HStack>
  );
}

/**
 * Button Skeleton
 */
export function SkeletonButton({ width = "100px", height = "40px", ...props }) {
  return (
    <ChakraSkeleton 
      width={width} 
      height={height} 
      borderRadius="md" 
      {...props} 
    />
  );
}

/**
 * Text Block Skeleton
 */
export function SkeletonTextBlock({ lines = 3, ...props }) {
  return (
    <VStack spacing={2} align="stretch" {...props}>
      <ChakraSkeleton height="24px" />
      <SkeletonText noOfLines={lines - 1} spacing="2" />
    </VStack>
  );
}

/**
 * Grid Skeleton - for design grids, product grids, etc.
 */
export function SkeletonGrid({ 
  columns = { base: 1, sm: 2, md: 3, lg: 4 }, 
  itemCount = 12, 
  spacing = 4,
  aspectRatio = 4/3,
  showText = true,
  ...props 
}) {
  const skeletonItems = Array.from({ length: itemCount }, (_, i) => (
    <SkeletonCard 
      key={i} 
      aspectRatio={aspectRatio} 
      showText={showText}
    />
  ));

  return (
    <VStack spacing={6} {...props}>
      {/* Title skeleton */}
      <ChakraSkeleton height="32px" width="200px" />
      
      {/* Grid skeleton */}
      <Box
        display="grid"
        gridTemplateColumns={
          typeof columns === 'object'
            ? {
                base: `repeat(${columns.base || 1}, 1fr)`,
                sm: `repeat(${columns.sm || 2}, 1fr)`,
                md: `repeat(${columns.md || 3}, 1fr)`,
                lg: `repeat(${columns.lg || 4}, 1fr)`,
              }
            : `repeat(${columns}, 1fr)`
        }
        gap={spacing}
        width="100%"
      >
        {skeletonItems}
      </Box>
    </VStack>
  );
}

/**
 * Page Skeleton - for full page loading states
 */
export function SkeletonPage({ 
  showHeader = true, 
  showSidebar = false, 
  showContent = true,
  ...props 
}) {
  return (
    <VStack spacing={6} p={6} {...props}>
      {/* Header skeleton */}
      {showHeader && (
        <HStack w="100%" justify="space-between">
          <ChakraSkeleton height="40px" width="200px" />
          <HStack spacing={3}>
            <SkeletonButton />
            <SkeletonButton />
          </HStack>
        </HStack>
      )}
      
      {/* Main content */}
      <HStack w="100%" align="start" spacing={6}>
        {/* Sidebar skeleton */}
        {showSidebar && (
          <VStack w="250px" spacing={4} align="stretch">
            {Array.from({ length: 5 }, (_, i) => (
              <ChakraSkeleton key={i} height="32px" />
            ))}
          </VStack>
        )}
        
        {/* Content skeleton */}
        {showContent && (
          <VStack flex={1} spacing={6} align="stretch">
            <SkeletonTextBlock lines={5} />
            <SkeletonGrid itemCount={8} />
          </VStack>
        )}
      </HStack>
    </VStack>
  );
}

export default ChakraSkeleton;