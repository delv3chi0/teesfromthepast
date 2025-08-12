import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid, AspectRatio, Image,
  Tooltip, useToast, Skeleton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Input, Divider, Badge, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, Tabs, TabList, TabPanels, Tab, TabPanel,
  Checkbox
} from "@chakra-ui/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus, FaTshirt, FaHatCowboy, FaHockeyPuck } from "react-icons/fa";
import { client } from "../api/client";
import MOCKUPS from "../data/mockups.js";
import { CALIBRATION } from "../data/mockupsMeta.js";

const DPI = 300;
const PLACEHOLDER = "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// product type -> default real print areas
const PRINT_AREAS = {
  tshirt: { front: { widthInches: 12, heightInches: 16 }, back: { widthInches: 12, heightInches: 16 }, sleeve: { widthInches: 4, heightInches: 3.5 } },
  hoodie: { front: { widthInches: 13, heightInches: 13 }, back: { widthInches: 12, heightInches: 16 } },
  tote:   { front: { widthInches: 14, heightInches: 16 }, back: { widthInches: 14, heightInches: 16 } },
  hat:    { front: { widthInches: 4,  heightInches: 1.75 } },
  beanie: { front: { widthInches: 5,  heightInches: 1.75 } },
};
const VIEWS_BY_TYPE = { tshirt: ["front", "back", "sleeve"], hoodie: ["front", "back"], tote: ["front", "back"], hat: ["front"], beanie: ["front"] };

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug  = (p) => norm(p?.slug || p?.name || "");

function detectProductType(product) {
  const text = `${product?.type || product?.category || ""} ${product?.name || ""}`.toLowerCase();
  if (/(tee|t-shirt|shirt|unisex)/.test(text)) return "tshirt";
  if (/(hoodie|sweatshirt)/.test(text)) return "hoodie";
  if (/(tote|bag)/.test(text)) return "tote";
  if (/(hat|cap|trucker|snapback)/.test(text)) return "hat";
  if (/(beanie|knit)/.test(text)) return "beanie";
  return "tshirt";
}
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}
function ProductTypeBadgeIcon({ type }) {
  const IconCmp = type === "tshirt" ? FaTshirt
                : type === "hoodie" ? FaTshirt
                : type === "hat"    ? FaHatCowboy
                : type === "beanie" ? FaHockeyPuck
                : FaTshirt;
  return <Icon as={IconCmp} color="brand.accentYellow" />;
}

export default function ProductStudio() {
  const toast = useToast();
  const navigate = useNavigate();
  const query = useQuery();
  const params = useParams();

  const slugParam = query.get("slug") || params.slug || "";
  const colorParam = query.get("color") || "";
  const sizeParam  = query.get("size")  || "";

  const [product, setProduct] = useState(null);
  const productType = useMemo(() => detectProductType(product), [product]);
  const availableViews = useMemo(() => VIEWS_BY_TYPE[productType] || ["front"], [productType]);

  const [view, setView] = useState("front");
  const [color, setColor] = useState(colorParam);
  const [size, setSize] = useState(sizeParam);

  // stage + mockup + overlay canvas
  const stageRef = useRef(null);
  const mockupRef = useRef(null);
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);

  // UI state
  const [zoom, setZoom] = useState(1);            // canvas zoom (CSS scale)
  const [mockupOpacity, setMockupOpacity] = useState(1);
  const [mockupScalePct, setMockupScalePct] = useState(86); // % of stage height used by mockup
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);

  // canvas internals
  const [hasObjects, setHasObjects] = useState(false);
  const undoStack = useRef([]); const redoStack = useRef([]);

  // text
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);

  // designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

  // --- data fetch ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (!cancelled) {
          const p = res.data;
          setProduct(p);

          // default color & size
          if (!colorParam) {
            const set = new Set();
            (p?.variants || []).forEach(v => v.color && set.add(v.color));
            (p?.colors || []).forEach(c => set.add(c));
            const first = [...set][0]; if (first) setColor(first);
          }
          if (!sizeParam) {
            const set = new Set();
            (p?.variants || []).forEach(v => v.size && set.add(v.size));
            const first = [...set][0]; if (first) setSize(first);
          }

          // default view
          if (!availableViews.includes(view)) setView(availableViews[0]);
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Could not load product", status: "error" });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDesigns(true);
        const res = await client.get("/mydesigns");
        if (!cancelled) setDesigns(res.data || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingDesigns(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // --- mockup URL (no longer drawn into Fabric; rendered as <img />) ---
  function pickMockupUrl(product, view, color) {
    const slugKey = normSlug(product) || norm(slugParam);
    const colorKey = normColor(color);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[view];
    if (bySlug) return bySlug;

    const variants = product?.variants || [];
    const variant = variants.find(v => (v.color === color || v.colorName === color)) || variants[0];
    const tryFiles = (files = []) => {
      const pref = (t) => files.find(f => f?.type === t && (f.preview_url || f.url || f.thumbnail_url));
      const f = pref("preview") || pref("mockup") || files[0];
      return f?.preview_url || f?.url || f?.thumbnail_url || null;
    };
    if (variant?.imageSet?.length) {
      const primary = variant.imageSet.find(i => i.isPrimary) || variant.imageSet[0];
      if (primary?.url) return primary.url;
    }
    if (variant?.files?.length) {
      const f = tryFiles(variant.files); if (f) return f;
    }
    if (product?.images?.length) {
      const pimg = product.images.find(i => i.isPrimary) || product.images[0];
      if (pimg?.url) return pimg.url;
      if (typeof product.images[0] === "string") return product.images[0];
    }
    if (variant?.image) return variant.image;
    if (product?.image) return product.image;
    return PLACEHOLDER;
  }
  const mockupUrl = useMemo(
    () => pickMockupUrl(product, view, color),
    [product, view, color, slugParam]
  );

  // --- Fabric init on an overlay canvas that == print area ---
  useEffect(() => {
    if (!window.fabric || !canvasElRef.current) return;
    if (!fabricRef.current) {
      const fc = new window.fabric.Canvas(canvasElRef.current, {
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;
      const onChange = () => setHasObjects(fc.getObjects().length > 0);
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
    }
  }, []);

  // helpers
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON()));
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);
  const applyJSON = (json) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll());
  };
  const undo = () => {
    const fc = fabricRef.current; if (!fc || undoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON());
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };
  const redo = () => {
    const fc = fabricRef.current; if (!fc || redoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON());
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  // --- STAGE LAYOUT + CALIBRATION ---
  // We compute a centered stage width, and place:
  // - <img> mockup scaled to mockupHeightPct of stage height
  // - overlay <canvas> positioned/size to print area based on areaHeightPct+offsets
  const [stageW, setStageW] = useState(920); // px; will respond
  const [stageH, setStageH] = useState(920); // set to square-ish; we’ll set via container

  // read calibration profile
  const calibKey = norm(slugParam || product?.slug || product?.name || "");
  const calibBase = CALIBRATION[calibKey]?.["_all"] || { mockupHeightPct: 0.86, areaHeightPct: 0.46, offsetX: 0, offsetY: -6, mockupOpacity: 1 };
  const calibView = CALIBRATION[calibKey]?.[view] || {};
  const effectiveCalib = {
    mockupHeightPct: (mockupScalePct/100),                        // slider overrides base
    areaHeightPct: calibView.areaHeightPct ?? calibBase.areaHeightPct,
    offsetX: calibView.offsetX ?? calibBase.offsetX,
    offsetY: calibView.offsetY ?? calibBase.offsetY,
  };

  // compute rects
  const [canvasRect, setCanvasRect] = useState({ left: 0, top: 0, width: 400, height: 500 });

  const recomputeLayout = useCallback(() => {
    if (!stageRef.current) return;
    const wrapW = Math.min(1200, Math.max(760, stageRef.current.clientWidth)); // nice band
    const wrapH = wrapW * 1.15; // aspect for stage panel
    setStageW(wrapW);
    setStageH(wrapH);

    // mockup occupies mockupHeightPct of stageH (height-driven)
    const mockupH = wrapH * effectiveCalib.mockupHeightPct;

    // derive print area (height pct of mockup height)
    const areaH = mockupH * effectiveCalib.areaHeightPct;
    // real print area aspect from product type
    const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    const aspect = areaDef.widthInches / areaDef.heightInches;
    const areaW = areaH * aspect;

    // center mockup in stage
    const mockupTop = (wrapH - mockupH) / 2;
    const mockupLeft = (wrapW - (mockupH * 0.75)) / 2; // assume mockup aspect ~ 3:4; left bias for better centering

    // center area roughly on chest: horizontally center to stage, vertically a little above mockup center
    const areaLeft = (wrapW - areaW) / 2 + (effectiveCalib.offsetX || 0);
    const areaTop = mockupTop + (mockupH * 0.30) - (areaH/2) + (effectiveCalib.offsetY || 0);

    setCanvasRect({ left: Math.round(areaLeft), top: Math.round(areaTop), width: Math.round(areaW), height: Math.round(areaH) });

    // resize fabric canvas + keep contents proportional
    const fc = fabricRef.current;
    if (fc) {
      const prevW = fc.getWidth() || 1;
      const prevH = fc.getHeight() || 1;
      const sx = areaW / prevW;
      const sy = areaH / prevH;
      const scale = Math.min(sx, sy);

      // scale objects uniformly to preserve layout
      fc.getObjects().forEach(o => {
        o.scaleX *= scale;
        o.scaleY *= scale;
        o.left *= scale;
        o.top *= scale;
        o.setCoords();
      });
      fc.setWidth(areaW);
      fc.setHeight(areaH);
      fc.renderAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType, view, mockupScalePct, effectiveCalib.areaHeightPct, effectiveCalib.offsetX, effectiveCalib.offsetY]);

  useEffect(() => {
    recomputeLayout();
    const ro = new ResizeObserver(() => recomputeLayout());
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [recomputeLayout]);

  // design tools
  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim()) return toast({ title: "Enter text first", status: "info" });
    const t = new window.fabric.IText(textValue, {
      left: fc.getWidth()/2, top: fc.getHeight()/2, originX: "center", originY: "center",
      fill: textColor, fontSize: textSize
    });
    pushHistory();
    fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
    setTextValue("");
  };
  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(design.imageDataUrl, (img) => {
      img.set({ left: fc.getWidth()/2, top: fc.getHeight()/2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      setSelectedDesignId(design._id);
    });
  };
  const del = () => {
    const fc = fabricRef.current; if (!fc) return;
    const active = fc.getActiveObject(); if (!active) return;
    pushHistory();
    fc.remove(active); fc.discardActiveObject(); fc.requestRenderAll();
  };
  const centerH = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    o.left = fc.getWidth()/2; o.setCoords(); fc.requestRenderAll();
  };

  const setZoomSafe = (z) => { setZoom(Math.max(0.6, Math.min(2, z))); };

  // export (true print @ DPI)
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getObjects(); if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    const outW = Math.round(areaDef.widthInches * DPI);
    const outH = Math.round(areaDef.heightInches * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });

    // scale factor from on-screen canvas -> print canvas
    const scaleFactor = outW / fc.getWidth();

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      clone.left = o.left * scaleFactor;
      clone.top  = o.top  * scaleFactor;
      clone.scaleX = o.scaleX * scaleFactor;
      clone.scaleY = o.scaleY * scaleFactor;
      if (clone.type === "i-text") clone.fontSize = (o.fontSize || 36) * scaleFactor;
      tmp.add(clone);
    });
    tmp.requestRenderAll();

    const png = tmp.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    tmp.dispose();

    const previewPNG = fc.toDataURL({ format: "png", quality: 0.92 });

    toast({ title: "Uploading design…", status: "info", duration: 2500 });
    try {
      const upload = await client.post("/upload-print-file", {
        imageData: png,
        designName: `${product?.name || "Custom"} ${view}`,
      });
      const fileUrl = upload.data?.publicUrl;
      if (!fileUrl) throw new Error("Upload failed");

      const unitPrice = product?.priceMin || product?.basePrice || 0;
      const item = {
        productId: product?.id || product?._id || "",
        slug: product?.slug || slugParam,
        name: product?.name, color, size, view,
        preview: previewPNG,
        printFileUrl: fileUrl,
        productImage: mockupUrl,
        unitPrice,
      };
      localStorage.setItem("itemToCheckout", JSON.stringify(item));
      navigate("/checkout");
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", status: "error" });
    }
  };

  // colors & sizes
  const colors = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => v.color && set.add(v.color));
    (product?.colors || []).forEach(c => set.add(c));
    return [...set];
  }, [product]);
  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => { if (!color || v.color === color) v.size && set.add(v.size); });
    return [...set];
  }, [product, color]);

  const canProceed = product && (!colors.length || color) && (!sizes.length || size) && hasObjects;

  return (
    <Flex direction="row" minH="100vh" bg="brand.primary">
      {/* LEFT: toolbox */}
      <Box w={{ base: "280px" }} minW="260px" borderRightWidth="1px" borderColor="whiteAlpha.200" p={4} bg="brand.paper" overflowY="auto">
        {!product ? (
          <VStack p={6} spacing={3} align="stretch">
            <Skeleton height="28px" />
            <Skeleton height="200px" />
            <Skeleton height="28px" />
          </VStack>
        ) : (
          <VStack align="stretch" spacing={6}>
            <HStack justify="space-between">
              <HStack>
                <ProductTypeBadgeIcon type={productType} />
                <Heading size="md" color="brand.textLight" noOfLines={1}>{product.name}</Heading>
              </HStack>
              <Badge variant="outline" colorScheme="yellow" opacity={0.8}>{productType}</Badge>
            </HStack>

            <Tabs variant="enclosed" colorScheme="yellow" isFitted>
              <TabList>
                <Tab>Options</Tab>
                <Tab>Designs</Tab>
                <Tab>Text</Tab>
                <Tab>Calibrate</Tab>
              </TabList>
              <TabPanels>
                {/* Options */}
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={5}>
                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">View</Text>
                      <HStack wrap="wrap" spacing={2}>
                        {availableViews.map(v => (
                          <Button key={v} size="xs" variant={view===v?"solid":"outline"} onClick={() => setView(v)}>{v}</Button>
                        ))}
                      </HStack>
                    </Box>

                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">Color</Text>
                      <HStack wrap="wrap" spacing={2}>
                        {colors.length ? colors.map((c) => (
                          <Button key={c} size="xs" variant={color===c?"solid":"outline"} onClick={() => setColor(c)}>{c}</Button>
                        )) : <Badge>No color options</Badge>}
                      </HStack>
                    </Box>

                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">Size</Text>
                      <HStack wrap="wrap" spacing={2}>
                        {sizes.length ? sizes.map((s) => (
                          <Button key={s} size="xs" variant={size===s?"solid":"outline"} onClick={() => setSize(s)}>{s}</Button>
                        )) : <Badge>No size options</Badge>}
                      </HStack>
                    </Box>

                    <Divider borderColor="whiteAlpha.300" />

                    <VStack align="stretch" spacing={3}>
                      <Text color="brand.textLight" fontWeight="medium">Canvas zoom</Text>
                      <HStack>
                        <Tooltip label="Zoom out"><Button size="xs" onClick={() => setZoomSafe(zoom - 0.1)} leftIcon={<FaSearchMinus />}>Out</Button></Tooltip>
                        <Slider aria-label="zoom" value={zoom} min={0.6} max={2} step={0.1} onChange={setZoomSafe}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                        </Slider>
                        <Tooltip label="Zoom in"><Button size="xs" onClick={() => setZoomSafe(zoom + 0.1)} leftIcon={<FaSearchPlus />}>In</Button></Tooltip>
                      </HStack>

                      <HStack>
                        <Checkbox isChecked={showGrid} onChange={(e)=>setShowGrid(e.target.checked)} colorScheme="yellow">Grid</Checkbox>
                        <Checkbox isChecked={showRulers} onChange={(e)=>setShowRulers(e.target.checked)} colorScheme="yellow">Rulers</Checkbox>
                      </HStack>
                    </VStack>
                  </VStack>
                </TabPanel>

                {/* Designs */}
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={3}>
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
                            >
                              <AspectRatio ratio={1}>
                                <Image src={d.imageDataUrl} alt={d.prompt} objectFit="cover" />
                              </AspectRatio>
                            </Box>
                          </Tooltip>
                        ))}
                      </SimpleGrid>
                    ) : (
                      <Text color="brand.textLight" fontSize="sm">No saved designs yet. Create one in “Generate”.</Text>
                    )}
                  </VStack>
                </TabPanel>

                {/* Text */}
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={3}>
                    <Text color="brand.textLight" fontWeight="medium">Add Text</Text>
                    <HStack>
                      <Input value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Your text" />
                      <Button onClick={addText}>Add</Button>
                    </HStack>
                    <HStack mt={2} spacing={3}>
                      <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} w="52px" p={0} />
                      <NumberInput value={textSize} min={8} max={200} onChange={(v) => setTextSize(parseInt(v || "36", 10))}>
                        <NumberInputField />
                        <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                      </NumberInput>
                    </HStack>
                  </VStack>
                </TabPanel>

                {/* Calibrate */}
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={4}>
                    <Text color="brand.textLight" fontWeight="medium">Mockup opacity</Text>
                    <Slider value={mockupOpacity} min={0.2} max={1} step={0.05} onChange={setMockupOpacity}>
                      <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                    </Slider>

                    <Text color="brand.textLight" fontWeight="medium">Mockup scale (height)</Text>
                    <Slider value={mockupScalePct} min={60} max={98} step={1} onChange={setMockupScalePct}>
                      <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                    </Slider>

                    <Text color="brand.textLight" fontWeight="medium">Chest offset X</Text>
                    <Slider value={effectiveCalib.offsetX} min={-60} max={60} step={1} onChange={(v)=>{ CALIBRATION[calibKey] = CALIBRATION[calibKey] || {_all:{}}; (CALIBRATION[calibKey][view]=CALIBRATION[calibKey][view]||{}).offsetX=v; recomputeLayout(); }}>
                      <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                    </Slider>

                    <Text color="brand.textLight" fontWeight="medium">Chest offset Y</Text>
                    <Slider value={effectiveCalib.offsetY} min={-80} max={80} step={1} onChange={(v)=>{ CALIBRATION[calibKey] = CALIBRATION[calibKey] || {_all:{}}; (CALIBRATION[calibKey][view]=CALIBRATION[calibKey][view]||{}).offsetY=v; recomputeLayout(); }}>
                      <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                    </Slider>

                    <Text fontSize="xs" color="whiteAlpha.600">
                      Tip: You can commit these calibration values into <code>mockupsMeta.js</code> once they feel right.
                    </Text>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <Divider borderColor="whiteAlpha.300" />
            <VStack spacing={3}>
              <Button
                colorScheme={canProceed ? "purple" : "gray"}
                isDisabled={!canProceed}
                onClick={makePrintReadyAndUpload}
                width="full"
              >
                Add to cart / Checkout
              </Button>
              <Text fontSize="xs" color="whiteAlpha.700" textAlign="center">
                We export a true print file at {DPI} DPI for the current placement.
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>

      {/* CENTER: stage */}
      <Flex ref={stageRef} flex="1" p={6} justify="center" overflowY="auto">
        <Box
          position="relative"
          w="100%"
          maxW="1100px"
          minW="760px"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          rounded="md"
          bg="brand.secondary"
          px={4}
          py={6}
        >
          <HStack mb={3} color="brand.textLight" justify="space-between">
            <HStack>
              <Tooltip label="Undo"><Button size="sm" onClick={undo} leftIcon={<FaUndo />}>Undo</Button></Tooltip>
              <Tooltip label="Redo"><Button size="sm" onClick={redo} leftIcon={<FaRedo />}>Redo</Button></Tooltip>
            </HStack>
            <HStack>
              <Tooltip label="Delete selected"><Button size="sm" onClick={del} colorScheme="red" variant="outline"><FaTrash /></Button></Tooltip>
              <Tooltip label="Center horizontally"><Button size="sm" onClick={centerH} variant="outline"><FaArrowsAltH /></Button></Tooltip>
            </HStack>
          </HStack>

          {/* mockup image (pure HTML) */}
          <Box position="relative" w={`${stageW}px`} h={`${stageH}px`} m="0 auto" overflow="hidden">
            <Image
              ref={mockupRef}
              src={mockupUrl}
              alt="mockup"
              draggable={false}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                height: `${effectiveCalib.mockupHeightPct * 100}%`,
                opacity: mockupOpacity,
                userSelect: "none",
                pointerEvents: "none",
                objectFit: "contain",
              }}
            />

            {/* rulers */}
            {showRulers && (
              <>
                <Box position="absolute" left="0" top="0" right="0" h="24px" bg="blackAlpha.300" />
                <Box position="absolute" top="0" bottom="0" w="24px" left="0" bg="blackAlpha.300" />
              </>
            )}

            {/* grid */}
            {showGrid && (
              <Box
                position="absolute" inset="0"
                style={{
                  backgroundImage: `linear-gradient(0deg, rgba(255,255,255,.07) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                }}
                pointerEvents="none"
              />
            )}

            {/* DESIGN CANVAS (equals print area) */}
            <Box
              position="absolute"
              left={`${canvasRect.left}px`}
              top={`${canvasRect.top}px`}
              width={`${canvasRect.width}px`}
              height={`${canvasRect.height}px`}
              transform={`scale(${zoom})`}
              transformOrigin="top left"
              border="1px dashed rgba(255,255,255,.6)"
              rounded="sm"
              bg="transparent"
            >
              <canvas ref={canvasElRef} style={{ width: "100%", height: "100%" }} />
            </Box>
          </Box>
        </Box>
      </Flex>

      {/* RIGHT: layers (simple) */}
      <Box w={{ base: "260px" }} minW="240px" borderLeftWidth="1px" borderColor="whiteAlpha.200" p={4} bg="brand.paper" display={{ base: "none", xl: "block" }}>
        <Heading size="sm" color="brand.textLight" mb={4}>Layers</Heading>
        <Text fontSize="sm" color="whiteAlpha.700">Use the canvas to select & rearrange. (Advanced layer controls coming soon.)</Text>
      </Box>
    </Flex>
  );
}
