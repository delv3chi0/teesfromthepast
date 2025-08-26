// frontend/src/components/admin/common/JSONPreview.jsx
// JSON preview component with copy and download functionality
import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  HStack, 
  useToast, 
  Text,
  Code
} from '@chakra-ui/react';
import { FaCopy, FaDownload } from 'react-icons/fa';

const JSONPreview = ({ 
  data, 
  filename = 'config.json',
  showControls = true,
  maxHeight = '400px',
  ...props 
}) => {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast({
        title: 'Copied to clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'File downloaded',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to download',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (!data) {
    return (
      <Text color="gray.500" fontStyle="italic">
        No data available
      </Text>
    );
  }

  return (
    <Box {...props}>
      {showControls && (
        <HStack mb={3} justify="flex-end">
          <Button
            size="sm"
            leftIcon={<FaCopy />}
            onClick={handleCopy}
            variant="outline"
            isDisabled={copied}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            size="sm"
            leftIcon={<FaDownload />}
            onClick={handleDownload}
            variant="outline"
          >
            Download
          </Button>
        </HStack>
      )}
      <Box
        bg="gray.50"
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
        maxHeight={maxHeight}
        overflow="auto"
      >
        <Code 
          fontSize="sm" 
          whiteSpace="pre" 
          display="block"
          bg="transparent"
          p={0}
        >
          {jsonString}
        </Code>
      </Box>
    </Box>
  );
};

export default JSONPreview;