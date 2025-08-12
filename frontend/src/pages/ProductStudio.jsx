// frontend/src/pages/ProductStudio.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid, AspectRatio, Image,
  Tooltip, useToast, Skeleton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Input, Divider, Badge, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, Tabs, TabList, TabPanels, Tab, TabPanel, Select
} from "@chakra-ui/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus, FaTshirt, FaHatCowboy, FaHockeyPuck } from "react-icons/fa";
import { client } from "../api/client";

// Works whether src/data/mockups.js exports default or named { MOCKUPS }
import * as MOCKUPS_NS from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_NS.default || MOCKUPS_NS.MOCKUPS || {});

const DPI = 300;
const PREVIEW_ASPECT = 2 / 3;
const PLACEHOLDER = "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

const PRINT_AREAS = {
  tshirt: { front: { widthInches: 12, heightInches: 16 }, back: { widthInches: 12, heightInches: 16 }, sleeve: { widthInches: 4, heightInches: 3.5 } },
  hoodie: { front: { widthInches: 13, heightInches: 13 }, back: { widthInches: 12, heightInches: 16 } },
  tote:   { front: { widthInches: 14, heightInches: 16 }, back:  { widthInches: 14, heightInches: 16 } },
  hat:    { front: { widthInches: 4,  heightInches: 1.75 } },
  beanie: { front: { widthInches: 5,  heightInches: 1.75 } },
};

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "sleeve"],
  hoodie: ["front", "back"],
  tote:   ["front", "back"],
  hat:    ["front"],
  beanie: ["front"],
};

function detectProductType(product) {
  const raw = product?.type || product?.category || product?.product_type || product?.productType || "";
  const text = `${raw} ${product?.name || ""}`.toLowerCase();
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

// --- Cloudinary mockup resolution helpers ---
const aliasProductSlug = (nameOrSlug = "") => {
  const s = String(nameOrSlug).toLowerCase();
  if (s.includes("classic tee")) return "classic-tee";
  if (s.includes("gildan 5000")) return "classic-tee";
  // add more aliases as you add products
  return s.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

const normalizeColor = (color = "") => {
  const c = String(color).toLowerCase().trim();
  // quick canonical mappings for your uploaded set
  const map = {
    "brown savana": "brown-savana",
    "brown savanna": "brown-savana",
    "forest green": "forest-green",
    "military green": "military-green",
    "tropical blue": "tropical-blue",
    "royal blue": "royal",
  };
  return (map[c] || c).replace(/\s+/g, "-");
};

function cloudinaryMock(product, view, color) {
  const preferredKey = (product?.slug && String(product.slug)) || "";
  const nameFallback = aliasProductSlug(product?.name);
  const keyCandidates = [preferredKey, nameFallback].filter(Boolean).map(s => s.toLowerCase());

  const v = String(view || "front").toLowerCase();
  const colorKey = normalizeColor(color);

  for (const key of keyCandidates) {
    const url = MOCKUPS?.[key]?.[colorKey]?.[v];
    if (url) return url;
  }

  // one-time useful debug
  if (keyCandidates.length && colorKey) {
    console.debug("[Mockup] No Cloudinary match", {
      keysTried: keyCandidates,
      colorKey,
      view: v,
      haveForKey: keyCandidates.map(k => Object.keys(MOCKUPS?.[k] || {})),
    });
  }
  return null;
}

function fallbackMock(product, color) {
  const variants = product?.variants || [];
  const variant = variants.find((v) => v.color === color) || variants[0];
  const tryFiles = (files = []) => {
    const pref = (t) => files.find((f) => f?.type === t && (f.preview_url || f.url || f.thumbnail_url));
    const f = pref("preview") || pref("mockup") || files[0];
    return f?.preview_url || f?.url || f?.thumbnail_url || null;
  };
  if (variant?.imageSet?.length) {
    const primary = variant.imageSet.find((i) => i.isPrimary) || variant.imageSet[0];
    if (primary?.url) return primary.url;
  }
  if (variant?.files?.length) {
    const f = tryFiles(variant.files);
    if (f) return f;
  }
  if (product?.images?.length) {
    const pimg = product.images.find((i) => i.isPrimary) || product.images[0];
    if (pimg?.url) return pimg.url;
    if (typeof product.images[0] === "string") return product.images[0];
  }
  if (variant?.image) return variant.image;
  if (product?.image) return product.image;
  return null;
}

function pickMockupUrl(product, view, color) {
  return cloudinaryMock(product, view, color) || fallbackMock(product, color) || PLACEHOLDER;
}

export default function ProductStudio() {
  const toast = useToast();
  const navigate = useNavigate();
  const params = useParams();
  const query = useQuery();

  const slugViaParam = params.slug || "";
  const slugViaQuery = query.get("slug") || "";
  const slug = slugViaParam || slugViaQuery;

  const [product, setProduct] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const productType = useMemo(() => detectProductType(product), [product]);
  const availableViews = useMemo(() => VIEWS_BY_TYPE[productType] || ["front"], [productType]);

  const [view, setView] = useState("front");
  const [color, setColor] = useState(query.get("color") || "");
  const [size, setSize] = useState(query.get("size") || "");

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const fabricRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);

  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // catalog for picker (when no slug)
  useEffect(() => {
    let stop = false;
    if (slug) return;
    (async () => {
      try {
        setLoadingCatalog(true);
        const res = await client.get("/storefront/shop-data");
        if (!stop) setCatalog(res.data?.products || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!stop) setLoadingCatalog(false);
      }
    })();
    return () => { stop = true; };
  }, [slug]);

  // load product by slug
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slug) { setProduct(null); return; }
        const res = await client.get(`/storefront/product/${slug}`);
        if (!cancelled) {
          const p = res.data;
          setProduct(p);

          const colorsSet = new Set();
          (p?.variants || []).forEach((v) => v.color && colorsSet.add(v.color));
          (p?.colors || []).forEach((c) => colorsSet.add(c));
          if (!color) {
            const firstColor = Array.from(colorsSet)[0];
            if (firstColor) setColor(firstColor);
          }

          const sizesSet = new Set();
          (p?.variants || []).forEach((v) => {
            if (!color || v.color === color) v.size && sizesSet.add(v.size);
          });
          if (!size) {
            const firstSize = Array.from(sizesSet)[0];
            if (firstSize) setSize(firstSize);
          }

          if (!availableViews.includes(view)) setView(availableViews[0]);
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Could not load product", status: "error" });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // load my designs
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

  // init fabric + resize
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    if (!fabricRef.current) {
      const parentW = wrapRef.current.clientWidth;
      const parentH = parentW / PREVIEW_ASPECT;
      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: parentW,
        height: parentH,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      const onChange = () =>
        setHasObjects(fc.getObjects().filter((o) => o.id !== "printArea").length > 0);
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
    }

    const ro = new ResizeObserver(() => {
      if (!fabricRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = w / PREVIEW_ASPECT;
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      fabricRef.current.requestRenderAll();
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

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
    fc.loadFromJSON(json, () => fc.renderAll(), (_o, obj) => obj);
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

  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !product) return;

    const userObjects = fc.getObjects().filter((o) => o.id !== "printArea");
    fc.clear();
    userObjects.forEach((o) => fc.add(o));

    const mockupUrl = pickMockupUrl(product, view, color) || PLACEHOLDER;

    window.fabric.Image.fromURL(
      mockupUrl,
      (img) => {
        const scale = Math.min(fc.width / img.width, fc.height / img.height);
        fc.setBackgroundImage(img, fc.renderAll.bind(fc), {
          scaleX: scale,
          scaleY: scale,
          top: fc.height / 2,
          left: fc.width / 2,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });

        const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
        const pxW = areaDef.widthInches * DPI * (scale / 3);
        const pxH = areaDef.heightInches * DPI * (scale / 3);

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
  }, [product, view, color, productType]);

  useEffect(() => { refreshBackground(); }, [refreshBackground]);

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const constrain = () => {
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const objs = fc.getObjects().filter((o) => o.id !== "printArea");
      const a = area.getBoundingRect(true, true);
      objs.forEach((o) => {
        const bb = o.getBoundingRect(true, true);
        if (bb.left < a.left) o.left += a.left - bb.left;
        if (bb.top < a.top) o.top += a.top - bb.top;
        if (bb.left + bb.width > a.left + a.width)
          o.left -= bb.left + bb.width - (a.left + a.width);
        if (bb.top + bb.height > a.top + a.height)
          o.top -= bb.top + bb.height - (a.top + a.height);
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
  }, [view, productType]);

  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim()) return toast({ title: "Enter text first", status: "info" });
    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center",
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
      img.set({
        left: fc.width / 2, top: fc.height / 2,
        originX: "center", originY: "center",
        scaleX: 0.5, scaleY: 0.5
      });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      setSelectedDesignId(design._id);
    }, { crossOrigin: "anonymous" });
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

  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;

    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter((o) => o.id !== "printArea");
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    const outW = Math.round(areaDef.widthInches * DPI);
    const outH = Math.round(areaDef.heightInches * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);
    const scaleFactor = outW / aBB.width;

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top - aBB.top + bb.height / 2;

      clone.originX = "center"; clone.originY = "center";
      clone.left = relX * scaleFactor; clone.top = relY * scaleFactor;
      clone.scaleX = o.scaleX * scaleFactor; clone.scaleY = o.scaleY * scaleFactor;
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
        slug: product?.slug || "",
        name: product?.name,
        color,
        size,
        view,
        preview: previewPNG,
        printFileUrl: fileUrl,
        productImage: pickMockupUrl(product, view, color),
        unitPrice,
      };
      localStorage.setItem("itemToCheckout", JSON.stringify(item));
      navigate("/checkout");
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", status: "error" });
    }
  };

  const colors = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(v.color));
    (product?.colors || []).forEach((c) => set.add(c));
    return Array.from(set);
  }, [product]);

  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => {
      if (!color || v.color === color) v.size && set.add(v.size);
    });
    return Array.from(set);
  }, [product, color]);

  const canProceed = product && (!colors.length || color) && (!sizes.length || size) && hasObjects;

  const ProductTypeIcon =
    productType === "tshirt" ? FaTshirt :
    productType === "hoodie" ? FaTshirt :
    productType === "hat"    ? FaHatCowboy :
    productType === "beanie" ? FaHockeyPuck : FaTshirt;

  if (!slug) {
    return (
      <Flex direction="column" minH="70vh" p={6} bg="brand.primary">
        <Heading size="lg" color="brand.textLight" mb={4}>Choose a product to customize</Heading>
        {loadingCatalog ? (
          <Skeleton height="36px" />
        ) : (
          <HStack maxW="lg" align="center">
            <Select
              placeholder="Select a product"
              onChange={(e) => {
                const chosen = e.target.value;
                if (chosen) navigate(`/product-studio/${encodeURIComponent(chosen)}`);
              }}
            >
              {(catalog || []).map((p) => (
                <option key={p.slug || p.name} value={p.slug || p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
          </HStack>
        )}
      </Flex>
    );
  }

  return (
    <Flex direction={{ base: "column", xl: "row" }} minH="100vh" bg="brand.primary">
      <Box w={{ base: "100%", xl: "34%" }} borderRightWidth={{ xl: "1px" }} borderColor="whiteAlpha.200" p={4} bg="brand.paper">
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
                <Icon as={ProductTypeIcon} color="brand.accentYellow" />
                <Heading size="lg" color="brand.textLight">{product.name}</Heading>
              </HStack>
              <Badge variant="outline" colorScheme="yellow" opacity={0.8}>{productType}</Badge>
            </HStack>

            <Tabs variant="enclosed" colorScheme="yellow">
              <TabList>
                <Tab>Options</Tab>
                <Tab>Designs</Tab>
                <Tab>Text</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={5}>
                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">View</Text>
                      <HStack wrap="wrap" spacing={2}>
                        {availableViews.map((v) => (
                          <Button key={v} size="sm" variant={view===v?"solid":"outline"} onClick={() => setView(v)}>{v}</Button>
                        ))}
                      </HStack>
                    </Box>

                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">Color</Text>
                      <HStack wrap="wrap" spacing={2}>
                        {colors.length ? colors.map((c) => (
                          <Button key={c} size="sm" variant={color===c?"solid":"outline"} onClick={() => setColor(c)}>{c}</Button>
                        )) : <Badge>No color options</Badge>}
                      </HStack>
                    </Box>

                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">Size</Text>
                      <HStack wrap="wrap" spacing={2}>
                        {sizes.length ? sizes.map((s) => (
                          <Button key={s} size="sm" variant={size===s?"solid":"outline"} onClick={() => setSize(s)}>{s}</Button>
                        )) : <Badge>No size options</Badge>}
                      </HStack>
                    </Box>

                    <Divider borderColor="whiteAlpha.300" />

                    <VStack align="stretch" spacing={3}>
                      <Text color="brand.textLight" fontWeight="medium">Zoom</Text>
                      <HStack>
                        <Tooltip label="Zoom out">
                          <Button size="sm" onClick={() => setZoomSafe(zoom - 0.1)} leftIcon={<FaSearchMinus />}>Out</Button>
                        </Tooltip>
                        <Slider aria-label="zoom" value={zoom} min={0.5} max={2} step={0.1} onChange={setZoomSafe}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack>
                          <SliderThumb />
                        </Slider>
                        <Tooltip label="Zoom in">
                          <Button size="sm" onClick={() => setZoomSafe(zoom + 0.1)} leftIcon={<FaSearchPlus />}>In</Button>
                        </Tooltip>
                      </HStack>
                    </VStack>
                  </VStack>
                </TabPanel>

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
                We’ll generate a high-res PNG ({DPI} DPI) sized to the selected placement.
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>

      <Flex flex="1" direction="column" p={4}>
        <HStack mb={2} color="brand.textLight" justify="space-between">
          <HStack>
            <Tooltip label="Undo"><Button size="sm" onClick={undo} leftIcon={<FaUndo />}>Undo</Button></Tooltip>
            <Tooltip label="Redo"><Button size="sm" onClick={redo} leftIcon={<FaRedo />}>Redo</Button></Tooltip>
          </HStack>
          <HStack>
            <Tooltip label="Delete selected">
              <Button size="sm" onClick={del} colorScheme="red" variant="outline"><FaTrash /></Button>
            </Tooltip>
            <Tooltip label="Center horizontally">
              <Button size="sm" onClick={centerH} variant="outline"><FaArrowsAltH /></Button>
            </Tooltip>
          </HStack>
        </HStack>

        <Box
          ref={wrapRef}
          w="100%"
          paddingTop={`${100 / PREVIEW_ASPECT}%`}
          bg="brand.secondary"
          rounded="md"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          position="relative"
          overflow="hidden"
        >
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
        </Box>
      </Flex>
    </Flex>
  );
}
