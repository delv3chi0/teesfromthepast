// frontend/src/components/admin/InventoryPanel.jsx
import React from 'react';
import {
  Box,
  Heading,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Icon,
  // Text, // No longer needed for placeholders here
} from '@chakra-ui/react';
import { FaTags, FaShapes, FaTshirt } from 'react-icons/fa';

import ProductCategoryManager from './ProductCategoryManager.jsx';
import ProductTypeManager from './ProductTypeManager.jsx';
// --- IMPORT THE ACTUAL ProductManager ---
import ProductManager from './ProductManager.jsx';


const InventoryPanel = () => {
  return (
    <Box w="100%">
      <Heading size="lg" mb={6} color="brand.textDark" textAlign={{ base: "center", md: "left" }}>
        Inventory & Product Management
      </Heading>
      <Tabs variant="enclosed-colored" colorScheme="gray" isLazy>
        <TabList flexWrap="wrap">
          <Tab _selected={{ color: 'brand.textDark', bg: 'gray.100', fontWeight: 'bold' }} m={1}>
            <Icon as={FaTags} mr={2} /> Product Categories
          </Tab>
          <Tab _selected={{ color: 'brand.textDark', bg: 'gray.100', fontWeight: 'bold' }} m={1}>
            <Icon as={FaShapes} mr={2} /> Product Types
          </Tab>
          <Tab _selected={{ color: 'brand.textDark', bg: 'gray.100', fontWeight: 'bold' }} m={1}>
            <Icon as={FaTshirt} mr={2} /> Products
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} py={4}>
            <ProductCategoryManager />
          </TabPanel>
          <TabPanel px={0} py={4}>
            <ProductTypeManager />
          </TabPanel>
          <TabPanel px={0} py={4}>
            {/* Now using the imported ProductManager */}
            <ProductManager />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default InventoryPanel;
