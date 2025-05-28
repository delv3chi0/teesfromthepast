// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, 
    HStack, useToast, Stat, StatLabel, StatNumber, Tooltip, Icon
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea } from 'react-icons/fa'; // Icons for empty state and buttons

export default function VotingPage() {
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout } = useAuth(); 
    const [userVotesLeft, setUserVotesLeft] = useState(3); // Default to 3 votes
    const [votedDesignIds, setVotedDesignIds] = useState([]); // Track designs voted for by user in current session/fetch

    const navigate = useNavigate();
    const toast = useToast();

    const fetchContestDesigns = () => {
        setLoading(true);
        setError('');
        client.get('/contest/designs') // Fetches designs for the current month's contest
            .then(response => {
                setContestDesigns(response.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching contest designs:", err);
                setError('Failed to load contest designs. Please try again.');
                if (err.response?.status === 401) {
                    toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
                    logout();
                    navigate('/login');
                }
                setLoading(false);
            });
    };

    // Fetch user's voting status for the current month
    const fetchUserVoteStatus = async () => {
        if (!user || !user.monthlyVoteRecord) { 
            setUserVotesLeft(3); 
            setVotedDesignIds([]);
            return; 
        }
        try {
            const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const monthRecord = user.monthlyVoteRecord.find(record => record.month === currentMonth);
            
            if (monthRecord) {
                setUserVotesLeft(3 - monthRecord.designsVotedFor.length);
                setVotedDesignIds(monthRecord.designsVotedFor || []);
            } else {
                setUserVotesLeft(3);
                setVotedDesignIds([]);
            }
        } catch (err) {
            console.error("Error processing user vote status:", err);
            toast({ title: "Voting Status Error", description: "Could not fetch your current voting status.", status: "error", duration: 3000, isClosable: true });
        }
    };
    
    useEffect(() => {
        if (user) {
            fetchContestDesigns();
            fetchUserVoteStatus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [user]); // Rerun when user object changes (e.g., after login)

    const handleVote = async (designId) => {
        try {
            const response = await client.post(`/contest/vote/${designId}`);
            toast({
                title: "Vote Cast!",
                description: response.data.message || "Your vote has been recorded.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            
            // Optimistically update UI for vote counts and remaining votes
            const updatedDesigns = contestDesigns.map(d => 
                d._id === designId ? { ...d, votes: (d.votes || 0) + 1 } : d
            ).sort((a, b) => (b.votes || 0) - (a.votes || 0)); // Re-sort by votes
            setContestDesigns(updatedDesigns);
            
            setUserVotesLeft(prevVotesLeft => prevVotesLeft - 1); // Decrement votes left
            setVotedDesignIds(prevVoted => [...prevVoted, designId]); // Add to voted list for this session

        } catch (err) {
            console.error("Error casting vote:", err);
            const errorMessage = err.response?.data?.message || "Failed to cast your vote. You might have already voted or have no votes left.";
            toast({
                title: "Vote Failed",
                description: errorMessage,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            if (err.response?.status === 401) { // Handle expired token during vote
                logout();
                navigate('/login');
            }
        }
    };

    // Loading state for the main page content
    if (loading && !user && !error) { 
        return (
            <Box textAlign="center" mt={20} px={4}>
                <Text fontSize="lg" color="brand.textLight">Please log in to view and participate in the contest.</Text>
                <Button mt={4} colorScheme="brandAccentYellow" onClick={() => navigate('/login')}>Go to Login</Button>
            </Box>
        );
    }
    if (loading) {
        return (
            <Box textAlign="center" mt={20}>
                <Spinner size="xl" color="brand.primary" thickness="4px" speed="0.65s" emptyColor="gray.200" />
                <Text mt={4} color="brand.textLight">Loading Contest Gallery...</Text>
            </Box>
        );
    }

    // Error state for fetching designs
    if (error) {
        return (
            <Box textAlign="center" mt={20} px={4}>
                <Alert status="error" bg="brand.paper" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={10}>
                    <AlertIcon boxSize="40px" mr={0} />
                    <Text mt={3} fontWeight="bold" color="brand.textDark">{error}</Text>
                    <Button mt={4} colorScheme="brandPrimary" onClick={fetchContestDesigns}>Try Again</Button>
                </Alert>
            </Box>
        );
    }

    return (
        <Box maxW="container.lg" mx="auto" mt={{base:6, md:8}} px={4} pb={10}>
            <VStack spacing={4} align="center" mb={8}>
                <Heading as="h1" size="2xl" textAlign="center">🏆 Monthly Design Contest 🏆</Heading>
                {user && ( // Only show voting status if user is logged in
                    <>
                        <Text fontSize="xl" color="brand.textLight" textAlign="center">
                            Vote for your favorite designs! You have <Text as="span" fontWeight="bold" color="brand.accentYellow">{userVotesLeft}</Text> vote(s) left this month.
                        </Text>
                        {userVotesLeft <= 0 && 
                            <Text color="brand.accentYellow" fontWeight="bold" fontSize="lg" textAlign="center">
                                You've used all your votes for this month. Check back next month!
                            </Text>
                        }
                    </>
                )}
            </VStack>

            {contestDesigns.length === 0 ? (
                <VStack 
                    spacing={5} 
                    p={8} 
                    bg="rgba(255,255,255,0.1)" // Semi-transparent card on orange
                    borderRadius="xl" 
                    shadow="md"
                    borderWidth="1px"
                    borderColor="rgba(255,255,255,0.2)"
                    mt={8}
                    textAlign="center"
                >
                  <Icon as={FaRegSadCry} boxSize="60px" color="brand.textLight" />
                  <Text fontSize="xl" fontWeight="medium" color="brand.textLight">
                    No designs have been submitted for this month's contest yet. 
                    <br/>
                    Why not submit yours or check back soon?
                  </Text>
                </VStack>
            ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
                    {contestDesigns.map(design => (
                        <Box 
                            key={design._id} 
                            bg="brand.paper"
                            borderRadius="xl" 
                            overflow="hidden" 
                            shadow="lg"
                            display="flex"
                            flexDirection="column"
                            transition="all 0.2s ease-in-out"
                            _hover={{ 
                                boxShadow: "2xl", 
                                transform: "translateY(-4px) scale(1.02)" 
                            }}
                        >
                            <Image src={design.imageDataUrl} alt={design.prompt || "User Design"} fit="cover" w="100%" h="280px" bg="gray.200" />
                            <Box p={5} flexGrow={1} display="flex" flexDirection="column" justifyContent="space-between">
                                <Text fontSize="md" color="brand.textDark" noOfLines={2} title={design.prompt} minH="48px" fontWeight="medium">
                                    {design.prompt || "Untitled Design"}
                                </Text>
                                <HStack justifyContent="space-between" mt={4}>
                                    <Stat size="sm">
                                        <StatLabel color="brand.textMuted">Votes</StatLabel>
                                        <StatNumber color="brand.primaryDark" fontWeight="bold" fontSize="xl">{design.votes || 0}</StatNumber>
                                    </Stat>
                                    <Tooltip 
                                        label={
                                            !user ? "Please log in to vote" : // Check if user is logged in first
                                            design.user === user?._id ? "You cannot vote for your own design" :
                                            votedDesignIds.includes(design._id) ? "You have already voted for this design" : 
                                            userVotesLeft <= 0 ? "No votes left this month" : 
                                            "Cast your vote!"
                                        } 
                                        placement="top" 
                                        bg="gray.700" 
                                        color="white" 
                                        hasArrow
                                    >
                                        <Button
                                            bg="brand.accentYellow"
                                            color="brand.textDark"
                                            _hover={{bg: "brand.accentYellowHover"}}
                                            size="md" 
                                            px={6} 
                                            borderRadius="full" 
                                            leftIcon={<Icon as={FaVoteYea} />}
                                            onClick={() => user ? handleVote(design._id) : navigate('/login')} // Redirect to login if not logged in
                                            isDisabled={!user || votedDesignIds.includes(design._id) || userVotesLeft <= 0 || design.user === user?._id}
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
