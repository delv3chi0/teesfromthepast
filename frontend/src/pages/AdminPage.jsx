// frontend/src/pages/AdminPage.jsx
import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FaUsersCog, FaBoxOpen, FaPalette } from 'react-icons/fa';

const AdminPage = () => {
  console.log("[AdminPage] Rendering SIMPLIFIED Admin Page...");

  // Test if basic rendering works.
  // If you see "Admin Page Content Test" and the tabs,
  // the problem is likely in the data fetching or table rendering logic
  // that was previously in the UsersPanel.

  return (
    <Box pt={{ base: "20px", md: "20px", xl: "20px" }} px={{ base: "2", md: "4" }} w="100%">
      <VStack spacing={6} align="stretch">
        <Heading
          as="h1"
          fontSize={{ base: "2xl", md: "3xl" }}
          color="brand.textLight" // Assuming brand.textLight is visible on your orange background
          textAlign="left"
          w="100%"
        >
          Admin Dashboard (Simplified Test)
        </Heading>

        <Alert status="info" borderRadius="md">
            <AlertIcon />
            This is a simplified version of the Admin Page for debugging.
            If you see this, the basic page structure and routing are working.
        </Alert>

        <Box bg="brand.paper" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }}>
          <Tabs variant="soft-rounded" colorScheme="brandPrimary" isLazy>
            <TabList mb="1em" flexWrap="wrap">
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}>
                <Icon as={FaUsersCog} mr={2} /> Users (Test)
              </Tab>
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}>
                <Icon as={FaBoxOpen} mr={2} /> Orders (Test)
              </Tab>
              <Tab _selected={{ color: 'white', bg: 'brand.primary' }} borderRadius="full" m={1}>
                <Icon as={FaPalette} mr={2} /> Designs (Test)
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} py={2}>
                <Box p={4}>
                  <Heading size="md" mb={4}>Users Tab Content</Heading>
                  <Text>If you see this, the Users tab panel is rendering.</Text>
                </Box>
              </TabPanel>
              <TabPanel px={0} py={2}>
                <Box p={4}>
                  <Heading size="md" mb={4}>Orders Tab Content</Heading>
                  <Text>Orders tab content will go here.</Text>
                </Box>
              </TabPanel>
              <TabPanel px={0} py={2}>
                <Box p={4}>
                  <Heading size="md" mb={4}>Designs Tab Content</Heading>
                  <Text>Designs tab content will go here.</Text>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Box>
  );
};

export default AdminPage;
