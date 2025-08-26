// frontend/src/components/admin/common/JSONPreview.jsx
import { Box, Button, HStack, useToast, IconButton } from '@chakra-ui/react';
import { FaCopy, FaDownload } from 'react-icons/fa';

/**
 * JSON preview component with copy and export functionality
 */
export default function JSONPreview({ data, title = "JSON Data", ...props }) {
  const toast = useToast();
  
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: error.message,
        status: "error"
      });
    }
  };

  const handleExport = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export started",
      status: "info",
      duration: 2000
    });
  };

  return (
    <Box {...props}>
      <HStack mb={3} justify="space-between">
        <Box fontSize="sm" fontWeight="semibold" color="gray.600">
          {title}
        </Box>
        <HStack spacing={2}>
          <IconButton
            size="xs"
            icon={<FaCopy />}
            onClick={handleCopy}
            aria-label="Copy to clipboard"
            variant="outline"
          />
          <IconButton
            size="xs"
            icon={<FaDownload />}
            onClick={handleExport}
            aria-label="Export JSON"
            variant="outline"
          />
        </HStack>
      </HStack>
      <Box
        as="pre"
        fontSize="xs"
        p={3}
        bg="gray.50"
        borderRadius="md"
        overflow="auto"
        maxH="300px"
        border="1px"
        borderColor="gray.200"
        fontFamily="mono"
      >
        {jsonString}
      </Box>
    </Box>
  );
}