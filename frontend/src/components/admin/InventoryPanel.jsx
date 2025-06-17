// frontend/src/components/admin/InventoryPanel.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, TableContainer,
  Spinner, Alert, AlertIcon, VStack, Text, useToast, IconButton as ChakraIconButton,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  useDisclosure, FormControl, FormLabel, Input, Select, Switch, HStack, Tooltip, Icon,
  Tag, SimpleGrid, Textarea, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Divider, CloseButton,
  Image, Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Wrap, WrapItem, Radio, RadioGroup, Stack, Flex
} from '@chakra-ui/react';
// IMPORT NEW ICONS FOR REORDERING
import { FaPlus, FaEdit, FaTrashAlt, FaImage, FaStar, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { client } from '../../api/client';
import { useAuth } from '../../context/AuthProvider';

// ... (rest of your component code and constants)

const InventoryPanel = () => {
  // ... (existing states and useAuth, useToast)

  // NEW HANDLER: To move a color variant up or down in the array
  const handleMoveVariant = (colorIndex, direction) => {
    const newVariants = [...productFormData.variants];
    const itemToMove = newVariants[colorIndex];
    const newIndex = colorIndex + direction;

    if (newIndex >= 0 && newIndex < newVariants.length) {
      newVariants.splice(colorIndex, 1); // Remove from current position
      newVariants.splice(newIndex, 0, itemToMove); // Insert at new position

      // If a default display variant was moved, ensure its flag remains true and others false
      // If it was the only one, or now the first, it will correctly be set below.
      if (!newVariants.some(v => v.isDefaultDisplay)) {
        newVariants[0].isDefaultDisplay = true; // Set first as default if none exist
      } else {
        // If the default was moved, ensure its flag is still there and others are false
        // This makes sure only one is default after reorder
        const currentDefaultIndex = newVariants.findIndex(v => v.isDefaultDisplay);
        if (currentDefaultIndex !== -1 && currentDefaultIndex !== newVariants.indexOf(itemToMove)) {
          // If a different default exists, and the moved item wasn't default, keep it.
          // Otherwise, if the moved item was the original default, re-set it.
          // Or if moved default variant is no longer default, re-assign.
          // Simpler: find the current default after the move and ensure it's still default, or set new one.
          const oldDefault = productFormData.variants.find(v => v.isDefaultDisplay);
          newVariants.forEach(v => v.isDefaultDisplay = (v === oldDefault));
          if (!newVariants.some(v => v.isDefaultDisplay) && newVariants.length > 0) {
            newVariants[0].isDefaultDisplay = true; // Fallback to first if somehow no default.
          }
        }
      }
      setProductFormData(prev => ({ ...prev, variants: newVariants }));
    }
  };


  // ... (rest of your handlers)

  return (
    <Box w="100%">
      {/* ... (existing inventory table UI) ... */}

      {/* --- Product Modals --- */}
      <Modal isOpen={isProductModalOpen} onClose={onProductModalClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditingProduct ? 'Edit' : 'Add New'} Product</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {isProductModalLoading ? <VStack justifyContent="center" minH="400px"><Spinner size="xl" /></VStack> : (
            <VStack spacing={6} align="stretch">
                {/* ... (Product Details Box) ... */}

                <Box layerStyle="darkModalInnerSection">
                    <Heading size="sm" mb={4}>Product Variants</Heading>
                    <RadioGroup onChange={(val) => setDefaultVariant(parseInt(val))} value={productFormData.variants.findIndex(v => v.isDefaultDisplay)?.toString() ?? "-1"}>
                      <VStack spacing={4} align="stretch">
                        {(productFormData.variants || []).map((variant, colorIndex) => (
                          (variant && variant.sizes) ?
                          <Accordion
                              key={colorIndex}
                              // DEFAULT COLLAPSED: Removed defaultIndex={[0]}
                              allowToggle
                              borderWidth="1px"
                              borderRadius="md"
                              bg="brand.primary"
                          >
                            <AccordionItem border="none">
                              <Flex align="center" p={2}>
                                <Radio value={colorIndex.toString()} mr={3} colorScheme="yellow"/>
                                <Tooltip label="Set as default display for shop page"><Icon as={FaStar} color={variant.isDefaultDisplay ? "brand.accentYellow" : "brand.textMuted"} mr={2}/></Tooltip>
                                <AccordionButton flex="1">
                                    <HStack w="full" spacing={4}>
                                        <Box w="24px" h="24px" bg={variant.colorHex} borderRadius="full" border="1px solid" borderColor="brand.textMuted"/>
                                        <Text fontWeight="bold" color="brand.textLight">{variant.colorName}</Text>
                                    </HStack>
                                </AccordionButton>
                                {/* NEW: Reordering Buttons */}
                                <Tooltip label="Move Up" isDisabled={colorIndex === 0}>
                                  <ChakraIconButton
                                    icon={<Icon as={FaArrowUp} />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); handleMoveVariant(colorIndex, -1); }}
                                    isDisabled={colorIndex === 0}
                                    mr={1}
                                  />
                                </Tooltip>
                                <Tooltip label="Move Down" isDisabled={colorIndex === productFormData.variants.length - 1}>
                                  <ChakraIconButton
                                    icon={<Icon as={FaArrowDown} />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); handleMoveVariant(colorIndex, 1); }}
                                    isDisabled={colorIndex === productFormData.variants.length - 1}
                                    mr={2}
                                  />
                                </Tooltip>
                                <CloseButton size="sm" onClick={() => handleRemoveColorVariant(colorIndex)} />
                              </Flex>
                            {/* ... (rest of AccordionPanel content - Color Hex, POD Product ID, Image Gallery, Sizes) ... */}
                            <AccordionPanel bg="brand.secondary" pb={4}>
                              <FormControl mb={3}>
                                <FormLabel fontSize="sm">Color Hex</FormLabel>
                                <HStack>
                                  <Input
                                    size="sm"
                                    value={variant.colorHex || ''}
                                    onChange={(e) => handleVariantPropertyChange(colorIndex, 'colorHex', e.target.value)}
                                    placeholder="#RRGGBB"
                                  />
                                  <Box w="24px" h="24px" bg={variant.colorHex} borderRadius="sm" border="1px solid" borderColor="brand.textMuted"/>
                                </HStack>
                              </FormControl>
                              <FormControl><FormLabel fontSize="sm">POD Product ID</FormLabel><Input size="sm" value={variant.podProductId || ''} onChange={(e) => handleVariantPropertyChange(colorIndex, 'podProductId', e.target.value)} /></FormControl>
                              <Divider my={4} /><Heading size="xs" mb={3}>Image Gallery for {variant.colorName}</Heading>
                              <RadioGroup onChange={(idx) => setPrimaryImage(colorIndex, parseInt(idx))} value={variant.imageSet?.findIndex(img => img.isPrimary)?.toString() ?? "-1"}>
                                <VStack align="stretch" spacing={2}>{variant.imageSet?.map((img, imgIndex) => (<HStack key={imgIndex}><Radio value={imgIndex.toString()} colorScheme="green"/><Input flex="1" size="sm" placeholder="https://image.url/shirt.png" value={img.url} onChange={(e) => handleImageSetUrlChange(colorIndex, imgIndex, e.target.value)} /><Image src={img.url} alt="Preview" boxSize="32px" objectFit="cover" borderRadius="sm" bg="whiteAlpha.200" fallback={<Icon as={FaImage} color="brand.textMuted" boxSize="32px" p={1}/>}/><ChakraIconButton size="sm" icon={<Icon as={FaTrashAlt}/>} onClick={() => removeImageFromSet(colorIndex, imgIndex)} isDisabled={variant.imageSet.length <= 1} /></HStack>))}</VStack>
                              </RadioGroup>
                              <Button size="sm" mt={3} onClick={() => addImageToSet(colorIndex)} leftIcon={<FaPlus/>}>Add Image</Button>
                              <Divider my={4} /><Heading size="xs" mb={3}>Available Sizes</Heading>
                              <Wrap spacing={4}>
                                {variant.sizes?.map((size, sizeIndex) => (
                                  <WrapItem key={size.size}>
                                    <VStack p={2} borderWidth="1px" borderRadius="md" spacing={1} minW="180px" bg={size.inStock ? 'green.800' : 'red.800'}>
                                      <HStack justifyContent="space-between" w="100%">
                                        <Text fontWeight="bold">{size.size}</Text>
                                        <Switch size="sm" isChecked={size.inStock} onChange={e => handleSizeDetailChange(colorIndex, sizeIndex, 'inStock', e.target.checked)}/>
                                      </HStack>
                                      <FormControl isDisabled={!size.inStock}>
                                        <FormLabel fontSize="xs">SKU</FormLabel>
                                        <Input size="sm" value={size.sku} onChange={e => handleSizeDetailChange(colorIndex, sizeIndex, 'sku', e.target.value)} />
                                      </FormControl>
                                    </VStack>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            </AccordionPanel>
                            </AccordionItem>
                          </Accordion>
                          : null
                        ))}
                      </VStack>
                    </RadioGroup>
                    {/* ... (rest of "Add New Color Variant" box) ... */}
                </Box>
            </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onProductModalClose} mr={3}>Cancel</Button>
            <Button colorScheme="brandAccentOrange" onClick={handleProductSubmit} isLoading={isProductModalLoading}>Save Changes</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {selectedProduct && (
        <Modal isOpen={isDeleteProductModalOpen} onClose={onDeleteProductModalClose} isCentered>
          <ModalOverlay/>
          <ModalContent>
            <ModalHeader>Confirm Deletion</ModalHeader>
            <ModalCloseButton/>
            <ModalBody>Delete <strong>{selectedProduct.name}</strong>?</ModalBody>
            <ModalFooter>
              <Button onClick={onDeleteProductModalClose}>No</Button>
              <Button colorScheme="red" onClick={handleDeleteProduct}>Yes</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  );
};

export default InventoryPanel;
