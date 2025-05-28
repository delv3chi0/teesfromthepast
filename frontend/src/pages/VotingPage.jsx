// frontend/src/pages/VotingPage.jsx
import { useState, useEffect } from 'react';
import {
    Box, Heading, Text, SimpleGrid, Image, Spinner, Alert, AlertIcon, Button, VStack, 
    HStack, useToast, Stat, StatLabel, StatNumber, Tooltip, Icon
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaRegSadCry, FaVoteYea } from 'react-icons/fa';

export default function VotingPage() {
    const [contestDesigns, setContestDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, logout } = useAuth(); 
    const [userVotesLeft, setUserVotesLeft] = useState(3);
    const [votedDesignIds, setVotedDesignIds] = useState([]);
    const navigate = useNavigate();
    const toast = useToast();

    const fetchContestDesigns = () => {
        setLoading(true); setError('');
        client.get('/contest/designs')
            .then(response => { setContestDesigns(response.data); setLoading(false); })
            .catch(err => { /* ... error handling, same as before ... */ 
                console.error("Error fetching contest designs:", err);
                setError('Failed to load contest designs.');
                if (err.response?.status === 401) { logout(); navigate('/login'); }
                setLoading(false);
            });
    };

    const fetchUserVoteStatus = async () => {
        if (!user || !user.monthlyVoteRecord) { 
            setUserVotesLeft(3); setVotedDesignIds([]); return; 
        }
        try {
            const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const monthRecord = user.monthlyVoteRecord.find(record => record.month === currentMonth);
            if (monthRecord) {
                setUserVotesLeft(3 - monthRecord.designsVotedFor.length);
                setVotedDesignIds(monthRecord.designsVotedFor || []);
            } else { setUserVotesLeft(3); setVotedDesignIds([]); }
        } catch (err) { /* ... error handling ... */ }
    };
    
    useEffect(() => { 
        if (user) { fetchContestDesigns(); fetchUserVoteStatus(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); 

    const handleVote = async (designId) => {
        try {
            const response = await client.post(`/contest/vote/${designId}`);
            toast({ title: "Vote Cast!", description: response.data.message || "Vote recorded.", status: "success", /*...*/});
            const updatedDesigns = contestDesigns.map(d => d._id === designId ? { ...d, votes: (d.votes || 0) + 1 } : d).sort((a, b) => (b.votes || 0) - (a.votes || 0));
            setContestDesigns(updatedDesigns);
            setUserVotesLeft(userVotesLeft - 1);
            setVotedDesignIds(prevVoted => [...prevVoted, designId]);
        } catch (err) { /* ... error handling, same as before ... */ 
            console.error("Error casting vote:", err);
            const errorMessage = err.response?.data?.message || "Failed to cast vote.";
            toast({ title: "Vote Failed", description: errorMessage, status: "error", /*...*/});
            if (err.response?.status === 401) { logout(); navigate('/login');}
        }
    };

    if (loading && !user) { return <Box textAlign="center" mt={20}><Text color="brand.textLight">Please log in to view the contest.</Text></Box>; }
    if (loading) { return <Box textAlign="center" mt={20}><Spinner size="xl" color="brand.primary" thickness="4px"/><Text mt={4} color="brand.textLight">Loading Contest Gallery...</Text></Box>; }
    if (error) { return <Box textAlign="center" mt={20} px={4}><Alert status="error" bg="brand.paper" borderRadius="md"><AlertIcon /><Text color="brand.textDark">{error}</Text></Alert></Box>; }

    return (
        <Box maxW="container.lg" mx="auto" mt={{base:6, md:8}} px={4} pb={10}>
            <VStack spacing={4} align="center" mb={8}>
                <Heading as="h1" size="2xl">🏆 Monthly Design Contest 🏆</Heading>
                <Text fontSize="xl" color="brand.textLight">
                    Vote for your favorite designs! You have <Text as="span" fontWeight="bold" color="brand.accentYellow">{userVotesLeft}</Text> vote(s) left this month.
                </Text>
                {userVotesLeft <= 0 && <Text color="brand.accentYellow" fontWeight="bold" fontSize="lg">You've used all your votes for this month. Check back next month!</Text>}
            </VStack>

            {contestDesigns.length === 0 ? (
                <VStack spacing={5} p={8} bg="rgba(255,255,255,0.1)" borderRadius="xl" shadow="md" borderWidth="1px" borderColor="rgba(255,255,255,0.2)" mt={8}>
                  <Icon as={FaRegSadCry} boxSize="60px" color="brand.textLight" />
                  <Text fontSize="xl" fontWeight="medium" color="brand.textLight" textAlign="center">
                    No designs submitted for this month's contest yet. <br/>
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
                            transition="all 0.2s ease-in-out"
                            _hover={{ boxShadow: "2xl", transform: "translateY(-4px) scale(1.02)" }}
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
                                        placement="top" bg="gray.700" color="white" hasArrow
                                    >
                                        <Button
                                            bg="brand.accentYellow" color="brand.textDark"
                                            _hover={{bg: "brand.accentYellowHover"}}
                                            size="md" px={6} borderRadius="full"
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
