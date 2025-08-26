// frontend/src/components/admin/common/JSONPreview.jsx
// JSON preview component with copy-to-clipboard functionality
import React, { useState } from 'react';
import { 
  Box, 
  Text, 
  Button, 
  HStack, 
  useToast, 
  IconButton,
  Tooltip,
  useColorModeValue 
} from '@chakra-ui/react';
import { FaCopy, FaExpand, FaCompress } from 'react-icons/fa';

/**
 * JSONPreview - Display JSON data with formatting and copy functionality
 */
export default function JSONPreview({ 
  data, 
  title = "JSON Data",
  collapsible = true,
  maxHeight = "400px",
  fontSize = "sm"
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toast = useToast();
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleCopy = async () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      toast({
        title: "JSON copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Failed to copy JSON",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <Box>
      <HStack justify="space-between" mb={2}>
        <Text fontWeight="semibold" fontSize="md">
          {title}
        </Text>
        <HStack spacing={2}>
          {collapsible && (
            <Tooltip label={isExpanded ? "Collapse" : "Expand"}>
              <IconButton
                size="sm"
                variant="ghost"
                icon={isExpanded ? <FaCompress /> : <FaExpand />}
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Collapse" : "Expand"}
              />
            </Tooltip>
          )}
          <Tooltip label="Copy JSON to clipboard">
            <IconButton
              size="sm"
              variant="ghost"
              icon={<FaCopy />}
              onClick={handleCopy}
              aria-label="Copy JSON"
            />
          </Tooltip>
        </HStack>
      </HStack>
      
      <Box
        bg={bgColor}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="md"
        p={4}
        maxHeight={isExpanded ? "none" : maxHeight}
        overflowY={isExpanded ? "visible" : "auto"}
        position="relative"
      >
        <Text
          as="pre"
          fontSize={fontSize}
          fontFamily="mono"
          lineHeight="1.4"
          whiteSpace="pre-wrap"
          wordBreak="break-word"
        >
          {jsonString}
        </Text>
        
        {!isExpanded && jsonString.split('\n').length > 20 && (
          <Box
            position="absolute"
            bottom="0"
            left="0"
            right="0"
            height="40px"
            bgGradient={`linear(to-t, ${bgColor}, transparent)`}
            display="flex"
            alignItems="end"
            justifyContent="center"
            pb={2}
          >
            <Button
              size="sm"
              variant="solid"
              onClick={() => setIsExpanded(true)}
              leftIcon={<FaExpand />}
            >
              Show More
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}