// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, 
    HStack, // <-- HStack ADDED HERE
    useToast,
    Stat, StatLabel, StatNumber, Tooltip 
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom'; // Removed RouterLink as it wasn't used directly
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

export default function VotingPage() {
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout } = useAuth(); // Removed token as it's not directly used here, user object has info
    const [userVotesLeft, setUserVotesLeft] = useState(3);
    const [votedDesignIds, setVotedDesignIds] = useState([]);

    const navigate = useNavigate();
    const toast = useToast();

    const fetchContestDesigns = () => {
        setLoading(true);
        setError('');
        client.get('/contest/designs')
            .then(response => {
                setContestDesigns(response.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching contest designs:", err);
                setError('Failed to load contest designs. Please try again.');
                if (err.response?.status === 401) {
                    logout();
                    navigate('/login');
                }
                setLoading(false);
            });
    };

    const fetchUserVoteStatus = async () => {
        if (!user || !user.monthlyVoteRecord) { // Check if user and monthlyVoteRecord exist
            setUserVotesLeft(3); // Default to 3 if no record or user not fully loaded
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
            toast({ title: "Error", description: "Could not fetch your voting status.", status: "error", duration: 3000, isClosable: true });
        }
    };
    
    useEffect(() => {
        if (user) {
            fetchContestDesigns();
            fetchUserVoteStatus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [user]); // Rerun when user object changes (e.g., after login or profile update from AuthProvider)

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
            
            // Optimistically update UI or re-fetch
            // For immediate feedback on vote counts and remaining votes:
            const updatedDesigns = contestDesigns.map(d => 
                d._id === designId ? { ...d, votes: (d.votes || 0) + 1 } : d
            ).sort((a, b) => (b.votes || 0) - (a.votes || 0)); // Re-sort by votes
            setContestDesigns(updatedDesigns);
            
            const newVotesLeft = userVotesLeft - 1;
            setUserVotesLeft(newVotesLeft);
            setVotedDesignIds(prevVoted => [...prevVoted, designId]);

            // Ideally, the user object in AuthContext should also be updated with the new vote record.
            // This might require a function in AuthContext to refresh the user or update it.
            // For now, this provides immediate UI feedback. A page refresh would get updated user data.

        } catch (err) {
            console.error("Error casting vote:", err);
            const errorMessage = err.response?.data?.message || "Failed to cast your vote.";
            toast({
                title: "Vote Failed",
                description: errorMessage,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            if (err.response?.status === 401) {
                logout();
                navigate('/login');
            }
        }
    };

    if (loading && !user) { // Don't show main loading if user is null (implies redirecting or logged out)
        return <Box textAlign="center" mt={20}><Text>Please log in to view the contest.</Text></Box>;
    }
    if (loading) {
        return (
            <Box textAlign="center" mt={20}>
                <Spinner size="xl" /><Text mt={4}>Loading Contest Gallery...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box textAlign="center" mt={20} px={4}>
                <Alert status="error"><AlertIcon />{error}</Alert>
            </Box>
        );
    }

    return (
        <Box maxW="container.lg" mx="auto" mt={8} px={4} pb={10}>
            <VStack spacing={4} align="center" mb={8}>
                <Heading as="h1" size="xl">🏆 Monthly Design Contest 🏆</Heading>
                <Text fontSize="lg" color="brand.textTeal">Vote for your favorite designs! You have <Text as="span" fontWeight="bold">{userVotesLeft}</Text> vote(s) left this month.</Text>
                {userVotesLeft <= 0 && <Text color="brand.accentOrange" fontWeight="bold">You've used all your votes for this month. Check back next month!</Text>}
            </VStack>

            {contestDesigns.length === 0 ? (
                <Text textAlign="center" fontSize="lg" py={10}>
                    No designs submitted for this month's contest yet. Be the first to submit yours!
                </Text>
            ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
                    {contestDesigns.map(design => (
                        <Box key={design._id} borderWidth="1px" borderRadius="lg" overflow="hidden" shadow="md" bg="brand.paper">
                            <Image src={design.imageDataUrl} alt={design.prompt} fit="cover" w="100%" h="280px" bg="gray.200" />
                            <Box p={4}>
                                <Text fontSize="sm" color="brand.textMuted" noOfLines={2} title={design.prompt} minH="40px">
                                    {design.prompt}
                                </Text>
                                <HStack justifyContent="space-between" mt={3}>
                                    <Stat size="sm">
                                        <StatLabel color="brand.textDark">Votes</StatLabel>
                                        <StatNumber color="brand.primaryDark" fontWeight="bold">{design.votes || 0}</StatNumber>
                                    </Stat>
                                    <Tooltip 
                                        label={
                                            design.user === user?._id ? "You cannot vote for your own design" :
                                            votedDesignIds.includes(design._id) ? "You have already voted for this design this month" : 
                                            userVotesLeft <= 0 ? "No votes left this month" : 
                                            "Cast your vote!"
                                        } 
                                        placement="top"
                                    >
                                        <Button
                                            colorScheme="brandAccentYellow"
                                            size="sm"
                                            onClick={() => handleVote(design._id)}
                                            isDisabled={votedDesignIds.includes(design._id) || userVotesLeft <= 0 || design.user === user?._id}
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
