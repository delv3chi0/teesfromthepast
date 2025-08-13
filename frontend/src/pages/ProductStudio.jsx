// frontend/src/pages/ProductStudio.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid, AspectRatio, Image,
  Tooltip, useToast, Skeleton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Input, Divider, Badge, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, Tabs, TabList, TabPanels, Tab, TabPanel,
  Checkbox
} from "@chakra-ui/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus,
  FaTshirt, FaHatCowboy, FaHockeyPuck, FaChevronUp, FaChevronDown, FaEye, FaEyeSlash
} from "react-icons/fa";
import { client } from "../api/client";
import MOCKUPS from "../data/mockups.js"; // default export map (keep your generator producing this)

const DPI = 300;
const PREVIEW_ASPECT = 2 / 3;
const PLACEHOLDER = "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

/**
 * Print area *size* in inches per type/view (industry-typical safe areas).
 */
const PRINT_AREAS = {
  tshirt: { front: { w: 12, h: 16 }, back: { w: 12, h: 16 }, sleeve: { w: 4, h: 3.5 } },
  hoodie: { front: { w: 13, h: 13 }, back: { w: 12, h: 16 } },
  tote:   { front: { w: 14, h: 16 }, back: { w: 14, h: 16 } },
  hat:    { front: { w: 4,  h: 1.75 } },
  beanie: { front: { w: 5,  h: 1.75 } },
};

/**
 * On-canvas *position* of the print area as a fraction of the canvas (not the photo),
 * tuned per product type/view. This keeps the dashed rectangle in a realistic spot.
 * (You can tweak these to taste.)
 */
const PRINT_POS = {
  tshirt: {
    front: { cx: 0.5, cy: 0.38 }, // center chest
    back:  { cx: 0.5, cy: 0.40 },
    sleeve:{ cx: 0.80, cy: 0.40 },
  },
  hoodie: {
    front: { cx: 0.5, cy: 0.38 },
    back:  { cx: 0.5, cy: 0.40 },
  },
  tote: {
    front: { cx: 0.5, cy: 0.45 },
    back:  { cx: 0.5, cy: 0.45 },
  },
  hat: {
    front: { cx: 0.5, cy: 0.42 },
  },
  beanie: {
    front: { cx: 0.5, cy: 0.42 },
  },
};

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "sleeve"],
  hoodie: ["front", "back"],
  tote:   ["front", "back"],
  hat:    ["front"],
  beanie: ["front"],
};

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

// normalize helpers for mockups map
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug  = (p) => norm(p?.slug || p?.name || "");

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

  // Layers state (excluding the printArea):
  const [layers, setLayers] = useState([]);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // fetch product
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (!cancelled) {
          const p = res.data;
          setProduct(p);

          // default color / size
          if (!colorParam) {
            const colorSet = new Set();
            (p?.variants || []).forEach(v => v.color && colorSet.add(v.color));
            (p?.colors || []).forEach(c => colorSet.add(c));
            const first = [...colorSet][0];
            if (first) setColor(first);
          }
          if (!sizeParam) {
            const sizeSet = new Set();
            (p?.variants || []).forEach(v => v.size && sizeSet.add(v.size));
            const firstS = [...sizeSet][0];
            if (firstS) setSize(firstS);
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
  }, [slugParam]);

  // my designs
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

  // fabric init
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    if (!fabricRef.current) {
      const parentW = wrapRef.current.clientWidth;
      const parentH = parentW / PREVIEW_ASPECT;
      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: parentW, height: parentH, preserveObjectStacking: true, selection: true,
      });
      fabricRef.current = fc;

      const onChange = () => {
        const objs = fc.getObjects().filter(o => o.id !== "printArea");
        setHasObjects(objs.length > 0);

        // update layers (top-most last)
        setLayers(
          objs.map((o, idx) => ({
            id: o.__uid || idx,
            type: o.type === "i-text" ? "Text" : "Image",
            visible: o.visible !== false,
            ref: o,
          }))
        );
      };
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
      fc.on("selection:created", onChange);
      fc.on("selection:updated", onChange);
      fc.on("selection:cleared", onChange);
    }

    const ro = new ResizeObserver(() => {
      if (!fabricRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = w / PREVIEW_ASPECT;
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      fabricRef.current.requestRenderAll();
      // refresh background to keep proportions after resize
      if (product) refreshBackground();
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const pushHistory = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id"])));
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);

  const applyJSON = (json) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll(), (_o, obj) => obj);
  };

  const undo = () => {
    const fc = fabricRef.current; if (!fc || undoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };
  const redo = () => {
    const fc = fabricRef.current; if (!fc || redoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  // --- MOCKUP PICKER ---
  function pickMockupUrl(product, view, color) {
    const slugKey = normSlug(product) || norm(slugParam);
    const colorKey = normColor(color);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[view];
    if (bySlug) return bySlug;

    // Variant/product fallbacks
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
      const f = tryFiles(variant.files);
      if (f) return f;
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

  // Helper: (w,h) for print area in px on the screen (proportional to canvas)
  const getPrintAreaScreenSize = (fc) => {
    const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    // scale a bit relative to canvas width — this maintains pleasing proportions on screen
    // We *display* area using this, but export always uses true DPI below.
    const displayWidth = fc.width * 0.46; // fraction of canvas width
    const aspect = areaDef.h / areaDef.w;
    return { w: displayWidth, h: displayWidth * aspect };
  };

  // Position (cx, cy) as canvas fractions
  const getPrintAreaCenter = (fc) => {
    const pos = PRINT_POS[productType]?.[view] || { cx: 0.5, cy: 0.40 };
    return { x: fc.width * pos.cx, y: fc.height * pos.cy };
  };

  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    const userObjects = fc.getObjects().filter(o => o.id !== "printArea");
    fc.clear();
    userObjects.forEach(o => fc.add(o));

    const mockupUrl = pickMockupUrl(product, view, color) || PLACEHOLDER;

    window.fabric.Image.fromURL(mockupUrl, (img) => {
      const scale = Math.min(fc.width / img.width, fc.height / img.height);
      fc.setBackgroundImage(img, fc.renderAll.bind(fc), {
        scaleX: scale, scaleY: scale, top: fc.height / 2, left: fc.width / 2,
        originX: "center", originY: "center", selectable: false, evented: false,
      });

      // Create print area rectangle in the correct spot & size for screen
      const { w, h } = getPrintAreaScreenSize(fc);
      const { x, y } = getPrintAreaCenter(fc);

      const rect = new window.fabric.Rect({
        id: "printArea",
        left: x, top: y,
        originX: "center", originY: "center",
        width: w, height: h,
        fill: "", stroke: "white", strokeDashArray: [6, 6], strokeWidth: 2,
        selectable: false, evented: false, lockMovementX: true, lockMovementY: true,
        hasControls: false, excludeFromExport: true,
      });
      fc.add(rect);
      fc.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  }, [product, view, color, productType, slugParam]);

  useEffect(() => { if (product && fabricRef.current) refreshBackground(); }, [product, refreshBackground, view, color]);

  // constrain objects to print area
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const constrain = () => {
      const area = fc.getObjects().find(o => o.id === "printArea");
      if (!area) return;
      const objs = fc.getObjects().filter(o => o.id !== "printArea");
      const a = area.getBoundingRect(true, true);
      objs.forEach(o => {
        const bb = o.getBoundingRect(true, true);
        if (bb.left < a.left) o.left += (a.left - bb.left);
        if (bb.top < a.top) o.top += (a.top - bb.top);
        if (bb.left + bb.width > a.left + a.width) o.left -= (bb.left + bb.width - (a.left + a.width));
        if (bb.top + bb.height > a.top + a.height) o.top -= (bb.top + bb.height - (a.top + a.height));
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
    const { x, y } = getPrintAreaCenter(fc);
    const t = new window.fabric.IText(textValue, {
      left: x, top: y, originX: "center", originY: "center",
      fill: textColor, fontSize: textSize
    });
    pushHistory();
    fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
    setTextValue("");
  };

  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    const { x, y } = getPrintAreaCenter(fc);
    window.fabric.Image.fromURL(design.imageDataUrl, (img) => {
      img.set({
        left: x, top: y, originX: "center", originY: "center",
        scaleX: 0.6, scaleY: 0.6
      });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      setSelectedDesignId(design._id);
    }, { crossOrigin: "anonymous" });
  };

  const del = () => {
    const fc = fabricRef.current; if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea") return;
    pushHistory();
    fc.remove(active);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };
  const centerH = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea") return;
    const area = fc.getObjects().find(ob => ob.id === "printArea");
    if (!area) return;
    const a = area.getBoundingRect(true, true);
    o.set({ left: a.left + a.width / 2, originX: "center" });
    o.setCoords();
    fc.requestRenderAll();
  };
  const setZoomSafe = (z) => {
    const fc = fabricRef.current; if (!fc) return;
    const clamped = Math.max(0.8, Math.min(1.8, z));
    setZoom(clamped);
    fc.setZoom(clamped);
    fc.requestRenderAll();
  };

  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;

    const area = fc.getObjects().find(o => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter(o => o.id !== "printArea");
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    const outW = Math.round(areaDef.w * DPI);
    const outH = Math.round(areaDef.h * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);
    const scaleFactor = outW / aBB.width;

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top  - aBB.top  + bb.height / 2;

      clone.originX = "center"; clone.originY = "center";
      clone.left = relX * scaleFactor; clone.top = relY * scaleFactor;
      clone.scaleX = (o.scaleX || 1) * scaleFactor; clone.scaleY = (o.scaleY || 1) * scaleFactor;
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

  // ---- Layers handlers ----
  const refreshLayers = () => {
    const fc = fabricRef.current; if (!fc) return;
    const objs = fc.getObjects().filter(o => o.id !== "printArea");
    setLayers(
      objs.map((o, idx) => ({
        id: o.__uid || idx,
        type: o.type === "i-text" ? "Text" : "Image",
        visible: o.visible !== false,
        ref: o,
      }))
    );
  };

  const toggleVisible = (layer) => {
    const fc = fabricRef.current; if (!fc) return;
    layer.ref.visible = !layer.ref.visible;
    layer.ref.dirty = true;
    fc.requestRenderAll();
    refreshLayers();
  };

  const selectLayer = (layer) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.setActiveObject(layer.ref);
    fc.requestRenderAll();
  };

  const bringForward = (layer) => {
    const fc = fabricRef.current; if (!fc) return;
    try { fc.bringForward(layer.ref); } catch {}
    fc.requestRenderAll();
    refreshLayers();
  };

  const sendBackward = (layer) => {
    const fc = fabricRef.current; if (!fc) return;
    try { fc.sendBackwards(layer.ref); } catch {}
    fc.requestRenderAll();
    refreshLayers();
  };

  // ---------------- UI ----------------
  return (
    <Flex direction={{ base: "column", xl: "row" }} minH="100vh" bg="brand.primary" px={{ base: 2, md: 6 }} py={4} gap={4}>
      {/* Left rail */}
      <Box w={{ base: "100%", xl: "320px" }} flexShrink={0} borderRightWidth={{ xl: "1px" }} borderColor="whiteAlpha.200" p={4} bg="brand.paper" rounded="lg">
        {!product ? (
          <VStack p={2} spacing={3} align="stretch">
            <Skeleton height="24px" />
            <Skeleton height="200px" />
            <Skeleton height="24px" />
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

            <Tabs variant="enclosed" colorScheme="yellow" isLazy>
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
                        <Tooltip label="Zoom out">
                          <Button size="xs" onClick={() => setZoomSafe(zoom - 0.1)} leftIcon={<FaSearchMinus />}>Out</Button>
                        </Tooltip>
                        <Slider aria-label="zoom" value={zoom} min={0.8} max={1.8} step={0.1} onChange={setZoomSafe}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack>
                          <SliderThumb />
                        </Slider>
                        <Tooltip label="Zoom in">
                          <Button size="xs" onClick={() => setZoomSafe(zoom + 0.1)} leftIcon={<FaSearchPlus />}>In</Button>
                        </Tooltip>
                      </HStack>
                    </VStack>

                    <VStack align="stretch" spacing={2}>
                      <Checkbox defaultChecked isDisabled color="whiteAlpha.700">Grid</Checkbox>
                      <Checkbox defaultChecked isDisabled color="whiteAlpha.700">Rulers</Checkbox>
                    </VStack>

                    <VStack pt={2} align="stretch" spacing={3}>
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
                      <Text color="brand.textLight" fontSize="sm">No saved designs yet. Create one in “Create”.</Text>
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
          </VStack>
        )}
      </Box>

      {/* Center: Canvas */}
      <Flex flex="1" direction="column" minW={0} >
        <HStack mb={2} color="brand.textLight" justify="space-between">
          <HStack>
            <Tooltip label="Undo"><Button size="sm" onClick={undo} leftIcon={<FaUndo />}>Undo</Button></Tooltip>
            <Tooltip label="Redo"><Button size="sm" onClick={redo} leftIcon={<FaRedo />}>Redo</Button></Tooltip>
          </HStack>
          <HStack>
            <Tooltip label="Delete selected"><Button size="sm" onClick={del} colorScheme="red" variant="outline"><FaTrash /></Button></Tooltip>
            <Tooltip label="Center horizontally within print area"><Button size="sm" onClick={centerH} variant="outline"><FaArrowsAltH /></Button></Tooltip>
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

      {/* Right rail: Layers */}
      <Box w={{ base: "100%", xl: "260px" }} flexShrink={0} p={4} bg="brand.paper" rounded="lg" borderLeftWidth={{ xl: "1px" }} borderColor="whiteAlpha.200">
        <Heading size="sm" color="brand.textLight" mb={3}>LAYERS</Heading>
        <Text fontSize="xs" color="whiteAlpha.700" mb={3}>
          Click a layer to select on canvas. Toggle visibility or adjust z-order.
        </Text>

        <VStack align="stretch" spacing={2}>
          {layers.length === 0 ? (
            <Text fontSize="sm" color="whiteAlpha.700">No layers yet. Add an image or text.</Text>
          ) : layers.map((layer, i) => (
            <HStack
              key={layer.id}
              p={2}
              rounded="md"
              bg="rgba(255,255,255,0.04)"
              _hover={{ bg: "rgba(255,255,255,0.07)", cursor: "pointer" }}
              onClick={() => selectLayer(layer)}
              justify="space-between"
            >
              <HStack>
                <Badge colorScheme={layer.type === "Text" ? "purple" : "teal"}>{layer.type}</Badge>
              </HStack>
              <HStack>
                <Tooltip label={layer.visible ? "Hide" : "Show"}>
                  <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleVisible(layer); }}>
                    {layer.visible ? <FaEye /> : <FaEyeSlash />}
                  </Button>
                </Tooltip>
                <Tooltip label="Bring forward">
                  <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); bringForward(layer); }}>
                    <FaChevronUp />
                  </Button>
                </Tooltip>
                <Tooltip label="Send backward">
                  <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); sendBackward(layer); }}>
                    <FaChevronDown />
                  </Button>
                </Tooltip>
              </HStack>
            </HStack>
          ))}
        </VStack>
      </Box>
    </Flex>
  );
}
