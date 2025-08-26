import React from "react";
import { Box, Heading, Badge } from "@chakra-ui/react";
export default function SectionCard({ title, ephemeral, children, ...rest }) {
  return (
    <Box borderWidth="1px" borderRadius="md" p={4} mb={6} {...rest}>
      <Heading size="md" mb={3} display="flex" alignItems="center" gap={3}>
        {title}
        {ephemeral && <Badge colorScheme="orange" title="Changes reset on restart">EPHEMERAL</Badge>}
      </Heading>
      {children}
    </Box>
  );
}