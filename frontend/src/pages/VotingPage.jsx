// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, 
    HStack, useToast, Stat, StatLabel, StatNumber, Tooltip, Icon
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea } from 'react-icons/fa'; // Icons

export default function VotingPage() {
    // ... (state variables and useEffect for fetching data remain the same) ...
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout } = useAuth(); 
    const [userVotesLeft, setUserVotesLeft] = useState(3);
    const [votedDesignIds, setVotedDesignIds] = useState([]);
    const navigate = useNavigate();
    const toast = useToast();

    // ... (fetchContestDesigns and fetchUserVoteStatus functions remain the same) ...
    // Ensure these functions are present and correct from previous version
    const fetchContestDesigns = () => { /* ... */ };
    const fetchUserVoteStatus = async () => { /* ... */ };
    useEffect(() => { if (user) { fetchContestDesigns(); fetchUserVoteStatus(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); 


    const handleVote = async (designId) => {
        // ... (this function remains mostly the same, ensure button styling is consistent) ...
        try {
            const response = await client.post(`/contest/vote/${designId}`);
            toast({ /* ... success ... */});
            const updatedDesigns = contestDesigns.map(d => d._id === designId ? { ...d, votes: (d.votes || 0) + 1 } : d).sort((a, b) => (b.votes || 0) - (a.votes || 0));
            setContestDesigns(updatedDesigns);
            setUserVotesLeft(userVotesLeft - 1);
            setVotedDesignIds(prevVoted => [...prevVoted, designId]);
        } catch (err) { /* ... error handling ... */ }
    };

    // ... (loading and error return JSX remains the same) ...

    return (
        // Outermost Box has no bg, will inherit orange from MainLayout
        <Box maxW="container.lg" mx="auto" mt={{base:6, md:8}} px={4} pb={10}>
            <VStack spacing={4} align="center" mb={8}>
                <Heading as="h1" size="2xl">🏆 Monthly Design Contest 🏆</Heading>
                <Text fontSize="xl" color="brand.textLight"> {/* Ensure good contrast */}
                    Vote for your favorite designs! You have <Text as="span" fontWeight="bold" color="brand.accentYellow">{userVotesLeft}</Text> vote(s) left this month.
                </Text>
                {userVotesLeft <= 0 && <Text color="brand.accentYellow" fontWeight="bold" fontSize="lg">You've used all your votes for this month. Check back next month!</Text>}
            </VStack>

            {loading && (
                 <Box textAlign="center" py={10}>
                    <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200" />
                    <Text mt={3} color="brand.textLight">Loading Contest Gallery...</Text>
                </Box>
            )}
            {!loading && error && (
                 <Alert status="error" bg="brand.paper" borderRadius="md"><AlertIcon /><Text color="brand.textDark">{error}</Text></Alert>
            )}
            {!loading && !error && contestDesigns.length === 0 ? (
                // Enhanced Empty State
                <VStack 
                    spacing={5} 
                    p={8} 
                    bg="rgba(255,255,255,0.1)" 
                    borderRadius="xl" 
                    shadow="md"
                    borderWidth="1px"
                    borderColor="rgba(255,255,255,0.2)"
                    mt={8}
                >
                  <Icon as={FaRegSadCry} boxSize="60px" color="brand.textLight" />
                  <Text fontSize="xl" fontWeight="medium" color="brand.textLight" textAlign="center">
                    No designs submitted for this month's contest yet. <br/>
                    Why not submit yours or check back soon?
                  </Text>
                </VStack>
            ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
                    {contestDesigns.map(design => (
                        // Enhanced Card Styling
                        <Box 
                            key={design._id} 
                            bg="brand.paper"
                            borderRadius="xl" 
                            overflow="hidden" 
                            shadow="lg"
                            transition="all 0.2s ease-in-out"
                            _hover={{ 
                                boxShadow: "2xl", 
                                transform: "translateY(-4px) scale(1.02)" 
                            }}
                        >
                            <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="280px" bg="gray.200" />
                            <Box p={5}>
                                <Text fontSize="md" color="brand.textDark" noOfLines={2} title={design.prompt} minH="48px" fontWeight="medium">
                                    {design.prompt || "Untitled Design"}
                                </Text>
                                <HStack justifyContent="space-between" mt={4}>
                                    <Stat size="sm">
                                        <StatLabel color="brand.textMuted">Votes</StatLabel>
                                        <StatNumber color="brand.primaryDark" fontWeight="bold" fontSize="xl">{design.votes || 0}</StatNumber>
                                    </Stat>
                                    <Tooltip 
                                        label={ /* ... existing tooltip logic ... */ } 
                                        placement="top" bg="gray.700" color="white"
                                    >
                                        <Button
                                            bg="brand.accentYellow"
                                            color="brand.textDark"
                                            _hover={{bg: "brand.accentYellowHover"}}
                                            size="md" // Slightly larger
                                            px={6} // More padding
                                            borderRadius="full" // Pill-shaped
                                            leftIcon={<Icon as={FaVoteYea} />}
                                            onClick={() => handleVote(design._id)}
                                            isDisabled={votedDesignIds.includes(design._id) || userVotesLeft <= 0 || design.user === user?._id}
                                            boxShadow="md" _active={{ boxShadow: "lg" }}
                                        >
                                            Vote!
                                        </Button>
                                    </Tooltip>
                                </HStack>
                            </Box>
                        </Box>
                    ))}
                </SimpleGrid>
            )}
        </Box>
    );
}
