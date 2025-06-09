import { VStack, Heading, Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <VStack spacing={6} mt={20}>
      <Heading size="2xl">Tees From The Past</Heading>
      <Button as={Link} to="/generate" colorScheme="teal">Create Your Own Design</Button>
      <Button as={Link} to="/vote" colorScheme="orange">Vote on This Month’s Designs</Button>
      <Button as={Link} to="/login" colorScheme="blue">Login</Button>
      <Button as={Link} to="/register" colorScheme="green">Register</Button>
    </VStack>
  );
}
