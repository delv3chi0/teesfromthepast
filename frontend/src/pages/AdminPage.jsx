// inside AdminPage.jsx

// ... keep your imports, add this icon at top:
import { FaInfoCircle, FaTrashAlt, FaUserSlash, FaSync } from "react-icons/fa"; // you already have these
import AdminAuditLogs from "./AdminAuditLogs.jsx";

// add local state near other modals:
const { isOpen: isSessionDetailsOpen, onOpen: onSessionDetailsOpen, onClose: onSessionDetailsClose } = useDisclosure();
const [sessionDetails, setSessionDetails] = useState(null);

// update dataFetchers[4] to request active only
4: useCallback(async () => {
  if (sessions.length > 0) return;
  setLoadingSessions(true); setSessionsError("");
  try {
    const { data } = await client.get("/admin/sessions", {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: sessionsPage, limit: 100, includeRevoked: false }, // active only
    });
    setSessions(data.items || []);
  } catch (e) {
    setSessionsError("Failed to fetch sessions");
  } finally {
    setLoadingSessions(false);
  }
}, [token, sessions.length, sessionsPage]),

// helper to open details:
const openSessionDetails = async (_detailsId) => {
  try {
    const { data } = await client.get(`/admin/sessions/details/${_detailsId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setSessionDetails(data);
    onSessionDetailsOpen();
  } catch {
    toast({ title: "Failed to load session details", status: "error" });
  }
};

// modify revokeSession to optimistically remove
const revokeSession = async (_detailsId) => {
  // optimistic UI
  const prev = sessions;
  setSessions((s) => s.filter((x) => x._detailsId !== _detailsId));
  try {
    await client.delete(`/admin/sessions/${_detailsId}`, { headers: { Authorization: `Bearer ${token}` } });
    toast({ title: "Session revoked", status: "success" });
  } catch {
    // revert on failure
    setSessions(prev);
    toast({ title: "Failed to revoke session", status: "error" });
  }
};

// DevicesPanel JSX (replace your existing DevicesPanel const):
const DevicesPanel = () => (
  <Box p={{ base: 2, md: 4 }} layerStyle="cardBlue" w="100%">
    <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
      <Heading size="md">Devices / Active Sessions</Heading>
      <Button
        leftIcon={<FaSync />}
        size="sm"
        onClick={async () => {
          setLoadingSessions(true);
          try {
            const { data } = await client.get("/admin/sessions", {
              headers: { Authorization: `Bearer ${token}` },
              params: { page: sessionsPage, limit: 100, includeRevoked: false },
            });
            setSessions(data.items || []);
          } catch (e) {
            toast({ title: "Failed to refresh sessions", status: "error" });
          } finally { setLoadingSessions(false); }
        }}
        isLoading={loadingSessions}
      >
        Refresh
      </Button>
    </HStack>

    {loadingSessions ? (
      <VStack p={10}><Spinner/></VStack>
    ) : sessionsError ? (
      <Alert status="error"><AlertIcon/>{sessionsError}</Alert>
    ) : (
      <TableContainer w="100%">
        <Table size="sm" variant="simple" w="100%">
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>IP</Th>
              <Th>User Agent</Th>
              <Th>Created</Th>
              <Th>Expires</Th>
              <Th isNumeric>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sessions.map((i) => (
              <Tr key={i._detailsId}>
                <Td>
                  <Text fontWeight="bold">{i.user?.username || "(unknown)"}</Text>
                  <Text fontSize="xs" color="gray.500">{i.user?.email}</Text>
                  {i.user?._id && (
                    <Tooltip label="Revoke ALL for this user">
                      <ChakraIconButton
                        ml={2}
                        size="xs"
                        icon={<FaUserSlash />}
                        aria-label="Revoke all"
                        onClick={() => revokeAllForUser(i.user?._id)}
                      />
                    </Tooltip>
                  )}
                </Td>
                <Td>{i.ip || "-"}</Td>
                <Td><Text maxW="360px" noOfLines={1} title={i.userAgent}>{i.userAgent || "-"}</Text></Td>
                <Td>{new Date(i.createdAt).toLocaleString()}</Td>
                <Td>{new Date(i.expiresAt).toLocaleString()}</Td>
                <Td isNumeric>
                  <Tooltip label="Session Details">
                    <ChakraIconButton
                      size="sm"
                      mr={2}
                      icon={<FaInfoCircle />}
                      aria-label="Details"
                      onClick={() => openSessionDetails(i._detailsId)}
                    />
                  </Tooltip>
                  <Tooltip label="Revoke this session">
                    <ChakraIconButton
                      size="sm"
                      icon={<FaTrashAlt />}
                      aria-label="Revoke"
                      onClick={() => revokeSession(i._detailsId)}
                    />
                  </Tooltip>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    )}
  </Box>
);

// Add this modal near your other modals in AdminPage.jsx
<Modal isOpen={isSessionDetailsOpen} onClose={() => { onSessionDetailsClose(); setSessionDetails(null); }} size="lg" scrollBehavior="inside" isCentered>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Session Details</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      {!sessionDetails ? (
        <VStack p={10}><Spinner/></VStack>
      ) : (
        <VStack align="start" spacing={3} fontSize="sm">
          <Text><strong>User:</strong> {sessionDetails.user?.username} ({sessionDetails.user?.email})</Text>
          <Text><strong>IP:</strong> {sessionDetails.ip}</Text>
          <Text><strong>User Agent:</strong> {sessionDetails.userAgent}</Text>
          <Text><strong>Created:</strong> {new Date(sessionDetails.createdAt).toLocaleString()}</Text>
          <Text><strong>Expires:</strong> {new Date(sessionDetails.expiresAt).toLocaleString()}</Text>
          {sessionDetails.revokedAt && <Text color="red.300"><strong>Revoked:</strong> {new Date(sessionDetails.revokedAt).toLocaleString()}</Text>}
          <Divider/>
          <Heading size="xs">Client Headers</Heading>
          <Box w="100%" p={3} bg="blackAlpha.400" borderRadius="md">
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
{JSON.stringify(sessionDetails.meta?.client || {}, null, 2)}
            </pre>
          </Box>
        </VStack>
      )}
    </ModalBody>
    <ModalFooter><Button onClick={onSessionDetailsClose}>Close</Button></ModalFooter>
  </ModalContent>
</Modal>
