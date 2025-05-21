import { useState, useEffect } from "react";
import { VStack, List, ListItem, Box, Heading, Text, HStack, Textarea, Input, Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { client } from "../api/client";

export default function SchedulePost() {
  const [schedules, setSchedules] = useState([]);
  useEffect(() => { client.get('/schedule-posts').then(res => console.log('schedule-post response', res.data)).then(res => setSchedules(res.data)); }, []);
  const handleDelete = async (jobId) => { await client.delete(`/schedule-posts/${jobId}`); setSchedules(schedules.filter(s => s.jobId !== jobId)); };
  const handleEdit   = (jobId) => navigate(`/schedule/${jobId}`);
  const [text, setText] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [repeat, setRepeat] = useState('');

  useEffect(() => {
    client.get('/schedule-posts').then(({ data }) => setPosts(data));
  }, []);

  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    client.get('/schedule-posts').then(({ data }) => setPosts(data));
  }, []);


  const handleSubmit = async () => {
    await client.post('/schedule-post', {
      draftText: text,
      dateTimeUTC: dateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      repeatRule: repeat
    });
    navigate('/dashboard');
  };

  return (
    <Box maxW="lg" mx="auto" mt={8} p={4} borderWidth="1px" borderRadius="md">
      <Heading mb={4}>Schedule a Post</Heading>
      <Textarea mb={2} placeholder="Your post text…" value={text} onChange={e => setText(e.target.value)} />
      <Input type="datetime-local" mb={2} value={dateTime} onChange={e => setDateTime(e.target.value)} />
      <Input placeholder="Repeat rule (cron)" mb={4} value={repeat} onChange={e => setRepeat(e.target.value)} />
      <Button colorScheme="blue" onClick={handleSubmit}>Schedule</Button>
      <Button variant="ghost" ml={2} onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>

      <Heading size="md" mt={8} mb={4}>Your Scheduled Posts</Heading>
      {schedules.map(s => (
        <Box key={s.jobId} p={2} borderWidth="1px" borderRadius="md" mb={2}>
          <HStack justify="space-between">
            <Text>{s.draftText} — {new Date(s.dateTimeUTC).toLocaleString()}</Text>
            <HStack>
              <Button size="sm" onClick={() => handleEdit(s.jobId)}>Edit</Button>
              <Button size="sm" colorScheme="red" onClick={() => handleDelete(s.jobId)}>Delete</Button>
            </HStack>
          </HStack>
        </Box>
      ))}
    </Box>
  );
}
