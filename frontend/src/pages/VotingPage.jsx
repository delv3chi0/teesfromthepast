// frontend/src/pages/VotingPage.jsx
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack,
    HStack,
    useToast,
    Stat, StatLabel, StatNumber, Tooltip, Icon
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea, FaInfoCircle } from 'react-icons/fa'; // Added FaInfoCircle

export default function VotingPage() {
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout, setUser: setAuthUser } = useAuth(); // Added setAuthUser from context
    const [userVotesLeft, setUserVotesLeft] = useState(3);
    const [votedDesignIds, setVotedDesignIds] = useState([]);

    const navigate = useNavigate();
    const toast = useToast();

    const fetchContestData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            // Fetch designs and user profile (for vote count) in parallel or sequentially
            const designsPromise = client.get('/contest/designs');
            const profilePromise = client.get('/auth/profile'); // To get the latest vote count

            const [designsResponse, profileResponse] = await Promise.all([designsPromise, profilePromise]);
            
            setContestDesigns(designsResponse.data.sort((a, b) => (b.votes || 0) - (a.votes || 0))); // Sort by votes desc
            
            // Update user context and local vote state from fresh profile data
            if (profileResponse.data) {
                setAuthUser(prevUser => ({...prevUser, ...profileResponse.data})); // Update user in AuthContext
                const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                const monthRecord = profileResponse.data.monthlyVoteRecord?.find(record => record.month === currentMonth);
                if (monthRecord) {
                    setUserVotesLeft(3 - (monthRecord.designsVotedFor?.length || 0));
                    setVotedDesignIds(monthRecord.designsVotedFor || []);
                } else {
                    setUserVotesLeft(3);
                    setVotedDesignIds([]);
                }
            }
        } catch (err) {
            console.error("Error fetching contest data:", err);
            setError('Failed to load contest. Please try again.');
            if (err.response?.status === 401) {
                toast({ title: "Session Expired", description: "Please log in again.", status: "warning", duration: 3000, isClosable: true });
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [user, logout, navigate, toast, setAuthUser]); // Added setAuthUser

    useEffect(() => {
        fetchContestData();
    }, [fetchContestData]);


    const handleVote = async (designId) => {
        if (!user) {
            toast({ title: "Login Required", description: "Please log in to vote.", status: "info", duration: 3000, isClosable: true });
            navigate('/login');
            return;
        }
        try {
            const response = await client.post(`/contest/vote/${designId}`);
            toast({
                title: "Vote Cast!",
                description: response.data.message || "Your vote has been recorded.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            
            // Optimistically update UI, then refetch for consistency
            setContestDesigns(prevDesigns => 
                prevDesigns.map(d => d._id === designId ? { ...d, votes: (d.votes || 0) + 1 } : d)
                           .sort((a, b) => (b.votes || 0) - (a.votes || 0))
            );
            setUserVotesLeft(prevVotesLeft => Math.max(0, prevVotesLeft - 1));
            setVotedDesignIds(prevVoted => [...prevVoted, designId]);

            // Refetch user profile to update context with new vote record accurately
            client.get('/auth/profile').then(profileResponse => {
                if (profileResponse.data) {
                    setAuthUser(prevUser => ({...prevUser, ...profileResponse.data}));
                }
            }).catch(err => console.error("Error refetching profile after vote:", err));

        } catch (err) {
            console.error("Error casting vote:", err);
            const errorMessage = err.response?.data?.message || "Failed to cast your vote.";
            toast({ title: "Vote Failed", description: errorMessage, status: "error", duration: 5000, isClosable: true });
            if (err.response?.status === 401) { logout(); navigate('/login'); }
            else if (err.response?.status === 400) { // e.g. already voted, no votes left
                fetchContestData(); // Refetch data to get latest server state
            }
        }
    };

    const renderContent = () => {
        if (loading) {
            return (
                <VStack justifyContent="center" alignItems="center" minH="50vh">
                    <Spinner size="xl" color="brand.primary" thickness="4px" />
                    <Text mt={4} color="brand.textLight" fontSize="lg">Loading Contest Gallery...</Text>
                </VStack>
            );
        }
        if (error) {
            return (
                <Box textAlign="center" mt={8} px={4}>
                    <Alert status="error" bg="brand.paper" borderRadius="md" flexDirection="column" p={6} shadow="md">
                        <AlertIcon boxSize="40px" color="red.500" />
                        <Text mt={3} fontWeight="bold" color="brand.textDark" fontSize="lg">{error}</Text>
                        <Button mt={5} colorScheme="brandAccentYellow" onClick={fetchContestData}>Try Again</Button>
                    </Alert>
                </Box>
            );
        }
        if (contestDesigns.length === 0) {
            return (
                <VStack spacing={5} p={8} bg="rgba(255,255,255,0.1)" borderRadius="xl" shadow="md" mt={8} textAlign="center">
                    <Icon as={FaRegSadCry} boxSize="60px" color="brand.textLight" />
                    <Text fontSize="xl" fontWeight="medium" color="brand.textLight">
                        No designs submitted for this month's contest yet. <br/>
                        Why not submit yours or check back soon?
                    </Text>
                </VStack>
            );
        }
        return (
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{base: 4, md: 6}}>
                {contestDesigns.map(design => (
                    <Box
                        key={design._id} bg="brand.paper" borderRadius="xl"
                        overflow="hidden" shadow="lg" display="flex"
                        flexDirection="column" transition="all 0.2s ease-in-out"
                        _hover={{ boxShadow: "2xl", transform: "translateY(-4px)" }}
                    >
                        <Image src={design.imageDataUrl} alt={design.prompt || "User Design"} fit="cover" w="100%" h={{base:"250px", md:"300px"}} bg="gray.200" />
                        <Box p={5} flexGrow={1} display="flex" flexDirection="column" justifyContent="space-between">
                            <Tooltip label={design.prompt || "No prompt provided"} placement="top" bg="gray.700" color="white" hasArrow>
                                <Text fontSize="md" color="brand.textDark" fontWeight="semibold" noOfLines={1} mb={1}>
                                    Submitted by: <Text as="span" fontWeight="bold">{design.user?.username || 'Unknown'}</Text>
                                </Text>
                            </Tooltip>
                            <Text fontSize="sm" color="gray.600" noOfLines={2} title={design.prompt} fontStyle="italic" minH="40px">
                                "{design.prompt || "Untitled Design"}"
                            </Text>
                            <HStack justifyContent="space-between" mt={4} alignItems="center">
                                <Stat size="sm">
                                    <StatLabel color="brand.textDark" fontWeight="medium">Votes</StatLabel>
                                    <StatNumber color="brand.primaryDark" fontWeight="bold" fontSize="2xl">{design.votes || 0}</StatNumber>
                                </Stat>
                                <Tooltip
                                    label={
                                        !user ? "Please log in to vote" :
                                        design.user?._id === user?._id ? "You cannot vote for your own design" :
                                        votedDesignIds.includes(design._id) ? "You've already voted for this one!" :
                                        userVotesLeft <= 0 ? "No votes left this month" :
                                        "Cast your vote!"
                                    }
                                    placement="top" bg="gray.700" color="white" hasArrow
                                >
                                    <Button
                                        bg={votedDesignIds.includes(design._id) ? "green.400" : "brand.accentYellow"} 
                                        color={votedDesignIds.includes(design._id) ? "white" : "brand.textDark"}
                                        _hover={{bg: votedDesignIds.includes(design._id) ? "green.500" : "brand.accentYellowHover"}}
                                        size="md" px={5} borderRadius="full"
                                        leftIcon={<Icon as={FaVoteYea} />}
                                        onClick={() => handleVote(design._id)}
                                        isDisabled={!user || votedDesignIds.includes(design._id) || userVotesLeft <= 0 || design.user?._id === user?._id}
                                        boxShadow="md" _active={{ boxShadow: "lg" }}
                                    >
                                        {votedDesignIds.includes(design._id) ? "Voted" : "Vote!"}
                                    </Button>
                                </Tooltip>
                            </HStack>
                        </Box>
                    </Box>
                ))}
            </SimpleGrid>
        );
    };

    if (!user && loading) { // Still loading auth context perhaps
        return (
            <VStack justifyContent="center" alignItems="center" minH="60vh">
                <Spinner size="xl" color="brand.primary" /> <Text mt={3} color="brand.textLight">Loading...</Text>
            </VStack>
        );
    }
    if (!user && !loading && !error) { // Auth loaded, no user
        return (
            <VStack justifyContent="center" alignItems="center" minH="60vh" spacing={4} px={4}>
                <Icon as={FaInfoCircle} boxSize="50px" color="brand.accentYellow"/>
                <Text fontSize="xl" color="brand.textLight" textAlign="center">Please log in to view and participate in the contest.</Text>
                <Button colorScheme="brandAccentYellow" size="lg" borderRadius="full" onClick={() => navigate('/login')}>Go to Login</Button>
            </VStack>
        );
    }

    return (
        <Box w="100%" /* maxW and mx removed, MainLayout handles it */ pb={10}>
            <VStack spacing={4} align="stretch" mb={8}>
                <Heading
                  as="h1"
                  size="pageTitle" // Uniform page title style
                  color="brand.textLight"
                  textAlign="left"
                  w="100%"
                  mb={{ base: 2, md: 4 }} // Adjusted margin for subtitle
                >
                    🏆 Monthly Design Contest 🏆
                </Heading>
                {user && (
                    <>
                        <Text fontSize={{base: "md", md: "lg"}} color="brand.textLight" textAlign="left" w="100%">
                            Vote for your favorite designs! You have <Text as="span" fontWeight="bold" color="brand.accentYellow">{userVotesLeft}</Text> vote(s) left this month.
                        </Text>
                        {userVotesLeft <= 0 &&
                            <Text color="brand.accentYellow" fontWeight="bold" fontSize={{base: "md", md: "lg"}} textAlign="left" w="100%">
                                You've used all your votes. Check back next month!
                            </Text>
                        }
                    </>
                )}
            </VStack>
            {renderContent()}
        </Box>
    );
}
