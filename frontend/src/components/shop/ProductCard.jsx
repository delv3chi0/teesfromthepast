import React, { useState } from 'react';
import { 
    Box, 
    Image, 
    Text, 
    Heading, 
    Icon, 
    Flex, 
    Button, 
    Modal, 
    ModalOverlay, 
    ModalContent, 
    ModalHeader, 
    ModalCloseButton, 
    ModalBody, 
    ModalFooter, 
    Select, 
    useDisclosure, 
    Tooltip,
    VStack, // MODIFIED: Added missing VStack import
    FormControl,
    FormLabel
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FaImage } from 'react-icons/fa';

const ProductCard = ({ product }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const handleCustomizeClick = () => {
    onClose();
    // Pass selections as URL search parameters
    navigate(`/product-studio?productId=${product._id}&color=${selectedColor}&size=${selectedSize}`);
  };

  const availableColors = product ? [...new Map((product.variants || []).map(v => [v.colorName, v])).values()] : [];
  
  // Correctly find the sizes for the selected color from the new data structure
  const sizesForSelectedColor = product?.variants
    .find(variant => variant.colorName === selectedColor)
    ?.sizes?.map(sizeInfo => sizeInfo.size) || [];
  
  return (
    <>
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        overflow="hidden" 
        transition="all 0.2s ease-in-out" 
        _hover={{ shadow: 'lg', transform: 'translateY(-4px)', borderColor: "brand.accentYellow" }} 
        cursor='pointer' 
        display="flex" 
        flexDirection="column"
        bg="brand.cardBlue"
        borderColor="transparent"
        onClick={onOpen}
      >
        <Box h="250px" bg="brand.secondary" p={2} display="flex" alignItems="center" justifyContent="center">
          <Image
            src={product.defaultImage}
            alt={`Image of ${product.name}`}
            objectFit="contain"
            w="100%"
            h="100%"
            fallback={<Icon as={FaImage} boxSize="50px" color="gray.500" />}
          />
        </Box>
        <Box p="4" flex="1" display="flex" flexDirection="column">
          <Heading as="h3" size="sm" fontWeight="semibold" noOfLines={1} title={product.name} color="brand.textLight">
            {product.name}
          </Heading>
          <Text fontSize="sm" color="brand.textMuted" mt={1} noOfLines={2} h="40px" flex="1">
            {product.description}
          </Text>
          <Text mt={2} fontSize="xl" color="brand.accentYellow" fontWeight="bold">
            ${product.basePrice.toFixed(2)}
          </Text>
        </Box>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{product.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Color</FormLabel>
                <Select placeholder="Select color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                  {availableColors.map(variant => <option key={variant.colorName} value={variant.colorName}>{variant.colorName}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Size</FormLabel>
                <Select placeholder="Select size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} isDisabled={!selectedColor}>
                   {sizesForSelectedColor.map(size => <option key={size} value={size}>{size}</option>)}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="brandAccentOrange" 
              onClick={handleCustomizeClick}
              isDisabled={!selectedColor || !selectedSize}
            >
              Customize
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ProductCard;
