import { Box, Heading, Textarea, Button, VStack, Image } from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";

export default function Generate() {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const handleGenerate = async () => {
    const res = await axios.post("/api/generate", { prompt });
    const url = res.data.output?.[0] || res.data?.urls?.get;
    setImageUrl(url);
  };

  return (
    <VStack spacing={6} mt={10}>
      <Heading>AI Image Generator</Heading>
      <Textarea placeholder="Describe your retro shirt idea..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <Button onClick={handleGenerate} colorScheme="purple">Generate Image</Button>
      {imageUrl && <Image src={imageUrl} alt="Generated Tee Art" maxW="300px" borderRadius="md" />}
    </VStack>
  );
}
