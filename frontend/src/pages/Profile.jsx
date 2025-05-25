import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Heading, Input, Button, Text, HStack } from '@chakra-ui/react';
import { client } from '../api/client';
import LogoutButton from '../components/LogoutButton';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    instagramHandle: '',
    tiktokHandle: ''
  });
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  // load once
  useEffect(() => {
    client.get('/auth/profile').then(({ data }) => {
      setProfile(data);
      setForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        instagramHandle: data.instagramHandle || '',
        tiktokHandle: data.tiktokHandle || ''
      });
    });
  }, []);

  // handle input change
  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  // save or cancel
  const handleSave = async () => {
    await client.put('/profile', form);
    setProfile(p => ({ ...p, ...form }));
    setEditing(false);
  };
  const handleCancel = () => {
    setForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      instagramHandle: profile.instagramHandle || '',
      tiktokHandle: profile.tiktokHandle || ''
    });
    setEditing(false);
  };

  if (!profile) return <Text>Loading…</Text>;

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth="1px" borderRadius="md">
      <Heading size="lg" mb={6}>Your Profile</Heading>

      <Input
        name="firstName"
        placeholder="First Name"
        mb={3}
        value={form.firstName}
        onChange={handleChange}
        isDisabled={!editing}
      />
      <Input
        name="lastName"
        placeholder="Last Name"
        mb={3}
        value={form.lastName}
        onChange={handleChange}
        isDisabled={!editing}
      />
      <Input
        name="instagramHandle"
        placeholder="Instagram Handle"
        mb={3}
        value={form.instagramHandle}
        onChange={handleChange}
        isDisabled={!editing}
      />
      <Input
        name="tiktokHandle"
        placeholder="TikTok Handle"
        mb={3}
        value={form.tiktokHandle}
        onChange={handleChange}
        isDisabled={!editing}
      />
      <Input
        placeholder="Email"
        mb={6}
        value={profile.email}
        isReadOnly
      />

      <HStack spacing={4} mb={4}>
        {!editing ? (
          <Button colorScheme="blue" onClick={() => setEditing(true)}>Edit</Button>
        ) : (
          <>
            <Button colorScheme="green" onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          </>
        )}
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>
      </HStack>

      <LogoutButton />
    </Box>
  );
}
