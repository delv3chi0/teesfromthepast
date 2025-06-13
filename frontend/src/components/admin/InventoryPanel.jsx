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
} from '@chakra-ui/react';
import { FaTshirt } from 'react-icons/fa'; // Removed FaTags as categories are gone

import ProductManager from './ProductManager.jsx';

const InventoryPanel = () => {
  return (
    <Box w="100%">
      <Heading size="lg" mb={6} color="brand.textDark" textAlign={{ base: "center", md: "left" }}>
        Inventory & Product Management
      </Heading>
      <Tabs variant="enclosed-colored" colorScheme="gray" isLazy>
        <TabList flexWrap="wrap">
          {/* Removed Categories Tab */}
          <Tab _selected={{ color: 'brand.textDark', bg: 'gray.100', fontWeight: 'bold' }} m={1}>
            <Icon as={FaTshirt} mr={2} /> Products
          </Tab>
        </TabList>
        <TabPanels>
          {/* Removed Categories TabPanel */}
          <TabPanel px={0} py={4}>
            <ProductManager />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default InventoryPanel;
