import { useState, useEffect, useRef } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    HStack, useToast, Stat, StatLabel, StatNumber, Tooltip, Icon, AlertDialog, AlertDialogBody,
    AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, // Add AlertDialogOverlay if missing
    Link as ChakraLink // Add ChakraLink if missing for Tooltip content (if any)
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea } from 'react-icons/fa'; // Ensure all icons are imported

export default function VotingPage() {
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout } = useAuth();
    const [userVotesLeft, setUserVotesLeft] = useState(3);
    const [votedDesignIds, setVotedDesignIds] = useState([]);

    const navigate = useNavigate();
    const toast = useToast();
    const cancelRef = useRef();

    // Helper function duplicated from backend/routes/contest.js for frontend use
    const getCurrentMonthYYYYMM = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const fetchContestDesigns = () => {
        setLoading(true);
        setError('');
        client.get('/contest/designs')
            .then(response => {
                const sortedDesigns = response.data.sort((a, b) => (b.votes || 0) - (a.votes || 0));
                setContestDesigns(sortedDesigns);
            })
            .catch(err => {
                console.error("Error fetching contest designs:", err);
                setError('Failed to load contest designs. Please try again.');
                if (err.response?.status === 401) {
                    toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
                    logout();
                    navigate('/login');
                }
            })
            .finally(() => { setLoading(false); });
    };

    const fetchUserVoteStatus = async () => {
        if (!user || !user.monthlyVoteRecord) {
            setUserVotesLeft(3);
            setVotedDesignIds([]);
            return;
        }
        try {
            const currentMonth = getCurrentMonthYYYYMM(); // Use helper function
            const monthRecord = user.monthlyVoteRecord.find(record => record.month === currentMonth);

            if (monthRecord) {
                setUserVotesLeft(3 - monthRecord.designsVotedFor.length);
                setVotedDesignIds(monthRecord.designsVotedFor || []);
            } else {
                setUserVotesLeft(3);
                setVotedDesignIds([]);
            }
        } catch (errCatch) {
            console.error("Error processing user vote status:", errCatch);
            toast({ title: "Voting Status Error", description: "Could not fetch your current voting status.", status: "error", duration: 3000, isClosable: true });
        }
    };

    useEffect(() => {
        if (user) {
            fetchContestDesigns();
            fetchUserVoteStatus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); // Depend on user to re-fetch when user object changes (e.g., after login)

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

            const updatedDesigns = contestDesigns.map(d =>
                d._id === designId ? { ...d, votes: (d.votes || 0) + 1 } : d
            ).sort((a, b) => (b.votes || 0) - (a.votes || 0));
            setContestDesigns(updatedDesigns);

            setUserVotesLeft(prevVotesLeft => Math.max(0, prevVotesLeft - 1));
            setVotedDesignIds(prevVoted => [...prevVoted, designId]);

        } catch (err) {
            console.error("Error casting vote:", err);
            const errorMessage = err.response?.data?.message || "Failed to cast your vote.";
            toast({ title: "Vote Failed", description: errorMessage, status: "error", duration: 5000, isClosable: true });
            if (err.response?.status === 401) { logout(); navigate('/login'); }
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <Box textAlign="center" py={20}>
                    {/* MODIFIED: Spinner will use theme default color */}
                    <Spinner size="xl" thickness="4px" speed="0.65s" emptyColor="whiteAlpha.300" />
                    <Text mt={4} color="brand.textLight" fontSize="lg">Loading Contest Gallery...</Text>
                </Box>
            );
        }
        if (error) {
            return (
                // MODIFIED: Alert will use colorScheme
                <Box textAlign="center" mt={8} px={4}>
                    <Alert status="error" colorScheme="red" borderRadius="md" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" py={10} borderWidth="1px">
                        <AlertIcon boxSize="40px" mr={0} />
                        <Text mt={4} mb={6} fontWeight="bold">{error}</Text> {/* Text will inherit from Alert colorScheme */}
                        <Button colorScheme="brandAccentYellow" onClick={fetchContestDesigns}>Try Again</Button>
                    </Alert>
                </Box>
            );
        }
        if (contestDesigns.length === 0) {
            return (
                // MODIFIED: Apply layerStyle="cardBlue"
                <VStack spacing={5} p={10} layerStyle="cardBlue" mt={8} textAlign="center" borderWidth="1px" borderColor="transparent">
                    {/* Icons will inherit color from layerStyle="cardBlue" (brand.textBurnt) */}
                    <Icon as={FaRegSadCry} boxSize="60px" />
                    {/* Text will inherit color from layerStyle="cardBlue" (brand.textDark) */}
                    <Text fontSize="2xl" fontWeight="medium">
                        No Contest Submissions Yet!
                    </Text>
                    <Text>
                        The gallery is empty for now. Why not be the first to submit a design?
                    </Text>
                </VStack>
            );
        }
        return (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 6, md: 8 }}>
                {contestDesigns.map(design => (
                    // MODIFIED: Apply layerStyle="cardBlue"
                    <Box
                        key={design._id}
                        layerStyle="cardBlue"
                        overflow="hidden" shadow="lg" display="flex"
                        flexDirection="column" transition="all 0.2s ease-in-out"
                        borderWidth="1px" borderColor="transparent"
                        _hover={{ boxShadow: "xl", transform: "translateY(-5px)", borderColor: "brand.accentYellow" }}
                    >
                        {/* MODIFIED: Image background to brand.primary */}
                        <Image src={design.imageDataUrl} alt={design.prompt || "User Design"} fit="cover" w="100%" h={{base: 300, md: 320}} bg="brand.primary" />
                        <Box p={5} flexGrow={1} display="flex" flexDirection="column" justifyContent="space-between">
                            {/* MODIFIED: Tooltip bg/color */}
                            <Tooltip label={design.prompt || "No prompt provided"} placement="top" bg="brand.secondary" color="brand.textLight" hasArrow>
                                <Text fontSize="md" fontWeight="medium" noOfLines={1} mb={2}>
                                    Submitted by: {design.user ? design.user.username : 'Unknown User'}
                                </Text>
                            </Tooltip>
                            {/* NEW: Display votes this month if available */}
                            {design.votes !== undefined && (
                                <Text fontSize="sm" color="brand.textDark" mb={2}>
                                    Votes This Month: {design.votes}
                                </Text>
                            )}

                            <HStack justifyContent="space-between" mt={4}>
                                <Stat size="sm">
                                    <StatLabel>Votes</StatLabel> {/* Text will inherit from layerStyle="cardBlue" */}
                                    <StatNumber color="brand.accentYellow" fontWeight="bold" fontSize="3xl">{design.votes || 0}</StatNumber>
                                </Stat>
                                <Tooltip
                                    label={
                                        !user ? "Please log in to vote" :
                                        design.user?._id === user?._id ? "You cannot vote for your own design" :
                                        votedDesignIds.includes(design._id) ? "You have already voted for this design" :
                                        userVotesLeft <= 0 ? "No votes left this month" :
                                        "Cast your vote!"
                                    }
                                    placement="top" bg="brand.secondary" color="brand.textLight" hasArrow // MODIFIED: Tooltip bg/color
                                >
                                    <Button
                                        colorScheme="brandAccentYellow"
                                        size="md" px={6}
                                        leftIcon={<Icon as={FaVoteYea} />}
                                        onClick={() => user ? handleVote(design._id) : navigate('/login')}
                                        isDisabled={!user || votedDesignIds.includes(design._id) || userVotesLeft <= 0 || design.user?._id === user?._id}
                                        boxShadow="md" _active={{ boxShadow: "lg" }}
                                    >
                                        Vote
                                    </Button>
                                </Tooltip>
                            </HStack>
                        </Box>
                    </Box>
                ))}
            </SimpleGrid>
        );
    };

    if (!user) { // If user is not logged in, display a login prompt
        return (
            <Box textAlign="center" py={20}>
                <Heading color="brand.textLight" mb={4}>Contest Access Required</Heading>
                <Text color="brand.textLight" mb={6}>Please log in or create an account to view the gallery and vote.</Text>
                <Button colorScheme="brandAccentYellow" size="lg" onClick={() => navigate('/login')}>
                    Login or Sign Up
                </Button>
            </Box>
        );
    }

    return (
        <Box py={{base: 6, md: 8}}>
            <VStack spacing={4} align="stretch" mb={10}>
                <Heading as="h1" size="2xl" color="brand.textLight" textAlign="left" w="100%">
                    Monthly Design Contest
                </Heading>
                {user && (
                    <>
                        <Text fontSize="lg" color="brand.textLight" textAlign="left" w="100%"> {/* MODIFIED: Color to brand.textLight */}
                            Vote for your favorite designs! You have <Text as="span" fontWeight="bold" color="brand.accentYellow">{userVotesLeft}</Text> vote(s) left for this month's contest.
                        </Text>
                        {userVotesLeft <= 0 &&
                            <Text color="brand.accentYellow" fontWeight="bold" fontSize="lg" textAlign="left" w="100%">
                                You've used all your votes. Thanks for participating! Check back next month for a new contest.
                            </Text>
                        }
                    </>
                )}
            </VStack>
            {renderContent()}
        </Box>
    );
}
