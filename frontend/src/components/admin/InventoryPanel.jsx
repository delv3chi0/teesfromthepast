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
import { FaTags, FaTshirt } from 'react-icons/fa';

import ProductCategoryManager from './ProductCategoryManager.jsx'; // Assuming this component exists
import ProductManager from './ProductManager.jsx'; // Assuming this component exists

const InventoryPanel = () => {
  return (
    <Box w="100%">
      {/* MODIFIED: Heading color changed to textLight for visibility on AdminPage's dark 'paper' background */}
      <Heading size="lg" mb={6} color="brand.textLight" textAlign={{ base: "center", md: "left" }}>
        Inventory & Product Management
      </Heading>
      {/* MODIFIED: Tabs variant and _selected styles for consistency with AdminPage */}
      <Tabs variant="soft-rounded" isLazy> {/* Removed colorScheme="gray" to let _selected take full effect */}
        <TabList flexWrap="wrap" mb="1em"> {/* Added margin-bottom for spacing */}
          <Tab _selected={{ color: 'white', bg: 'brand.primary' }} m={1}>
            <Icon as={FaTags} mr={2} /> Categories
          </Tab>
          <Tab _selected={{ color: 'white', bg: 'brand.primary' }} m={1}>
            <Icon as={FaTshirt} mr={2} /> Products
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0} py={2}> {/* Adjusted padding to match other AdminPage panels */}
            {/* MODIFIED: Wrapped content in a Box with layerStyle="cardBlue" for consistent card appearance */}
            <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}> {/* Add padding here for inner content */}
              <ProductCategoryManager />
            </Box>
          </TabPanel>
          <TabPanel px={0} py={2}> {/* Adjusted padding */}
            {/* MODIFIED: Wrapped content in a Box with layerStyle="cardBlue" for consistent card appearance */}
            <Box layerStyle="cardBlue" w="100%" p={{ base: 2, md: 4 }}>
              <ProductManager />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default InventoryPanel;
