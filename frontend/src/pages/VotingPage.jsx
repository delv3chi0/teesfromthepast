// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import { /* ... all your Chakra imports ... */ Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, HStack, useToast, Stat, StatLabel, StatNumber, Tooltip, Icon } from '@chakra-ui/react';
// ... other imports (useNavigate, client, useAuth, FaRegSadCry, FaVoteYea) ...
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea } from 'react-icons/fa';


export default function VotingPage() {
    // ... your existing state and functions ...
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    // ... etc ...
    const { user, logout } = useAuth(); 
    const navigate = useNavigate();


    useEffect(() => { /* ... your existing logic ... */ }, [user]);
    const handleVote = async (designId) => { /* ... */ };


    if (loading) { /* ... */ }
    if (error) { /* ... */ }

    return (
        // This outermost Box has mx="auto", no 'bg' prop.
        <Box maxW="container.lg" mx="auto" mt={{base:6, md:8}} px={4} pb={10}>
            <VStack spacing={4} align="center" mb={8}>
                <Heading as="h1" size="2xl" color="brand.textLight"> {/* Ensure color for contrast */}
                    🏆 Monthly Design Contest 🏆
                </Heading>
                {/* ... Text for votes left, ensure color="brand.textLight" or "brand.accentYellow" ... */}
            </VStack>

            {/* ... Rest of your JSX for contestDesigns mapping ... */}
            {/* Ensure all design cards use bg="brand.paper" */}
            {/* Ensure text/headings within cards use brand.textDark */}
            {/* Ensure Vote buttons use brand colors */}
        </Box>
    );
}
