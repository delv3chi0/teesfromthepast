// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import { /* ... all Chakra imports ... */ Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, HStack, useToast, Stat, StatLabel, StatNumber, Tooltip, Icon } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea } from 'react-icons/fa';

export default function VotingPage() {
    // ... your existing state and functions ...
    const [contestDesigns, setContestDesigns] = useState([]);
    // ... etc. ...

    useEffect(() => { /* ... your existing logic ... */ }, [user]);
    const handleVote = async (designId) => { /* ... */ };

    if (loading) { /* ... */ }
    if (error) { /* ... */ }

    return (
        // Root Box transparent to MainLayout's orange, mx="auto" and maxW constrain/center it.
        <Box maxW="container.lg" mx="auto" /* Removed mt, px, pb */>
            <VStack spacing={4} align="stretch" mb={8} mt={{base:4, md:6}}> {/* align="stretch" for headings, mt here */}
                <Heading as="h1" size="xl" color="brand.textLight" textAlign="left" w="100%" mb={6}>
                    🏆 Monthly Design Contest 🏆
                </Heading>
                {user && (
                    <>
                        <Text fontSize="lg" color="brand.textLight" textAlign="left" w="100%">
                            Vote for your favorite designs! You have <Text as="span" fontWeight="bold" color="brand.accentYellow">{userVotesLeft}</Text> vote(s) left this month.
                        </Text>
                        {/* ... */}
                    </>
                )}
            </VStack>

            {/* ... Rest of your JSX for contestDesigns mapping ... */}
            {/* Ensure design cards use bg="brand.paper" and text inside uses brand.textDark */}
            {/* Ensure Vote buttons use brand colors and pill shape */}
             {contestDesigns.length === 0 && !loading && !error ? ( /* ... empty state ... */) 
             : !loading && !error && (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
                    {contestDesigns.map(design => (
                        <Box 
                            key={design._id} bg="brand.paper" borderRadius="xl" 
                            // ... other card styles ...
                        >
                           {/* ... Image, Text (color="brand.textDark"), Stat (label color="brand.textMuted", number color="brand.primaryDark"), Button ... */}
                        </Box>
                    ))}
                </SimpleGrid>
            )}
        </Box>
    );
}
