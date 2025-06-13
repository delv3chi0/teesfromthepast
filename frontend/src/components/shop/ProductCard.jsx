import React, { useState, useEffect } from 'react';
import {
  Box,
  Image,
  Text,
  Heading,
  Icon,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
  VStack,
  HStack,
  Flex,
  Divider
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FaImage, FaCheckCircle } from 'react-icons/fa';

const ProductCard = ({ product }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();

  // State to manage selections within the modal
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');

  // When the modal opens, pre-select the first available color if possible
  const handleOpenModal = () => {
    if (product?.variants?.[0]) {
      setSelectedColor(product.variants[0]);
    }
    onOpen();
  };

  const handleCloseModal = () => {
    setSelectedColor(null);
    setSelectedSize('');
    onClose();
  };

  // Logic to derive available sizes from the selected color
  const availableSizes = selectedColor?.sizes?.filter(s => s.inStock) || [];

  const handleCustomizeClick = () => {
    if (!selectedColor || !selectedSize) {
        // This button should be disabled, but as a safeguard:
        alert("Please select a color and size.");
        return;
    }
    handleCloseModal();
    navigate(`/product-studio?productId=${product._id}&color=${selectedColor.colorName}&size=${selectedSize}`);
  };

  // Determine the image to display in the modal based on the selected color
  const modalImage = selectedColor?.imageSet?.find(img => img.isPrimary)?.url || selectedColor?.imageSet?.[0]?.url || product.defaultImage;

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
        onClick={handleOpenModal}
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

      <Modal isOpen={isOpen} onClose={handleCloseModal} isCentered size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{product.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex direction={{base: 'column', md: 'row'}} gap={8}>
              <Box flex="1">
                <Image src={modalImage} alt="Product" borderRadius="md" objectFit="cover" />
              </Box>
              <VStack flex="1" align="start" spacing={6}>
                <Box w="full">
                    <Heading size="sm" mb={2}>Color: <Text as="span" fontWeight="normal">{selectedColor?.colorName || 'Select a color'}</Text></Heading>
                    <HStack spacing={3}>
                        {(product.variants || []).map(variant => (
                            <Tooltip key={variant.colorName} label={variant.colorName} placement="top">
                                <Box
                                    as="button"
                                    h="40px"
                                    w="40px"
                                    borderRadius="full"
                                    bg={variant.colorHex}
                                    border="3px solid"
                                    borderColor={selectedColor?.colorName === variant.colorName ? 'brand.accentYellow' : 'transparent'}
                                    onClick={() => { setSelectedColor(variant); setSelectedSize(''); }}
                                />
                            </Tooltip>
                        ))}
                    </HStack>
                </Box>
                <Divider />
                <Box w="full">
                    <Heading size="sm" mb={2}>Size:</Heading>
                    <HStack spacing={3} wrap="wrap">
                        {availableSizes.map(sizeInfo => (
                             <Button 
                                key={sizeInfo.size}
                                onClick={() => setSelectedSize(sizeInfo.size)}
                                isActive={selectedSize === sizeInfo.size}
                                variant={selectedSize === sizeInfo.size ? 'solid' : 'outline'}
                                colorScheme={selectedSize === sizeInfo.size ? 'yellow' : 'gray'}
                             >
                                 {sizeInfo.size}
                             </Button>
                        ))}
                    </HStack>
                </Box>
              </VStack>
            </Flex>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseModal}>
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
