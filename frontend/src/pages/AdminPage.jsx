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
  console.log("[AdminPage] Rendering SIMPLIFIED Admin Page (with debug colors)...");

  return (
    <Box pt={{ base: "20px", md: "20px", xl: "20px" }} px={{ base: "2", md: "4" }} w="100%" bg="rgba(0,0,0,0.05)"> {/* Light background to ensure page area is visible */}
      <VStack spacing={6} align="stretch">
        <Heading
          as="h1"
          fontSize={{ base: "2xl", md: "3xl" }}
          color="black" // Using hardcoded black for high contrast
          bg="lightyellow" // Background for the heading itself
          p={2}
          textAlign="left"
          w="100%"
        >
          Admin Dashboard (Simplified Test - Debug Colors)
        </Heading>

        <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text color="black"> {/* Hardcoded black */}
                This is a simplified version of the Admin Page for debugging.
                If you see this, the basic page structure and routing are working.
            </Text>
        </Alert>

        <Box bg="white" borderRadius="xl" shadow="xl" p={{ base: 2, md: 4 }}> {/* Changed bg to white for contrast */}
          <Tabs variant="soft-rounded" colorScheme="purple" isLazy> {/* Changed colorScheme for variety */}
            <TabList mb="1em" flexWrap="wrap">
              <Tab _selected={{ color: 'white', bg: 'purple.500' }} borderRadius="full" m={1}>
                <Icon as={FaUsersCog} mr={2} /> <Text color="black">Users (Test)</Text>
              </Tab>
              <Tab _selected={{ color: 'white', bg: 'purple.500' }} borderRadius="full" m={1}>
                <Icon as={FaBoxOpen} mr={2} /> <Text color="black">Orders (Test)</Text>
              </Tab>
              <Tab _selected={{ color: 'white', bg: 'purple.500' }} borderRadius="full" m={1}>
                <Icon as={FaPalette} mr={2} /> <Text color="black">Designs (Test)</Text>
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} py={2}>
                <Box p={4}>
                  <Heading size="md" mb={4} color="black" bg="lightcyan" p={1}>Users Tab Content</Heading>
                  <Text color="black">If you see this, the Users tab panel is rendering.</Text>
                </Box>
              </TabPanel>
              <TabPanel px={0} py={2}>
                <Box p={4}>
                  <Heading size="md" mb={4} color="black">Orders Tab Content</Heading>
                  <Text color="black">Orders tab content will go here.</Text>
                </Box>
              </TabPanel>
              <TabPanel px={0} py={2}>
                <Box p={4}>
                  <Heading size="md" mb={4} color="black">Designs Tab Content</Heading>
                  <Text color="black">Designs tab content will go here.</Text>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        <Text color="black" p={4} bg="lightgreen">End of Simplified Admin Page content.</Text>
      </VStack>
    </Box>
  );
};

export default AdminPage;
