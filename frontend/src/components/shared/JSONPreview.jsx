// frontend/src/components/shared/JSONPreview.jsx
/**
 * JSON preview component with syntax highlighting and copy functionality
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  useClipboard,
  useToast,
  Text,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FaCopy, FaDownload, FaExpand, FaCompress } from 'react-icons/fa';

/**
 * JSONPreview component for displaying formatted JSON data
 * @param {Object} props
 * @param {Object} props.data - JSON data to display
 * @param {string} [props.title] - Optional title for the preview
 * @param {boolean} [props.collapsible] - Whether to show expand/collapse (default: true)
 * @param {boolean} [props.downloadable] - Whether to show download button (default: true)
 * @param {string} [props.filename] - Filename for download (default: 'config.json')
 * @param {number} [props.maxHeight] - Maximum height in pixels (default: 400)
 */
export default function JSONPreview({ 
  data, 
  title = 'JSON Data',
  collapsible = true,
  downloadable = true,
  filename = 'config.json',
  maxHeight = 400
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { onCopy } = useClipboard(JSON.stringify(data, null, 2));
  const toast = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    onCopy();
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true
    });
  };

  const handleDownload = () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
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
        title: 'JSON downloaded',
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to download JSON file',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const jsonString = JSON.stringify(data, null, 2);

  if (!data) {
    return (
      <Alert status="info">
        <AlertIcon />
        No data to display
      </Alert>
    );
  }

  return (
    <Box w="100%">
      {/* Header with actions */}
      <HStack justify="space-between" mb={3}>
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {title}
        </Text>
        
        <HStack spacing={2}>
          {collapsible && (
            <Tooltip label={isExpanded ? 'Collapse' : 'Expand'} hasArrow>
              <IconButton
                size="sm"
                variant="ghost"
                icon={isExpanded ? <FaCompress /> : <FaExpand />}
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              />
            </Tooltip>
          )}
          
          <Tooltip label="Copy JSON" hasArrow>
            <IconButton
              size="sm"
              variant="ghost"
              icon={<FaCopy />}
              onClick={handleCopy}
              aria-label="Copy JSON"
            />
          </Tooltip>
          
          {downloadable && (
            <Tooltip label="Download JSON" hasArrow>
              <IconButton
                size="sm"
                variant="ghost"
                icon={<FaDownload />}
                onClick={handleDownload}
                aria-label="Download JSON"
              />
            </Tooltip>
          )}
        </HStack>
      </HStack>

      {/* JSON Content */}
      <Box
        bg="gray.50"
        border="1px"
        borderColor="gray.200"
        borderRadius="md"
        p={4}
        maxH={isExpanded ? 'none' : `${maxHeight}px`}
        overflowY="auto"
        position="relative"
      >
        <Text
          as="pre"
          fontSize="sm"
          fontFamily="mono"
          whiteSpace="pre-wrap"
          wordBreak="break-all"
          lineHeight="1.5"
          color="gray.800"
        >
          {jsonString}
        </Text>
        
        {/* Fade overlay when collapsed */}
        {!isExpanded && collapsible && jsonString.split('\n').length > 15 && (
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            h="40px"
            bgGradient="linear(to-t, gray.50, transparent)"
            pointerEvents="none"
          />
        )}
      </Box>
      
      {/* Expand prompt for long content */}
      {!isExpanded && collapsible && jsonString.split('\n').length > 15 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsExpanded(true)}
          mt={2}
          w="100%"
          fontSize="xs"
          color="gray.600"
        >
          Click expand to see full content ({jsonString.split('\n').length} lines)
        </Button>
      )}
    </Box>
  );
}