// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import { /* ... all Chakra imports ... */ Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, HStack, useToast, Stat, StatLabel, StatNumber, Tooltip, Icon } from '@chakra-ui/react';
// ... other imports (useNavigate, client, useAuth, FaRegSadCry, FaVoteYea) ...
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea } from 'react-icons/fa';


export default function VotingPage() {
    // ... your existing state and functions ...
    const [contestDesigns, setContestDesigns] = useState([]);
    // ... etc. ...
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { /* ... your existing logic ... */ }, [user]);
    const handleVote = async (designId) => { /* ... */ };

    if (loading) { /* ... */ }
    if (error) { /* ... */ }

    return (
        // Root Box is transparent to MainLayout's orange
        <Box maxW="container.lg" mx="auto" mt={{base:4, md:6}} px={4} pb={10}>
            <VStack spacing={4} align="stretch" mb={8}> {/* Changed align to stretch */}
                <Heading as="h1" size="xl" textAlign="left" w="100%" color="brand.textLight"> {/* Changed alignment and size */}
                    🏆 Monthly Design Contest 🏆
                </Heading>
                {user && (
                    <>
                        <Text fontSize="lg" color="brand.textLight" textAlign="left" w="100%"> {/* Changed alignment */}
                            Vote for your favorite designs! You have <Text as="span" fontWeight="bold" color="brand.accentYellow">{userVotesLeft}</Text> vote(s) left this month.
                        </Text>
                        {/* ... */}
                    </>
                )}
            </VStack>

            {/* ... Rest of your JSX for contestDesigns mapping ... */}
            {/* Ensure design cards use bg="brand.paper" */}
            {/* Ensure text/headings within cards use brand.textDark */}
            {/* Ensure Vote buttons use brand colors */}
        </Box>
    );
}
