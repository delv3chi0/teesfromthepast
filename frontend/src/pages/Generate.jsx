import {
  Box, VStack, HStack, Heading, Text, Textarea, Button, Image, Icon,
  useToast, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  Badge, Tooltip, Input as ChakraInput
} from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";
import { FaPowerOff, FaPlay, FaForward, FaBackward, FaEject, FaMagic, FaSave, FaUpload } from "react-icons/fa";
import { client } from "../api/client";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";

const ART_STYLES = ["Classic Art", "Stencil Art", "Embroidery Style"];
const DECADES = ["1960s", "1970s", "1980s", "1990s"];

function Dial({ label, valueIndex, setValueIndex, options }) {
  const sweep = 240 / (options.length - 1);
  const deg = -120 + valueIndex * sweep;
  return (
    <VStack spacing={1} w="132px">
      <Text fontSize="xs" color="yellow.300" letterSpacing="0.08em">{label}</Text>
      <Box
        onClick={() => setValueIndex((i) => (i + 1) % options.length)}
        w="84px" h="84px" borderRadius="full" position="relative"
        cursor="pointer"
        sx={{
          background: "radial-gradient(40% 40% at 50% 50%, #3a4048 0%, #1e242c 60%)",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,.85), 0 8px 18px rgba(0,0,0,.5)"
        }}
      >
        <Box position="absolute" inset="0"
             bgGradient="conic-gradient(from -120deg, transparent 0deg, rgba(255,255,255,.10) 2deg, transparent 2deg)"
             style={{ maskImage: "radial-gradient(circle at center, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 59%)" }} />
        <Box position="absolute" left="50%" top="50%" transform={`translate(-50%,-50%) rotate(${deg}deg)`}
             transformOrigin="50% 50%" transition="transform .25s ease">
          <Box w="4px" h="28px" bg="yellow.300" borderRadius="2px" mx="auto" />
          <Box mt="5px" w="22px" h="22px" bg="gray.700" borderRadius="full" mx="auto"
               boxShadow="inset 0 1px 2px rgba(255,255,255,.08), 0 1px 2px rgba(0,0,0,.6)" />
        </Box>
      </Box>
      <Text fontSize="xs" color="whiteAlpha.800">{options[valueIndex]}</Text>
    </VStack>
  );
}

function VCR({ tapePreview, onSelectTape, onEject, imageStrength, setImageStrength }) {
  return (
    <Box position="absolute" top="-84px" left="50%" transform="translateX(-50%)"
         w={{ base: "92%", md: "760px" }} bg="#0f1217" borderRadius="md"
         border="1px solid rgba(255,255,255,.12)"
         boxShadow="0 10px 22px rgba(0,0,0,.5), inset 0 0 0 1px rgba(0,0,0,.75)">
      <HStack p={3} spacing={3} align="center">
        <Box w="160px" h="94px" bg="black" border="1px solid rgba(255,255,255,.08)" borderRadius="sm"
             display="flex" alignItems="center" justifyContent="center" overflow="hidden">
          {tapePreview
            ? <Image src={tapePreview} alt="Tape" maxW="100%" maxH="100%" objectFit="contain" />
            : <Text fontSize="xs" color="whiteAlpha.600">Tape window</Text>}
        </Box>

        <VStack align="stretch" spacing={2} flex="1">
          <HStack spacing={2}>
            <Tooltip label="Rewind"><Button size="sm" variant="outline" leftIcon={<FaBackward />} isDisabled>Rew</Button></Tooltip>
            <Tooltip label="Play"><Button size="sm" variant="outline" leftIcon={<FaPlay />} isDisabled>Play</Button></Tooltip>
            <Tooltip label="Fast Forward"><Button size="sm" variant="outline" leftIcon={<FaForward />} isDisabled>FF</Button></Tooltip>
            <Tooltip label="Eject (clear tape)"><Button size="sm" colorScheme="red" leftIcon={<FaEject />} onClick={onEject}>Eject</Button></Tooltip>
          </HStack>

          <HStack spacing={4}>
            <Text fontSize="xs" color="whiteAlpha.800" w="120px">Image Influence</Text>
            <Slider value={Math.round(imageStrength * 100)} onChange={(v) => setImageStrength(v / 100)} min={0} max={100} step={1} flex="1">
              <SliderTrack bg="whiteAlpha.300"><SliderFilledTrack bg="yellow.400" /></SliderTrack>
              <SliderThumb />
            </Slider>
            <Text fontSize="xs" w="40px" textAlign="right" color="whiteAlpha.800">{Math.round(imageStrength * 100)}%</Text>
          </HStack>

          <HStack>
            <ChakraInput
              type="file" accept="image/*"
              onChange={(e) => onSelectTape(e.target.files?.[0] || null)}
              bg="whiteAlpha.200" borderColor="whiteAlpha.300" color="white" size="sm" p={1}
            />
            <Icon as={FaUpload} color="whiteAlpha.700" />
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}

export default function Generate() {
  const [powerOn, setPowerOn] = useState(true);
  const [artIndex, setArtIndex] = useState(0);
  const [decadeIndex, setDecadeIndex] = useState(2);
  const [userCaption, setUserCaption] = useState("");
  const [screenSrc, setScreenSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [tapeFile, setTapeFile] = useState(null);
  const [tapePreview, setTapePreview] = useState("");
  const [imageStrength, setImageStrength] = useState(0.35);

  const toast = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const engineeredPrompt = useMemo(() => {
    let base = userCaption?.trim() || "";
    const style = ART_STYLES[artIndex];
    if (style === "Stencil Art") base = `monochrome stencil art, clean sharp outlines, high contrast, vector aesthetic, ${base}`;
    else if (style === "Embroidery Style") base = `embroidery pattern aesthetic, satin stitch, limited colors, clean edges, vector-friendly, ${base}`;
    const decade = DECADES[decadeIndex];
    base = `${base}, retro ${decade} photography vibe, period-accurate color/lighting/wardrobe`;
    return base;
  }, [userCaption, artIndex, decadeIndex]);

  const onSelectTape = useCallback((file) => {
    setTapeFile(file);
    if (!file) { setTapePreview(""); return; }
    const r = new FileReader();
    r.onloadend = () => setTapePreview(String(r.result || ""));
    r.readAsDataURL(file);
  }, []);
  const onEject = () => { setTapeFile(null); setTapePreview(""); };

  const handleGenerate = async () => {
    setErr("");
    if (!powerOn) { toast({ title: "TV is off", description: "Turn power on to generate.", status: "info" }); return; }
    if (!engineeredPrompt) { toast({ title: "Describe your image first", status: "warning" }); return; }
    setLoading(true);
    try {
      const body = { prompt: engineeredPrompt };
      if (tapePreview) body.initImageBase64 = tapePreview;    // img2img
      if (typeof imageStrength === "number") body.imageStrength = imageStrength;

      const res = await client.post("/designs/create", body);
      const { imageDataUrl, masterUrl } = res.data || {};
      setScreenSrc(imageDataUrl || masterUrl || "");
      window.__lastGen = {
        imageDataUrl: imageDataUrl || "",
        masterUrl: masterUrl || "",
        thumbUrl: res.data?.thumbUrl || "",
        userCaption,
      };
    } catch (e) {
      const msg = e.response?.data?.message || "Failed to generate image.";
      setErr(msg);
      if (e.response?.status === 401) { logout(); navigate("/login"); }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const gen = window.__lastGen;
    if (!gen?.imageDataUrl && !gen?.masterUrl) { toast({ title: "Generate an image first", status: "info" }); return; }
    setSaving(true);
    try {
      await client.post("/mydesigns", {
        prompt: gen.userCaption || userCaption || "Untitled",
        imageDataUrl: gen.imageDataUrl || undefined,
        masterUrl: gen.masterUrl || undefined,
        thumbUrl: gen.thumbUrl || undefined,
      });
      toast({ title: "Design Saved!", status: "success" });
    } catch (e) {
      const msg = e.response?.data?.message || "Save failed.";
      setErr(msg);
      if (e.response?.status === 401) { logout(); navigate("/login"); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack spacing={8} align="stretch" px={{ base: 3, md: 6 }} py={6}>
      <Heading as="h1" size="2xl" color="brand.textLight" textAlign="center">AI IMAGE GENERATOR</Heading>

      <Box
        maxW="980px" mx="auto" position="relative"
        borderRadius="2xl"
        sx={{
          background:
            "linear-gradient(#5e3b22, #4b301c) padding-box, linear-gradient(135deg, rgba(255,255,255,.25), rgba(0,0,0,.4)) border-box",
          border: "10px solid transparent",
          boxShadow: "0 20px 50px rgba(0,0,0,.5), inset 0 0 0 1px rgba(0,0,0,.25)",
        }}
        pb="120px" // space for lower controls
      >
        {/* band sticker logo ON the bezel */}
        <Box position="absolute" top="6px" left="12px" transform="rotate(-6deg)">
          <Badge colorScheme="yellow" variant="solid">TeesFromThePast</Badge>
        </Box>

        {/* bunny ears next to VCR */}
        <Box position="absolute" top="-94px" left="calc(50% + 340px)">
          <Box w="2px" h="64px" bg="silver" transform="rotate(-18deg)" />
          <Box w="2px" h="64px" bg="silver" transform="rotate(24deg)" ml="12px" />
        </Box>

        {/* VCR on top */}
        <VCR
          tapePreview={tapePreview}
          onSelectTape={onSelectTape}
          onEject={onEject}
          imageStrength={imageStrength}
          setImageStrength={setImageStrength}
        />

        {/* Bezel + screen */}
        <Box m={6} borderRadius="lg" p={3} bgGradient="linear(to-b, #0c1016, #0b0e14)"
             border="1px solid rgba(255,255,255,.08)" boxShadow="inset 0 0 25px rgba(0,0,0,.9)">
          <Box position="relative" h={{ base: "320px", md: "460px" }} borderRadius="md" overflow="hidden"
               bgGradient={powerOn
                 ? "radial(circle at 50% 20%, #1b2330 0%, #0e141c 45%, #0b0f15 100%)"
                 : "linear(to-b, #030506, #010203)"}
               border="1px solid rgba(255,255,255,.06)">
            {screenSrc ? (
              <Image src={screenSrc} alt="Generated" position="absolute" inset="0" m="auto"
                     maxH="100%" maxW="100%" objectFit="contain"
                     filter={powerOn ? "none" : "grayscale(1) brightness(.2)"} />
            ) : (
              <VStack position="absolute" inset="0" justify="center" spacing={3} color="whiteAlpha.700">
                <Icon as={FaMagic} boxSize={8} />
                <Text fontSize="sm">Your Generated Image Will Appear Here</Text>
              </VStack>
            )}
            {powerOn && (
              <Box position="absolute" inset="0"
                   background="repeating-linear-gradient(to bottom, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 3px)"
                   pointerEvents="none" />
            )}
          </Box>

          {/* Controls under screen */}
          <HStack justify="space-between" align="center" mt={3}>
            <Button size="sm" colorScheme={powerOn ? "red" : "gray"} onClick={() => setPowerOn((p) => !p)}>
              <Icon as={FaPowerOff} mr={2} /> Power
            </Button>
            <HStack spacing={10}>
              <Dial label="Art Style" valueIndex={artIndex} setValueIndex={setArtIndex} options={ART_STYLES} />
              <Dial label="Decade" valueIndex={decadeIndex} setValueIndex={setDecadeIndex} options={DECADES} />
            </HStack>
          </HStack>

          <Text mt={3} fontSize="xs" color="whiteAlpha.700" textAlign="center">
            Tune your image or disable the retro-renderer.
          </Text>
        </Box>

        {/* Caption block beneath TV */}
        <Box mx={6} bg="rgba(0,0,0,.35)" p={4} borderRadius="lg" border="1px solid rgba(255,255,255,.08)">
          <Text fontSize="sm" mb={2} color="yellow.200">Describe your image idea</Text>
          <Textarea
            value={userCaption}
            onChange={(e) => setUserCaption(e.target.value)}
            placeholder="e.g., Make this cat a lion"
            bg="rgba(255,255,255,.08)"
            borderColor="whiteAlpha.400"
            _hover={{ borderColor: "whiteAlpha.600" }}
            _placeholder={{ color: "whiteAlpha.700" }}
            color="white"
            minH="90px"
          />
        </Box>

        <HStack mx={6} my={6} spacing={4} justify="space-between">
          <Button size="lg" colorScheme="orange" leftIcon={<FaMagic />} isLoading={loading} onClick={handleGenerate}>
            Generate Image
          </Button>
          <Button size="lg" colorScheme="yellow" leftIcon={<FaSave />} isLoading={saving} onClick={handleSave}>
            Save This Design
          </Button>
        </HStack>
      </Box>

      {!!err && (
        <Box maxW="980px" mx="auto" color="red.300" bg="red.900" border="1px solid" borderColor="red.700" p={3} borderRadius="md">
          {err}
        </Box>
      )}
    </VStack>
  );
}
