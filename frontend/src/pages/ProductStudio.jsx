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
  FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus, FaTshirt,
  FaHatCowboy, FaHockeyPuck, FaUpload, FaLayerGroup, FaArrowUp, FaArrowDown, FaCrosshairs
} from "react-icons/fa";
import { client } from "../api/client";
import MOCKUPS from "../data/mockups.js";
import { CALIBRATION } from "../data/mockupsMeta.js";

/** --------------------------------
 * Sizing model (key improvements)
 * ---------------------------------
 * - Canvas keeps a fixed aspect (2:3) but grows to fill center space.
 * - Mockup is scaled so its *displayed height* = mockupHeightPct * canvasHeight (default 0.86).
 * - Print area height = areaHeightPct * canvasHeight (default 0.46) and width uses real print aspect (inches).
 * - Per-product/view overrides come from CALIBRATION[slug][view].
 */

const DPI = 300;
const PREVIEW_ASPECT = 2 / 3;
const PLACEHOLDER = "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

const PRINT_AREAS = {
  tshirt: { front: { widthInches: 12, heightInches: 16 }, back: { widthInches: 12, heightInches: 16 }, sleeve: { widthInches: 4, heightInches: 3.5 } },
  hoodie: { front: { widthInches: 13, heightInches: 13 }, back: { widthInches: 12, heightInches: 16 } },
  tote:   { front: { widthInches: 14, heightInches: 16 }, back: { widthInches: 14, heightInches: 16 } },
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

// Default visual targets (overridable via CALIBRATION)
const DEFAULT_VIZ = {
  mockupHeightPct: 0.86, // mockup fills ~86% of canvas height
  areaHeightPct:   0.46, // print area ~46% of canvas height for tees
  offsetX: 0,
  offsetY: 0,
  mockupOpacity: 1,
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

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug  = (p) => norm(p?.slug || p?.name || "");

// Small icon for type badge
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

  const slugParam  = query.get("slug") || params.slug || "";
  const colorParam = query.get("color") || "";
  const sizeParam  = query.get("size")  || "";

  const [product, setProduct] = useState(null);
  const productType = useMemo(() => detectProductType(product), [product]);
  const availableViews = useMemo(() => VIEWS_BY_TYPE[productType] || ["front"], [productType]);

  const [view, setView] = useState("front");
  const [color, setColor] = useState(colorParam);
  const [size,  setSize]  = useState(sizeParam);

  const frameRef  = useRef(null);   // outer container that defines max size
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);

  // Visual calibration (percentages of canvas height + offsets in px)
  const [mockupHeightPct, setMockupHeightPct] = useState(DEFAULT_VIZ.mockupHeightPct);
  const [areaHeightPct,   setAreaHeightPct]   = useState(DEFAULT_VIZ.areaHeightPct);
  const [offsetX, setOffsetX] = useState(DEFAULT_VIZ.offsetX);
  const [offsetY, setOffsetY] = useState(DEFAULT_VIZ.offsetY);
  const [mockupOpacity, setMockupOpacity] = useState(DEFAULT_VIZ.mockupOpacity);

  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);

  // text tool
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);

  // saved designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

  // history
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // -------- Data fetch --------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (cancelled) return;
        const p = res.data;
        setProduct(p);

        if (!colorParam) {
          const colorSet = new Set();
          (p?.variants || []).forEach(v => v.color && colorSet.add(v.color));
          (p?.colors || []).forEach(c => colorSet.add(c));
          const first = [...colorSet][0]; if (first) setColor(first);
        }
        if (!sizeParam) {
          const sizeSet = new Set();
          (p?.variants || []).forEach(v => v.size && sizeSet.add(v.size));
          const firstS = [...sizeSet][0]; if (firstS) setSize(firstS);
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

  // -------- Fabric init / resize --------
  useEffect(() => {
    if (!window.fabric || !frameRef.current || !canvasRef.current) return;

    if (!fabricRef.current) {
      const rect = frameRef.current.getBoundingClientRect();
      const targetW = rect.width;
      const targetH = targetW / PREVIEW_ASPECT;

      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: targetW,
        height: targetH,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      const onChange = () => {
        const objs = fc.getObjects().filter(o => o.id !== "printArea" && !o._overlay && !o._mockup);
        setHasObjects(objs.length > 0);
      };
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
    }

    const ro = new ResizeObserver(() => {
      if (!fabricRef.current) return;
      const rect = frameRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = w / PREVIEW_ASPECT;
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      refreshBackground();
      drawOverlays();
      fabricRef.current.requestRenderAll();
    });
    ro.observe(frameRef.current);
    return () => ro.disconnect();
  }, []);

  // -------- History helpers --------
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id"])));
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);
  const applyJSON = (json) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll(), (o, obj) => obj);
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

  // -------- Mockup selection --------
  function pickMockupUrl(prod, v, c) {
    const slugKey = normSlug(prod) || norm(slugParam);
    const colorKey = normColor(c);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[v];
    if (bySlug) return bySlug;

    const variants = prod?.variants || [];
    const variant = variants.find(x => (x.color === c || x.colorName === c)) || variants[0];

    const tryFiles = (files = []) => {
      const pref = (t) =>
        files.find(f => f?.type === t && (f.preview_url || f.url || f.thumbnail_url));
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
    if (prod?.images?.length) {
      const pimg = prod.images.find(i => i.isPrimary) || prod.images[0];
      if (pimg?.url) return pimg.url;
      if (typeof prod.images[0] === "string") return prod.images[0];
    }
    if (variant?.image) return variant.image;
    if (prod?.image) return prod.image;
    return PLACEHOLDER;
  }

  // -------- Load per-product/view calibration --------
  const applyPreset = useCallback(() => {
    const slugKey = normSlug(product) || norm(slugParam);
    const p = CALIBRATION?.[slugKey]?.[view] || CALIBRATION?.[slugKey]?._all || {};
    setMockupHeightPct(p.mockupHeightPct ?? DEFAULT_VIZ.mockupHeightPct);
    setAreaHeightPct(p.areaHeightPct ?? DEFAULT_VIZ.areaHeightPct);
    setOffsetX(p.offsetX ?? DEFAULT_VIZ.offsetX);
    setOffsetY(p.offsetY ?? DEFAULT_VIZ.offsetY);
    setMockupOpacity(p.mockupOpacity ?? DEFAULT_VIZ.mockupOpacity);
  }, [product, view, slugParam]);

  useEffect(() => { if (product) applyPreset(); }, [product, view, applyPreset]);

  // -------- Grid / rulers --------
  const drawOverlays = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    // remove previous overlays
    fc.getObjects().filter(o => o._overlay).forEach(o => fc.remove(o));

    if (showGrid) {
      const group = new window.fabric.Group([], { selectable: false, evented: false, _overlay: true });
      const step = Math.round(fc.width / 20);
      for (let i = step; i < fc.width; i += step)
        group.add(new window.fabric.Line([i, 0, i, fc.height], { stroke: "rgba(255,255,255,.06)" }));
      for (let j = step; j < fc.height; j += step)
        group.add(new window.fabric.Line([0, j, fc.width, j], { stroke: "rgba(255,255,255,.06)" }));
      fc.add(group);
    }
    if (showRulers) {
      const r = new window.fabric.Group([], { selectable: false, evented: false, _overlay: true });
      r.add(new window.fabric.Rect({ left: 0, top: 0, width: fc.width, height: 22, fill: "rgba(255,255,255,.05)" }));
      r.add(new window.fabric.Rect({ left: 0, top: 0, width: 22, height: fc.height, fill: "rgba(255,255,255,.05)" }));
      const every = 50;
      for (let x = 22 + every; x < fc.width; x += every) r.add(new window.fabric.Line([x, 0, x, 22], { stroke: "rgba(255,255,255,.2)" }));
      for (let y = 22 + every; y < fc.height; y += every) r.add(new window.fabric.Line([0, y, 22, y], { stroke: "rgba(255,255,255,.2)" }));
      fc.add(r);
    }
    fc.requestRenderAll();
  }, [showGrid, showRulers]);

  useEffect(() => { drawOverlays(); }, [drawOverlays]);

  // -------- Background + print area (NEW sizing model) --------
  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;

    // keep user layers
    const keep = fc.getObjects().filter(o => !o._mockup && o.id !== "printArea" && !o._overlay);
    fc.clear();
    keep.forEach(o => fc.add(o));

    const url = pickMockupUrl(product, view, color) || PLACEHOLDER;

    window.fabric.Image.fromURL(
      url,
      (img) => {
        const targetMockupH = fc.height * mockupHeightPct; // key: percent of canvas height
        const scale = targetMockupH / img.height;

        img.set({
          scaleX: scale,
          scaleY: scale,
          top: fc.height / 2,
          left: fc.width / 2,
          opacity: mockupOpacity,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
          _mockup: true,
        });

        fc.setBackgroundImage(img, fc.renderAll.bind(fc));

        // Print area height from % of canvas height; width by real print aspect
        const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
        const hPx = fc.height * areaHeightPct;
        const aspect = areaDef.widthInches / areaDef.heightInches;
        const wPx = hPx * aspect;

        const rect = new window.fabric.Rect({
          id: "printArea",
          left: fc.width / 2 + offsetX,
          top:  fc.height / 2 + offsetY,
          originX: "center",
          originY: "center",
          width: wPx,
          height: hPx,
          fill: "",
          stroke: "white",
          strokeDashArray: [6, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
        });
        fc.add(rect);

        drawOverlays();
        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, view, color, productType, mockupHeightPct, areaHeightPct, offsetX, offsetY, mockupOpacity, drawOverlays]);

  useEffect(() => { if (product) refreshBackground(); }, [product, refreshBackground, view, color]);

  // -------- Constraints inside print area --------
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const constrain = () => {
      const area = fc.getObjects().find(o => o.id === "printArea"); if (!area) return;
      const a = area.getBoundingRect(true, true);
      fc.getObjects().forEach(o => {
        if (o.id === "printArea" || o._overlay || o._mockup) return;
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
  }, [view, areaHeightPct, offsetX, offsetY]);

  // -------- Tools --------
  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim()) return toast({ title: "Enter text first", status: "info" });
    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center",
      fill: textColor, fontSize: textSize
    });
    pushHistory(); fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
    setTextValue("");
  };

  const addDesign = (d) => {
    const fc = fabricRef.current; if (!fc || !d?.imageDataUrl) return;
    window.fabric.Image.fromURL(d.imageDataUrl, (img) => {
      img.set({ left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
      pushHistory(); fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      setSelectedDesignId(d._id);
    }, { crossOrigin: "anonymous" });
  };

  const uploadImage = (file) => {
    const fc = fabricRef.current; if (!fc || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      window.fabric.Image.fromURL(reader.result, (img) => {
        img.set({ left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
        pushHistory(); fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      }, { crossOrigin: "anonymous" });
    };
    reader.readAsDataURL(file);
  };

  const del = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea" || o._overlay || o._mockup) return;
    pushHistory(); fc.remove(o); fc.discardActiveObject(); fc.requestRenderAll();
  };

  const centerH = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o || o.id === "printArea") return;
    o.centerH(); fc.requestRenderAll();
  };

  const alignCenter = () => {
    const fc = fabricRef.current; if (!fc) return;
    const area = fc.getObjects().find(o => o.id === "printArea"); const o = fc.getActiveObject();
    if (!o || !area) return;
    o.left = area.left + area.width / 2;
    o.top  = area.top + area.height / 2;
    o.setCoords(); fc.requestRenderAll();
  };

  const bringForward = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    fc.bringForward(o); fc.requestRenderAll();
  };
  const sendBackward = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    // avoid sending behind mockup or overlays
    fc.sendBackwards(o, true); fc.requestRenderAll();
  };

  const setZoomSafe = (z) => {
    const fc = fabricRef.current; if (!fc) return;
    const clamped = Math.max(0.75, Math.min(2.5, z));
    setZoom(clamped); fc.setZoom(clamped); fc.requestRenderAll();
  };

  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;
    const area = fc.getObjects().find(o => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter(o => o.id !== "printArea" && !o._overlay && !o._mockup);
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    const outW = Math.round(areaDef.widthInches * DPI);
    const outH = Math.round(areaDef.heightInches * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);
    const scaleFactor = outH / aBB.height; // use height as reference to preserve our visual % mapping

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top  - aBB.top  + bb.height / 2;

      clone.originX = "center"; clone.originY = "center";
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
        name: product?.name,
        color, size, view,
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

  // color/size lists
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

  // -------- Layout --------
  return (
    <Flex direction="column" minH="100vh" bg="brand.primary">
      <Box px={{ base: 3, md: 6 }} py={4}>
        <Heading size="lg" color="brand.textLight" display="flex" alignItems="center" gap={3}>
          <ProductTypeBadgeIcon type={productType} />
          {product?.name || "Product Studio"}
          <Badge ml={3} variant="outline" colorScheme="yellow" opacity={0.8}>{productType.toUpperCase()}</Badge>
        </Heading>
      </Box>

      <Flex
        flex="1"
        px={{ base: 3, md: 6 }}
        pb={6}
        gap={4}
        justify="center"
      >
        {/* Left panel */}
        <Box
          w={{ base: "100%", lg: "320px" }}
          maxW="420px"
          bg="brand.paper"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          rounded="xl"
          p={4}
          h="fit-content"
          alignSelf={{ base: "stretch", lg: "flex-start" }}
        >
          {!product ? (
            <VStack p={2} spacing={3} align="stretch">
              <Skeleton height="24px" />
              <Skeleton height="180px" />
            </VStack>
          ) : (
            <Tabs variant="enclosed" colorScheme="yellow">
              <TabList>
                <Tab>Options</Tab>
                <Tab>Designs</Tab>
                <Tab>Text</Tab>
                <Tab>Calibrate</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">View</Text>
                      <HStack wrap="wrap" spacing={2}>
                        {availableViews.map(v => (
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
                      <Text color="brand.textLight" fontWeight="medium">Canvas zoom</Text>
                      <HStack>
                        <Tooltip label="Zoom out">
                          <Button size="sm" onClick={() => setZoomSafe(zoom - 0.1)} leftIcon={<FaSearchMinus />}>Out</Button>
                        </Tooltip>
                        <Slider aria-label="zoom" value={zoom} min={0.75} max={2.5} step={0.1} onChange={setZoomSafe}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack>
                          <SliderThumb />
                        </Slider>
                        <Tooltip label="Zoom in">
                          <Button size="sm" onClick={() => setZoomSafe(zoom + 0.1)} leftIcon={<FaSearchPlus />}>In</Button>
                        </Tooltip>
                      </HStack>
                    </VStack>

                    <HStack mt={2} spacing={6}>
                      <Checkbox isChecked={showGrid} onChange={(e)=>{setShowGrid(e.target.checked); drawOverlays();}}>Grid</Checkbox>
                      <Checkbox isChecked={showRulers} onChange={(e)=>{setShowRulers(e.target.checked); drawOverlays();}}>Rulers</Checkbox>
                    </HStack>

                    <Divider borderColor="whiteAlpha.300" />

                    <VStack spacing={3} align="stretch">
                      <Button
                        colorScheme={canProceed ? "purple" : "gray"}
                        isDisabled={!canProceed}
                        onClick={makePrintReadyAndUpload}
                        width="full"
                      >
                        Add to cart / Checkout
                      </Button>
                      <Text fontSize="xs" color="whiteAlpha.700" textAlign="center">
                        We export a true print file at {DPI} DPI sized to the selected placement.
                      </Text>
                    </VStack>
                  </VStack>
                </TabPanel>

                <TabPanel px={0}>
                  <VStack align="stretch" spacing={3}>
                    <HStack>
                      <label htmlFor="upload-img">
                        <input id="upload-img" type="file" accept="image/*" hidden onChange={(e)=>uploadImage(e.target.files?.[0])}/>
                        <Button leftIcon={<FaUpload />}>Upload image</Button>
                      </label>
                    </HStack>
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

                <TabPanel px={0}>
                  <VStack align="stretch" spacing={4}>
                    <Text color="brand.textLight" fontWeight="medium">Visual calibration</Text>

                    <Box>
                      <Text mb={1} fontSize="sm">Mockup opacity</Text>
                      <Slider value={mockupOpacity} min={0.2} max={1} step={0.02}
                              onChange={(v)=>{setMockupOpacity(v); refreshBackground();}}>
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>

                    <Box>
                      <Text mb={1} fontSize="sm">Mockup height (% of canvas)</Text>
                      <Slider value={Math.round(mockupHeightPct*100)} min={60} max={98} step={1}
                              onChange={(v)=>{setMockupHeightPct(v/100); refreshBackground();}}>
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>

                    <Box>
                      <Text mb={1} fontSize="sm">Print area height (% of canvas)</Text>
                      <Slider value={Math.round(areaHeightPct*100)} min={30} max={70} step={1}
                              onChange={(v)=>{setAreaHeightPct(v/100); refreshBackground();}}>
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>

                    <HStack>
                      <Box flex="1">
                        <Text mb={1} fontSize="sm">Offset X (px)</Text>
                        <NumberInput value={offsetX} min={-500} max={500}
                                     onChange={(v)=>{setOffsetX(parseInt(v||"0",10)); refreshBackground();}}>
                          <NumberInputField />
                          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                        </NumberInput>
                      </Box>
                      <Box flex="1">
                        <Text mb={1} fontSize="sm">Offset Y (px)</Text>
                        <NumberInput value={offsetY} min={-500} max={500}
                                     onChange={(v)=>{setOffsetY(parseInt(v||"0",10)); refreshBackground();}}>
                          <NumberInputField />
                          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                        </NumberInput>
                      </Box>
                    </HStack>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </Box>

        {/* Canvas center (fills remaining) */}
        <Flex
          flex="1"
          minW={{ base: "100%", lg: "720px" }}
          maxW="1200px"
          bg="brand.secondary"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          rounded="xl"
          p={3}
          align="center"
          justify="center"
          overflow="hidden"
        >
          <Box
            ref={frameRef}
            w="100%"
            maxW="1100px"
            // maintain 2:3 area using inner box + absolute canvas
            position="relative"
            _before={{
              content: '""',
              display: "block",
              paddingTop: `${100 / PREVIEW_ASPECT}%`, // aspect shim
            }}
          >
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
          </Box>
        </Flex>

        {/* Layers panel (compact) */}
        <Box
          display={{ base: "none", xl: "block" }}
          w="240px"
          bg="brand.paper"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          rounded="xl"
          p={3}
          h="fit-content"
        >
          <Heading size="sm" color="brand.textLight" mb={3} display="flex" alignItems="center" gap={2}>
            <FaLayerGroup /> Layers
          </Heading>
          <VStack align="stretch" spacing={2}>
            <HStack spacing={2}>
              <Button size="xs" leftIcon={<FaArrowUp />} onClick={bringForward}>Bring forward</Button>
              <Button size="xs" leftIcon={<FaArrowDown />} onClick={sendBackward}>Send backward</Button>
            </HStack>
            <HStack spacing={2}>
              <Button size="xs" leftIcon={<FaCrosshairs />} onClick={alignCenter} variant="outline">Center in area</Button>
              <Button size="xs" onClick={centerH} variant="outline"><FaArrowsAltH /></Button>
            </HStack>
            <Divider borderColor="whiteAlpha.300" />
            <HStack spacing={2}>
              <Tooltip label="Undo"><Button size="xs" onClick={undo} leftIcon={<FaUndo />}>Undo</Button></Tooltip>
              <Tooltip label="Redo"><Button size="xs" onClick={redo} leftIcon={<FaRedo />}>Redo</Button></Tooltip>
              <Tooltip label="Delete"><Button size="xs" onClick={del} colorScheme="red" variant="outline"><FaTrash /></Button></Tooltip>
            </HStack>
          </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}
