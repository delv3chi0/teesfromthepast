// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, useToast,
    Stat, StatLabel, StatNumber, StatHelpText, Tooltip
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';

export default function VotingPage() {
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout, token } = useAuth(); // Assuming token might be useful for re-fetching user vote counts
    const [userVotesLeft, setUserVotesLeft] = useState(3); // Start with 3 votes
    const [votedDesignIds, setVotedDesignIds] = useState([]); // Track designs voted for in this session/fetch

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
                    logout();
                    navigate('/login');
                }
                setLoading(false);
            });
    };

    // Fetch user's voting status for the current month
    const fetchUserVoteStatus = async () => {
        if (!user) return;
        try {
            // We need to get the user's profile data which now contains monthlyVoteRecord
            // The `user` object from useAuth() should already be the full profile.
            const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const monthRecord = user.monthlyVoteRecord?.find(record => record.month === currentMonth);
            
            if (monthRecord) {
                setUserVotesLeft(3 - monthRecord.designsVotedFor.length);
                setVotedDesignIds(monthRecord.designsVotedFor || []);
            } else {
                setUserVotesLeft(3);
                setVotedDesignIds([]);
            }
        } catch (err) {
            console.error("Error fetching user vote status:", err);
            // Handle error, maybe show a toast
        }
    };
    
    useEffect(() => {
        if (user) {
            fetchContestDesigns();
            fetchUserVoteStatus();
        }
    }, [user]); // Re-fetch if user changes

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
            // Refresh designs to show updated vote counts & update user's vote status
            fetchContestDesigns();
            fetchUserVoteStatus(); 
            // Also, update the user object in AuthContext if the backend doesn't send it back
            // For simplicity, re-fetching profile via AuthProvider might be needed or manually updating user context
            // One way: auth.setUser(prevUser => ({...prevUser, monthlyVoteRecord: updatedRecord})) - complex here.
            // Simpler: let AuthProvider's profile fetch on next load update it, or trigger a specific profile refresh.
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
                {userVotesLeft === 0 && <Text color="brand.accentOrange" fontWeight="bold">You've used all your votes for this month. Check back next month!</Text>}
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
                                        <StatNumber color="brand.primaryDark" fontWeight="bold">{design.votes}</StatNumber>
                                    </Stat>
                                    <Tooltip label={votedDesignIds.includes(design._id) ? "You have already voted for this design this month" : userVotesLeft <= 0 ? "No votes left this month" : design.user === user?._id ? "You cannot vote for your own design" : "Cast your vote!"} placement="top">
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
