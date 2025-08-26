// frontend/src/components/admin/common/JSONPreview.jsx
// Component for displaying JSON data with syntax highlighting

import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  useToast,
  Code,
  Text,
  VStack,
  HStack
} from '@chakra-ui/react';
import { FaCopy, FaDownload } from 'react-icons/fa';

const JSONPreview = ({ 
  data, 
  maxHeight = "400px",
  showActions = true,
  filename = "data.json",
  ...props 
}) => {
  const toast = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const isLarge = jsonString.length > 1000;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Failed to copy to clipboard",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const downloadJSON = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "File downloaded",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Failed to download file",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const displayHeight = isExpanded ? "auto" : maxHeight;

  return (
    <VStack spacing={3} align="stretch" {...props}>
      {showActions && (
        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.600">
            {jsonString.length} characters
          </Text>
          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<FaCopy />}
              onClick={copyToClipboard}
              variant="outline"
            >
              Copy
            </Button>
            <Button
              size="sm"
              leftIcon={<FaDownload />}
              onClick={downloadJSON}
              variant="outline"
            >
              Download
            </Button>
          </HStack>
        </HStack>
      )}
      
      <Box
        position="relative"
        borderWidth={1}
        borderColor="gray.200"
        borderRadius="md"
        overflow="hidden"
      >
        <Box
          as="pre"
          p={4}
          fontSize="sm"
          lineHeight="1.5"
          overflowX="auto"
          overflowY={isExpanded ? "auto" : "hidden"}
          maxHeight={displayHeight}
          bg="gray.50"
          fontFamily="mono"
          whiteSpace="pre-wrap"
          wordBreak="break-word"
        >
          <Code 
            colorScheme="gray" 
            variant="unstyled"
            fontSize="inherit"
            fontFamily="inherit"
            whiteSpace="inherit"
            wordBreak="inherit"
          >
            {jsonString}
          </Code>
        </Box>
        
        {isLarge && !isExpanded && (
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            height="40px"
            bgGradient="linear(to-t, gray.50, transparent)"
            display="flex"
            alignItems="end"
            justifyContent="center"
            pb={2}
          >
            <Button
              size="sm"
              onClick={() => setIsExpanded(true)}
              variant="solid"
              colorScheme="blue"
              fontSize="xs"
            >
              Show More
            </Button>
          </Box>
        )}
        
        {isExpanded && (
          <Box p={2} bg="gray.100" borderTop="1px" borderColor="gray.200">
            <Button
              size="sm"
              onClick={() => setIsExpanded(false)}
              variant="ghost"
              fontSize="xs"
              width="100%"
            >
              Show Less
            </Button>
          </Box>
        )}
      </Box>
    </VStack>
  );
};

export default JSONPreview;