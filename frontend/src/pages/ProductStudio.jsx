// frontend/src/pages/ProductStudio.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid, AspectRatio, Image,
  Tooltip, useToast, Skeleton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Input, Divider, Badge, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, IconButton
} from "@chakra-ui/react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus } from "react-icons/fa";
import { client } from "../api/client";

// ---------- constants ----------
const DPI = 300;                        // print resolution
const ASPECT = 2 / 3;                   // preview canvas aspect ratio
const PLACEHOLDER = "https://placehold.co/800x1000/1a202c/a0aec0?text=Preview";

// Approximate print areas per view. Tweak later per product if desired.
const PRINT_AREAS = {
  front:  { widthInches: 12, heightInches: 16 },
  back:   { widthInches: 12, heightInches: 16 },
  sleeve: { widthInches: 3.5, heightInches: 3.5 },
};

// Helpers
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function getMockupUrl(product, view, color) {
  if (!product) return null;

  // Prefer a variant matching the chosen color
  const v =
    (product.variants || []).find(x => !color || x.color === color) ||
    (product.variants || [])[0];

  // Try to find a useful image
  const tryFiles = (files = []) => {
    const byType = (t) =>
      files.find((f) => f?.type === t && (f.preview_url || f.url || f.thumbnail_url));
    const f = byType("preview") || byType("mockup") || files[0];
    return f?.preview_url || f?.url || f?.thumbnail_url || null;
  };

  const pick = () => {
    // If your transform exposed per-view URLs, map by "view" here.
    if (v?.image) return v.image;
    if (v?.imageSet?.[0]?.url) return v.imageSet[0].url;
    const f = tryFiles(v?.files);
    if (f) return f;
    if (product.image) return product.image;
    if (product.images?.[0]?.url) return product.images[0].url;
    if (product.images?.[0]) return product.images[0];
    return null;
  };

  return pick() || PLACEHOLDER;
}

// ===============================================
//                  Component
// ===============================================
function ProductStudioInner() {
  const toast = useToast();
  const navigate = useNavigate();
  const query = useQuery();

  // Expect URL like: /product-studio?slug=classic-tee&color=Black&size=M
  const slugFromQuery  = query.get("slug")  || "";
  const colorFromQuery = query.get("color") || "";
  const sizeFromQuery  = query.get("size")  || "";

  // product + selection
  const [product, setProduct] = useState(null);
  const [view, setView]       = useState("front");
  const [color, setColor]     = useState(colorFromQuery);
  const [size, setSize]       = useState(sizeFromQuery);

  // saved designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

  // fabric canvas
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const fabricRef = useRef(null);

  // tools + UX
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize]   = useState(36);
  const [zoom, setZoom]           = useState(1);
  const [hasObjects, setHasObjects] = useState(false);

  // undo/redo stacks
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // ---------- fetch product (by slug) ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slugFromQuery) return;

      try {
        const res = await client.get(`/storefront/product/${slugFromQuery}`);
        if (cancelled) return;
        const p = res.data;
        setProduct(p);

        // Default color/size when not provided
        if (!colorFromQuery) {
          const guessColor =
            (p.colors && p.colors[0]) ||
            (p.variants?.find(v => !!v.color)?.color) ||
            "";
          setColor(guessColor);
        }
        if (!sizeFromQuery) {
          const guessSize =
            (p.sizes && p.sizes[0]) ||
            (p.variants?.find(v => !!v.size)?.size) ||
            "";
          setSize(guessSize);
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Could not load product", status: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [slugFromQuery, colorFromQuery, sizeFromQuery, toast]);

  // ---------- fetch saved designs ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDesigns(true);
        const res = await client.get("/mydesigns");
        if (!cancelled) setDesigns(res.data || []);
      } catch {
        // Not fatal
      } finally {
        if (!cancelled) setLoadingDesigns(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- init fabric ----------
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    if (!fabricRef.current) {
      const parentW = wrapRef.current.clientWidth;
      const parentH = parentW / ASPECT;

      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: parentW,
        height: parentH,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      const onChange = () =>
        setHasObjects(fc.getObjects().filter(o => o.id !== "printArea").length > 0);
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
    }

    const ro = new ResizeObserver(() => {
      if (!fabricRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = w / ASPECT;
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      fabricRef.current.requestRenderAll();
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // ---------- history helpers ----------
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id"])));
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);

  const applyJSON = (json) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll(), (o, obj) => obj);
  };

  const undo = () => {
    const fc = fabricRef.current;
    if (!fc || undoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };

  const redo = () => {
    const fc = fabricRef.current;
    if (!fc || redoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  // ---------- draw mockup + print area ----------
  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const imgUrl = getMockupUrl(product, view, color) || PLACEHOLDER;

    // keep user objects
    const userObjects = fc.getObjects().filter((o) => o.id !== "printArea");
    fc.clear();
    userObjects.forEach((o) => fc.add(o));

    window.fabric.Image.fromURL(
      imgUrl,
      (img) => {
        const scale = Math.min(fc.width / img.width, fc.height / img.height);
        fc.setBackgroundImage(img, fc.renderAll.bind(fc), {
          scaleX: scale,
          scaleY: scale,
          top: fc.height / 2,
          left: fc.width / 2,
          originX: "center",
          originY: "center",
        });

        const area = PRINT_AREAS[view] || PRINT_AREAS.front;
        const pxW = area.widthInches * DPI * (scale / 3); // preview downscale fudge
        const pxH = area.heightInches * DPI * (scale / 3);

        const rect = new window.fabric.Rect({
          id: "printArea",
          left: fc.width / 2,
          top: fc.height / 2,
          originX: "center",
          originY: "center",
          width: pxW,
          height: pxH,
          fill: "",
          stroke: "white",
          strokeDashArray: [6, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
        });
        fc.add(rect);
        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, view, color]);

  useEffect(() => { refreshBackground(); }, [refreshBackground]);

  // ---------- constraints: keep objects inside print area ----------
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const constrain = () => {
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const objs = fc.getObjects().filter((o) => o.id !== "printArea");
      objs.forEach((o) => {
        const bb = o.getBoundingRect(true, true);
        const a = area.getBoundingRect(true, true);
        if (bb.left < a.left) o.left += (a.left - bb.left);
        if (bb.top < a.top) o.top += (a.top - bb.top);
        if (bb.left + bb.width > a.left + a.width)
          o.left -= (bb.left + bb.width - (a.left + a.width));
        if (bb.top + bb.height > a.top + a.height)
          o.top -= (bb.top + bb.height - (a.top + a.height));
        o.setCoords();
      });
      fc.requestRenderAll();
    };

    fc.on("object:moving", constrain);
    fc.on("object:scaling", constrain);
    fc.on("object:rotating", constrain);
    return () => {
      fc.off("object:moving", constrain);
      fc.off("object:scaling", constrain);
      fc.off("object:rotating", constrain);
    };
  }, [view]);

  // ---------- tools ----------
  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim()) return toast({ title: "Enter text first", status: "info" });
    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2,
      top: fc.height / 2,
      originX: "center",
      originY: "center",
      fill: textColor,
      fontSize: textSize,
    });
    pushHistory();
    fc.add(t);
    fc.setActiveObject(t);
    fc.requestRenderAll();
    setTextValue("");
  };

  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(
      design.imageDataUrl,
      (img) => {
        img.set({
          left: fc.width / 2,
          top: fc.height / 2,
          originX: "center",
          originY: "center",
          scaleX: 0.5,
          scaleY: 0.5,
        });
        pushHistory();
        fc.add(img);
        fc.setActiveObject(img);
        fc.requestRenderAll();
        setSelectedDesignId(design._id);
      },
      { crossOrigin: "anonymous" }
    );
  };

  const del = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea") return;
    pushHistory();
    fc.remove(active);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };

  const centerH = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea") return;
    o.centerH();
    fc.requestRenderAll();
  };

  const setZoomSafe = (z) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const clamped = Math.max(0.5, Math.min(2, z));
    setZoom(clamped);
    fc.setZoom(clamped);
    fc.requestRenderAll();
  };

  // ---------- export print-ready + upload ----------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;

    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter((o) => o.id !== "printArea");
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const spec = PRINT_AREAS[view] || PRINT_AREAS.front;
    const outW = Math.round(spec.widthInches * DPI);
    const outH = Math.round(spec.heightInches * DPI);

    // Clone user objects relative to area center, scaled up to 300 DPI
    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);
    const scaleFactor = outW / aBB.width;

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top - aBB.top + bb.height / 2;

      clone.originX = "center";
      clone.originY = "center";
      clone.left = relX * scaleFactor;
      clone.top  = relY * scaleFactor;
      clone.scaleX = o.scaleX * scaleFactor;
      clone.scaleY = o.scaleY * scaleFactor;

      if (clone.type === "i-text") clone.fontSize = (o.fontSize || 36) * scaleFactor;
      tmp.add(clone);
    });
    tmp.requestRenderAll();

    const png = tmp.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    tmp.dispose();

    // Also keep a full-canvas preview for cart thumbnail
    const previewPNG = fc.toDataURL({ format: "png", quality: 0.92 });

    try {
      toast({ title: "Uploading design…", status: "info", duration: 3000 });
      const upload = await client.post("/upload-print-file", {
        imageData: png,
        designName: `${product?.name || "Custom"} ${view}`,
      });
      const fileUrl = upload.data?.publicUrl;
      if (!fileUrl) throw new Error("Upload failed");

      const unitPrice =
        product?.priceMin || product?.basePrice || product?.variants?.[0]?.price || 0;

      const checkoutItem = {
        productId: product?.id || product?._id || "",
        slug: product?.slug || slugFromQuery,
        color,
        size,
        view,
        preview: previewPNG,
        printFileUrl: fileUrl,
        name: product?.name,
        unitPrice,
        productImage: getMockupUrl(product, view, color),
      };

      localStorage.setItem("itemToCheckout", JSON.stringify(checkoutItem));
      navigate("/checkout");
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", status: "error" });
    }
  };

  // ---------- computed lists ----------
  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => {
      if (!color || v.color === color) v.size && set.add(v.size);
    });
    return Array.from(set);
  }, [product, color]);

  const colors = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(v.color));
    (product?.colors || []).forEach((c) => set.add(c));
    return Array.from(set);
  }, [product]);

  const canProceed = product && (!colors.length || color) && (!sizes.length || size);

  // ---------- UI ----------
  return (
    <Flex direction={{ base: "column", lg: "row" }} minH="100vh" bg="brand.primary">
      {/* Canvas + toolbar */}
      <Box flex="1" p={4} maxW={{ base: "100%", lg: "68%" }}>
        <VStack spacing={3} align="stretch">
          {/* View + history + zoom */}
          <HStack justify="space-between" color="brand.textLight">
            <HStack spacing={2}>
              <Button size="sm" onClick={() => setView("front")}  variant={view==="front" ?"solid":"outline"}>Front</Button>
              <Button size="sm" onClick={() => setView("back")}   variant={view==="back"  ?"solid":"outline"}>Back</Button>
              <Button size="sm" onClick={() => setView("sleeve")} variant={view==="sleeve"?"solid":"outline"}>Sleeve</Button>
            </HStack>

            <HStack spacing={2}>
              <Tooltip label="Undo">
                <Button size="sm" onClick={undo} leftIcon={<Icon as={FaUndo} />}>Undo</Button>
              </Tooltip>
              <Tooltip label="Redo">
                <Button size="sm" onClick={redo} leftIcon={<Icon as={FaRedo} />}>Redo</Button>
              </Tooltip>

              <Tooltip label="Zoom out">
                <IconButton aria-label="Zoom out" icon={<FaSearchMinus />} size="sm" onClick={() => setZoomSafe(zoom - 0.1)} />
              </Tooltip>
              <Slider aria-label="zoom" value={zoom} min={0.5} max={2} step={0.1} onChange={setZoomSafe} w="150px">
                <SliderTrack><SliderFilledTrack /></SliderTrack>
                <SliderThumb />
              </Slider>
              <Tooltip label="Zoom in">
                <IconButton aria-label="Zoom in" icon={<FaSearchPlus />} size="sm" onClick={() => setZoomSafe(zoom + 0.1)} />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Canvas */}
          <Box
            ref={wrapRef}
            w="100%"
            paddingTop={`${100 / ASPECT}%`}
            bg="brand.secondary"
            rounded="md"
            borderWidth="1px"
            borderColor="whiteAlpha.300"
            position="relative"
            overflow="hidden"
          >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
          </Box>

          {/* quick actions */}
          <HStack justify="center" spacing={3}>
            <Tooltip label="Delete selected">
              <Button size="sm" onClick={del} leftIcon={<Icon as={FaTrash} />} colorScheme="red" variant="outline">
                Delete
              </Button>
            </Tooltip>
            <Tooltip label="Center horizontally">
              <Button size="sm" onClick={centerH} leftIcon={<Icon as={FaArrowsAltH} />} variant="outline">
                Center
              </Button>
            </Tooltip>
          </HStack>
        </VStack>
      </Box>

      {/* Controls panel */}
      <Box
        flex="1"
        p={4}
        maxW={{ base: "100%", lg: "32%" }}
        bg="brand.paper"
        borderLeftWidth={{ lg: "1px" }}
        borderColor="whiteAlpha.200"
      >
        {!product ? (
          <VStack p={6} spacing={3} align="stretch">
            <Skeleton height="28px" />
            <Skeleton height="200px" />
            <Skeleton height="28px" />
          </VStack>
        ) : (
          <VStack align="stretch" spacing={6}>
            <Heading size="lg" color="brand.textLight">{product.name}</Heading>
            {product.description ? (
              <Text color="brand.textLight">{product.description}</Text>
            ) : null}

            {/* Color */}
            <Box>
              <Text mb={2} color="brand.textLight" fontWeight="medium">Color</Text>
              <HStack wrap="wrap" spacing={2}>
                {colors.length ? (
                  colors.map((c) => (
                    <Button key={c} size="sm" variant={color === c ? "solid" : "outline"} onClick={() => setColor(c)}>
                      {c}
                    </Button>
                  ))
                ) : (
                  <Badge>No color options</Badge>
                )}
              </HStack>
            </Box>

            {/* Size */}
            <Box>
              <Text mb={2} color="brand.textLight" fontWeight="medium">Size</Text>
              <HStack wrap="wrap" spacing={2}>
                {sizes.length ? (
                  sizes.map((s) => (
                    <Button key={s} size="sm" variant={size === s ? "solid" : "outline"} onClick={() => setSize(s)}>
                      {s}
                    </Button>
                  ))
                ) : (
                  <Badge>No size options</Badge>
                )}
              </HStack>
            </Box>

            <Divider borderColor="whiteAlpha.300" />

            {/* Add Text */}
            <Box>
              <Heading size="md" mb={3} color="brand.textLight">Add Text</Heading>
              <HStack>
                <Input
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="Your text"
                />
                <Button onClick={addText}>Add</Button>
              </HStack>
              <HStack mt={3} spacing={3}>
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  w="52px"
                  p={0}
                />
                <NumberInput
                  value={textSize}
                  min={8}
                  max={200}
                  onChange={(v) => setTextSize(parseInt(v || "36", 10))}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
            </Box>

            {/* Saved Designs */}
            <Box>
              <Heading size="md" mb={3} color="brand.textLight">Saved Designs</Heading>
              {loadingDesigns ? (
                <Skeleton height="28px" />
              ) : designs.length ? (
                <SimpleGrid columns={{ base: 3 }} spacing={2}>
                  {designs.map((d) => (
                    <Tooltip key={d._id} label={d.prompt || "design"}>
                      <Box
                        borderWidth="2px"
                        borderColor={selectedDesignId === d._id ? "purple.400" : "transparent"}
                        rounded="md"
                        overflow="hidden"
                        cursor="pointer"
                        onClick={() => addDesign(d)}
                        _hover={{ borderColor: "whiteAlpha.400" }}
                      >
                        <AspectRatio ratio={1}>
                          <Image src={d.imageDataUrl} alt={d.prompt} objectFit="cover" />
                        </AspectRatio>
                      </Box>
                    </Tooltip>
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="brand.textLight" fontSize="sm">
                  No saved designs yet.
                </Text>
              )}
            </Box>

            <Divider borderColor="whiteAlpha.300" />

            {/* CTA */}
            <VStack spacing={3}>
              <Button
                colorScheme={canProceed && hasObjects ? "purple" : "gray"}
                isDisabled={!canProceed || !hasObjects}
                onClick={makePrintReadyAndUpload}
              >
                Add to cart / Checkout
              </Button>
              <Text fontSize="xs" color="brand.textLight" opacity={0.8} textAlign="center">
                We’ll generate a high-resolution PNG (300 DPI) for Printful and a preview for your cart.
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>
    </Flex>
  );
}

export default function ProductStudio() {
  return <ProductStudioInner />;
}
