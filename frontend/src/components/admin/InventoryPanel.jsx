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
  Text, // Added for placeholder text
} from '@chakra-ui/react';
import { FaTags, FaShapes, FaTshirt } from 'react-icons/fa';

// --- Placeholders for components we will create in the next steps ---

const ProductCategoryManager = () => (
  <Box p={4} borderWidth="1px" borderRadius="md" shadow="sm">
    <Heading size="md" mb={4}>Product Category Management</Heading>
    <Text>Product Category Manager will be implemented here.</Text>
    {/* TODO: Implement UI for CRUD operations on Product Categories */}
  </Box>
);

const ProductTypeManager = () => (
  <Box p={4} borderWidth="1px" borderRadius="md" shadow="sm">
    <Heading size="md" mb={4}>Product Type Management</Heading>
    <Text>Product Type Manager will be implemented here.</Text>
    {/* TODO: Implement UI for CRUD operations on Product Types */}
  </Box>
);

const ProductManager = () => (
  <Box p={4} borderWidth="1px" borderRadius="md" shadow="sm">
    <Heading size="md" mb={4}>Product Management</Heading>
    <Text>Product Manager (including variants and POD info) will be implemented here.</Text>
    {/* TODO: Implement UI for CRUD operations on Products and their Variants */}
  </Box>
);
// --- End of Placeholders ---


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
            <ProductManager />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default InventoryPanel;
