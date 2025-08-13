// frontend/src/pages/ProductStudio.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, IconButton, SimpleGrid,
  AspectRatio, Image, Tooltip, useToast, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Input,
  Divider, Badge, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Tabs,
  TabList, TabPanels, Tab, TabPanel, Checkbox, Wrap, WrapItem
} from "@chakra-ui/react";
import {
  FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus,
  FaTshirt, FaHatCowboy, FaHockeyPuck, FaEye, FaEyeSlash,
  FaArrowUp, FaArrowDown, FaLock, FaLockOpen
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";
import PRINT_AREAS, { PRINT_SIZE_IN } from "../data/printAreas.js";

// Try to load Cloudinary mockup map; support both default/named export
// (won't break build if file is missing)
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_MOD?.default ?? MOCKUPS_MOD?.MOCKUPS ?? {});

// ---------- Constants ----------
const DPI = 300;
const STAGE_ASPECT = 2 / 3; // canvas area aspect (tall)
const RULER_THICK = 22; // px for top/left rulers
const GRID_BG = "repeating-linear-gradient(0deg, rgba(255,255,255,.05), rgba(255,255,255,.05) 1px, transparent 1px, transparent 16px), repeating-linear-gradient(90deg, rgba(255,255,255,.05), rgba(255,255,255,.05) 1px, transparent 1px, transparent 16px)";

const COLOR_SWATCHES = {
  black: "#000000", maroon: "#800000", red: "#D32F2F", orange: "#F57C00", gold: "#D4AF37",
  lime: "#9CCC65", "forest green": "#228B22", "military green": "#4B5320", green: "#2E7D32",
  "tropical blue": "#1CA3EC", royal: "#1E40AF", navy: "#0B1F44", purple: "#6B21A8",
  charcoal: "#36454F", grey: "#8E8E8E", ash: "#B2BEB5", white: "#FFFFFF", azalea: "#FF77A9",
  "brown savana": "#7B5E57", "brown savanna": "#7B5E57", brown: "#6D4C41", sand: "#E0CDA9",
};
const COLOR_ORDER = ["black","maroon","red","orange","gold","lime","forest green","green","tropical blue","royal","navy","purple","charcoal","grey","ash","white"];

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "sleeve"],
  hoodie: ["front", "back"],
  tote:   ["front", "back"],
  hat:    ["front"],
  beanie: ["front"],
};

// ---------- Helpers ----------
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug  = (p) => norm(p?.slug || p?.name || "");

// detect product "type"
function detectProductType(product) {
  const text = `${product?.type || product?.category || ""} ${product?.name || ""}`.toLowerCase();
  if (/(tee|t-shirt|shirt|unisex)/.test(text)) return "tshirt";
  if (/(hoodie|sweatshirt)/.test(text)) return "hoodie";
  if (/(tote|bag)/.test(text)) return "tote";
  if (/(hat|cap|trucker|snapback)/.test(text)) return "hat";
  if (/(beanie|knit)/.test(text)) return "beanie";
  return "tshirt";
}

function ProductTypeBadgeIcon({ type }) {
  const IconCmp = type === "tshirt" ? FaTshirt
                : type === "hoodie" ? FaTshirt
                : type === "hat"    ? FaHatCowboy
                : type === "beanie" ? FaHockeyPuck
                : FaTshirt;
  return <Icon as={IconCmp} color="brand.accentYellow" />;
}

// Sort colors Black→…→White then fallback alpha
function orderColors(colors) {
  const set = Array.from(new Set((colors || []).map(c => String(c))));
  return set.sort((a,b) => {
    const ai = COLOR_ORDER.indexOf(a.toLowerCase());
    const bi = COLOR_ORDER.indexOf(b.toLowerCase());
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    return a.localeCompare(b);
  });
}

// ---------- Component ----------
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
  const [color, setColor] = useState(colorParam || "black");
  const [size, setSize] = useState(sizeParam || "");
  const [zoom, setZoom] = useState(1);
  const [gridOn, setGridOn] = useState(true);
  const [rulersOn, setRulersOn] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(0.85);

  // Fabric + stage refs
  const stageRef = useRef(null);          // the container around canvases
  const canvasRef = useRef(null);         // main fabric canvas <canvas>
  const rulerTopRef = useRef(null);
  const rulerLeftRef = useRef(null);
  const fabricRef = useRef(null);
  const [hasObjects, setHasObjects] = useState(false);

  // Designs & layers
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedLayerId, setSelectedLayerId] = useState(null);

  // Undo/Redo
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // ---------- Data fetch ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (!cancelled) {
          const p = res.data;
          setProduct(p);

          // Defaults
          const colorsFromData = orderColors([
            ...(p?.colors || []),
            ...((p?.variants || []).map(v=>v.color).filter(Boolean))
          ]);
          if (!colorParam) setColor(colorsFromData.includes("black") ? "black" : (colorsFromData[0] || "black"));

          const sizeSet = new Set();
          (p?.variants || []).forEach(v => v.size && sizeSet.add(v.size));
          if (!sizeParam && sizeSet.size) setSize([...sizeSet][0]);

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

  // ---------- Fabric init & resize ----------
  const ensureFabric = useCallback(() => {
    if (!window.fabric || !stageRef.current || !canvasRef.current) return;

    const host = stageRef.current;
    const hostW = host.clientWidth;
    const hostH = Math.max(hostW / STAGE_ASPECT, 520); // tall space, consistent
    const innerW = hostW - RULER_THICK;
    const innerH = hostH - RULER_THICK;

    // Size rulers canvases
    const rt = rulerTopRef.current;
    const rl = rulerLeftRef.current;
    if (rt) { rt.width = innerW; rt.height = RULER_THICK; }
    if (rl) { rl.width = RULER_THICK; rl.height = innerH; }

    // First time
    if (!fabricRef.current) {
      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: innerW, height: innerH, preserveObjectStacking: true, selection: true,
      });
      fabricRef.current = fc;

      const onChange = () => {
        const objs = fc.getObjects().filter(o => o.id !== "printArea");
        setHasObjects(objs.length > 0);
        drawRulers(); // update rulers as objects move/zoom
      };
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
      fc.on("selection:created", () => drawRulers());
      fc.on("selection:updated", () => drawRulers());
      fc.on("selection:cleared", () => drawRulers());
    } else {
      fabricRef.current.setWidth(innerW);
      fabricRef.current.setHeight(innerH);
      fabricRef.current.requestRenderAll();
    }

    drawRulers();
  }, []);

  useEffect(() => {
    ensureFabric();
    const ro = new ResizeObserver(ensureFabric);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [ensureFabric]);

  // ---------- Mockup + printArea ----------
  function pickMockupUrl(product, view, color) {
    const slugKey = normSlug(product) || norm(slugParam);
    const colorKey = normColor(color);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[view];
    if (bySlug) return bySlug;

    // Variants fallback
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

    return null;
  }

  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;

    // keep user objects
    const userObjects = fc.getObjects().filter(o => o.id !== "printArea");
    fc.clear();
    userObjects.forEach(o => fc.add(o));

    // Load mockup
    const mockupUrl = pickMockupUrl(product, view, color);
    if (!mockupUrl) { fc.requestRenderAll(); return; }

    window.fabric.Image.fromURL(mockupUrl, (img) => {
      // Scale to fit WIDTH, and anchor TOP-CENTER so it doesn't drift down the stage
      const scale = (fc.width * 0.86) / img.width; // 86% of inner width
      img.set({
        top: 0,
        left: fc.width / 2,
        originX: "center",
        originY: "top",
        selectable: false,
        evented: false,
        opacity: mockupOpacity,
      });
      img.scale(scale);
      fc.setBackgroundImage(img, fc.renderAll.bind(fc));

      // Compute print area from relative config
      const cfg = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
      const mockW = img.getScaledWidth();
      const mockH = img.getScaledHeight();

      const rectLeft = (fc.width - mockW) / 2 + cfg.left * mockW;
      const rectTop  = img.top + cfg.top * mockH;
      const rectW    = cfg.width * mockW;
      const rectH    = cfg.height * mockH;

      const existing = fc.getObjects().find(o => o.id === "printArea");
      const rectProps = {
        id: "printArea",
        left: rectLeft, top: rectTop,
        originX: "left", originY: "top",
        width: rectW, height: rectH,
        fill: "", stroke: "white",
        strokeDashArray: [6, 6], strokeWidth: 2,
        selectable: false, evented: false,
        lockMovementX: true, lockMovementY: true,
        excludeFromExport: true,
      };
      if (existing) {
        existing.set(rectProps); existing.setCoords();
      } else {
        const rect = new window.fabric.Rect(rectProps);
        fc.add(rect);
      }
      fc.requestRenderAll();
      drawRulers();
    }, { crossOrigin: "anonymous" });
  }, [product, view, color, productType, mockupOpacity]);

  useEffect(() => { if (product) refreshBackground(); }, [product, refreshBackground, view, color]);

  // Keep objects inside printArea
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const constrain = () => {
      const area = fc.getObjects().find(o => o.id === "printArea");
      if (!area) return;
      const a = area.getBoundingRect(true, true);
      const objs = fc.getObjects().filter(o => o.id !== "printArea");
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

  // ---------- Rulers ----------
  const drawRulers = useCallback(() => {
    if (!rulersOn) return;
    const fc = fabricRef.current; if (!fc) return;
    const rt = rulerTopRef.current;
    const rl = rulerLeftRef.current;
    if (!rt || !rl) return;

    const ctxT = rt.getContext("2d");
    const ctxL = rl.getContext("2d");
    const W = rt.width, H = rl.height;

    // Clear
    ctxT.clearRect(0, 0, W, RULER_THICK);
    ctxL.clearRect(0, 0, RULER_THICK, H);

    // Scale & DPI → pixels per inch at current zoom (we don't use fabric.setZoom here; we scale objects)
    const pxPerIn = DPI * (fc.getZoom ? fc.getZoom() : 1); // fabric default zoom

    ctxT.fillStyle = "rgba(255,255,255,.7)";
    ctxT.strokeStyle = "rgba(255,255,255,.5)";
    ctxT.beginPath();
    for (let x = 0; x < W; x += Math.max(1, Math.round(pxPerIn/2))) {
      const long = (x % Math.round(pxPerIn) === 0);
      ctxT.moveTo(x + 0.5, RULER_THICK);
      ctxT.lineTo(x + 0.5, long ? 4 : 10);
      if (long) {
        ctxT.fillText(String(Math.round(x/pxPerIn)), x + 2, 16);
      }
    }
    ctxT.stroke();

    ctxL.fillStyle = "rgba(255,255,255,.7)";
    ctxL.strokeStyle = "rgba(255,255,255,.5)";
    ctxL.beginPath();
    for (let y = 0; y < H; y += Math.max(1, Math.round(pxPerIn/2))) {
      const long = (y % Math.round(pxPerIn) === 0);
      ctxL.moveTo(RULER_THICK, y + 0.5);
      ctxL.lineTo(long ? 4 : 10, y + 0.5);
      if (long) {
        ctxL.save();
        ctxL.translate(16, y + 4);
        ctxL.rotate(-Math.PI/2);
        ctxL.fillText(String(Math.round(y/pxPerIn)), 0, 0);
        ctxL.restore();
      }
    }
    ctxL.stroke();
  }, [rulersOn]);

  // ---------- Canvas controls ----------
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id","name","lockMovementX","lockMovementY"])));
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);

  const applyJSON = (json) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll(), () => {});
  };
  const undo = () => {
    const fc = fabricRef.current; if (!fc || undoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id","name"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };
  const redo = () => {
    const fc = fabricRef.current; if (!fc || redoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id","name"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };
  const setZoomSafe = (z) => {
    const fc = fabricRef.current; if (!fc) return;
    const clamped = Math.max(0.5, Math.min(2, z));
    setZoom(clamped);
    fc.setZoom?.(clamped);
    fc.requestRenderAll();
    drawRulers();
  };

  const addDesign = (design) => {
    const fc = fabricRef.current; if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(design.imageDataUrl, (img) => {
      const area = fc.getObjects().find(o => o.id === "printArea");
      const { left, top, width, height } = area.getBoundingRect(true, true);
      img.set({
        left: left + width/2, top: top + height/2,
        originX: "center", originY: "center",
        scaleX: 0.5, scaleY: 0.5,
        name: design.prompt || "Image",
      });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };

  const deleteActive = () => {
    const fc = fabricRef.current; if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea") return;
    pushHistory();
    fc.remove(active);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };

  const centerHoriz = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea") return;
    const area = fc.getObjects().find(x => x.id === "printArea");
    const a = area.getBoundingRect(true,true);
    o.set({ left: a.left + a.width/2, originX: "center" });
    o.setCoords();
    fc.requestRenderAll();
  };

  // Layers helpers
  const layers = useMemo(() => {
    const fc = fabricRef.current; if (!fc) return [];
    return fc.getObjects()
      .filter(o => o.id !== "printArea")
      .map((o, i) => ({
        id: i + 1,
        ref: o,
        name: o.name || (o.type === "image" ? "Image" : o.type),
        visible: o.visible !== false,
        locked: o.lockMovementX && o.lockMovementY,
      }))
      .reverse(); // top-most first
  }, [fabricRef.current, hasObjects, view, color, zoom]);

  const toggleLayerVisible = (layer) => {
    layer.ref.visible = !layer.ref.visible;
    layer.ref.dirty = true;
    fabricRef.current.requestRenderAll();
  };
  const toggleLayerLock = (layer) => {
    const locked = !(layer.ref.lockMovementX && layer.ref.lockMovementY);
    layer.ref.lockMovementX = locked;
    layer.ref.lockMovementY = locked;
    layer.ref.hasControls = !locked;
    fabricRef.current.discardActiveObject();
    fabricRef.current.requestRenderAll();
  };
  const bringForward = (layer) => { layer.ref.bringForward(); fabricRef.current.requestRenderAll(); };
  const sendBack = (layer) => { layer.ref.sendBackwards(); fabricRef.current.requestRenderAll(); };

  // ---------- Export / checkout ----------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;
    const area = fc.getObjects().find(o => o.id === "printArea");
    if (!area) return toast({ title: "No print area", status: "error" });

    const objs = fc.getObjects().filter(o => o.id !== "printArea");
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const sz = PRINT_SIZE_IN[productType]?.[view] || PRINT_SIZE_IN.tshirt.front;
    const outW = Math.round(sz.w * DPI);
    const outH = Math.round(sz.h * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);

    // map canvas pixels -> output pixels
    const scaleFactor = outW / aBB.width;

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top  - aBB.top  + bb.height / 2;

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

  // ---------- Derived UI data ----------
  const colors = useMemo(() => {
    const list = [
      ...(product?.colors || []),
      ...((product?.variants || []).map(v=>v.color).filter(Boolean)),
    ];
    return orderColors(list);
  }, [product]);

  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => { if (!color || v.color === color) v.size && set.add(v.size); });
    return [...set];
  }, [product, color]);

  const canProceed = product && (!colors.length || color) && (!sizes.length || size) && hasObjects;

  // ---------- UI ----------
  return (
    <Flex direction="column" minH="100vh" bg="brand.primary" pt={2}>
      <HStack px={{ base: 4, md: 8 }} mb={2} justify="center">
        <Image src="/logo.png" alt="Tees From The Past" h="34px" />
      </HStack>

      <Flex w="100%" maxW="1200px" mx="auto" gap={4} px={{ base: 2, md: 4 }} pb={8}>
        {/* Sidebar */}
        <Box
          w={{ base: "100%", md: "300px" }}
          flexShrink={0}
          bg="brand.secondary"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          rounded="lg"
          p={4}
          position={{ md: "sticky" }}
          top="72px"
          alignSelf="flex-start"
        >
          {product ? (
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <HStack gap={2}>
                  <ProductTypeBadgeIcon type={productType} />
                  <Heading size="md" color="brand.textLight">{product.name}</Heading>
                </HStack>
                <Badge variant="outline" colorScheme="yellow" opacity={0.8}>{productType}</Badge>
              </HStack>

              <Tabs size="sm" variant="enclosed" colorScheme="yellow">
                <TabList>
                  <Tab>Options</Tab>
                  <Tab>Designs</Tab>
                  <Tab>Text</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={4}>
                      {/* View */}
                      <Box>
                        <Text mb={2} color="brand.textLight" fontWeight="medium">View</Text>
                        <HStack wrap="wrap" spacing={2}>
                          {availableViews.map(v => (
                            <Button key={v} size="xs" variant={view===v?"solid":"outline"} onClick={() => setView(v)}>{v}</Button>
                          ))}
                        </HStack>
                      </Box>

                      {/* Color - dots */}
                      <Box>
                        <Text mb={2} color="brand.textLight" fontWeight="medium">Color</Text>
                        <Wrap spacing={2}>
                          {colors.length ? colors.map((c) => {
                            const hex = COLOR_SWATCHES[c.toLowerCase()] || "#CCC";
                            const active = c === color;
                            return (
                              <WrapItem key={c}>
                                <Tooltip label={c}>
                                  <Box
                                    as="button"
                                    onClick={() => setColor(c)}
                                    borderRadius="full"
                                    boxSize="18px"
                                    borderWidth={active ? "2px" : "1px"}
                                    borderColor={active ? "yellow.300" : "blackAlpha.600"}
                                    background={hex}
                                  />
                                </Tooltip>
                              </WrapItem>
                            );
                          }) : <Badge>No colors</Badge>}
                        </Wrap>
                      </Box>

                      {/* Size */}
                      <Box>
                        <Text mb={2} color="brand.textLight" fontWeight="medium">Size</Text>
                        <HStack wrap="wrap" spacing={2}>
                          {sizes.length ? sizes.map((s) => (
                            <Button key={s} size="xs" variant={size===s?"solid":"outline"} onClick={() => setSize(s)}>{s}</Button>
                          )) : <Badge>No sizes</Badge>}
                        </HStack>
                      </Box>

                      {/* Zoom */}
                      <Box>
                        <Text mb={2} color="brand.textLight" fontWeight="medium">Canvas zoom</Text>
                        <HStack>
                          <IconButton aria-label="Zoom out" size="xs" icon={<FaSearchMinus />} onClick={() => setZoomSafe(zoom - 0.1)} />
                          <Slider aria-label="zoom" value={zoom} min={0.5} max={2} step={0.1} onChange={setZoomSafe}>
                            <SliderTrack><SliderFilledTrack /></SliderTrack>
                            <SliderThumb />
                          </Slider>
                          <IconButton aria-label="Zoom in" size="xs" icon={<FaSearchPlus />} onClick={() => setZoomSafe(zoom + 0.1)} />
                        </HStack>
                      </Box>

                      {/* Grid / Rulers / Mockup opacity */}
                      <HStack>
                        <Checkbox isChecked={gridOn} onChange={(e)=>setGridOn(e.target.checked)}>Grid</Checkbox>
                        <Checkbox isChecked={rulersOn} onChange={(e)=>{setRulersOn(e.target.checked); drawRulers();}}>Rulers</Checkbox>
                      </HStack>
                      <Box>
                        <Text mb={1} color="brand.textLight" fontWeight="medium">Mockup opacity</Text>
                        <Slider value={Math.round(mockupOpacity*100)} min={20} max={100} step={1}
                                onChange={(v)=>{ setMockupOpacity(v/100); refreshBackground(); }}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack>
                          <SliderThumb />
                        </Slider>
                      </Box>

                      <Button colorScheme={canProceed ? "yellow" : "gray"} isDisabled={!canProceed} onClick={makePrintReadyAndUpload}>
                        Add to cart / Checkout
                      </Button>
                      <Text fontSize="xs" color="whiteAlpha.700">We export a true print file at 300 DPI for the current placement.</Text>
                    </VStack>
                  </TabPanel>

                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={3}>
                      {loadingDesigns ? (
                        <Text color="brand.textLight">Loading…</Text>
                      ) : designs.length ? (
                        <SimpleGrid columns={{ base: 3 }} spacing={2}>
                          {designs.map((d) => (
                            <Tooltip key={d._id} label={d.prompt || "design"}>
                              <Box
                                borderWidth="2px"
                                borderColor="transparent"
                                rounded="md"
                                overflow="hidden"
                                cursor="pointer"
                                onClick={() => addDesign(d)}
                                _hover={{ borderColor: "purple.400" }}
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
                        <Input id="tftp-add-text" placeholder="Your text" />
                        <Button onClick={()=>{
                          const fc = fabricRef.current; if (!fc) return;
                          const area = fc.getObjects().find(o => o.id === "printArea");
                          const val = document.getElementById("tftp-add-text").value.trim();
                          if (!val) return;
                          const t = new window.fabric.IText(val, {
                            left: area.left + area.width/2,
                            top: area.top + area.height/2,
                            originX: "center", originY: "center",
                            fill: "#ffffff", fontSize: 48, name: "Text",
                          });
                          pushHistory();
                          fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
                          document.getElementById("tftp-add-text").value = "";
                        }}>Add</Button>
                      </HStack>
                      <HStack>
                        <Tooltip label="Delete selected">
                          <IconButton aria-label="delete" icon={<FaTrash />} onClick={deleteActive} />
                        </Tooltip>
                        <Tooltip label="Center horizontally in print area">
                          <IconButton aria-label="center" icon={<FaArrowsAltH />} onClick={centerHoriz} />
                        </Tooltip>
                        <Tooltip label="Undo">
                          <IconButton aria-label="undo" icon={<FaUndo />} onClick={undo} />
                        </Tooltip>
                        <Tooltip label="Redo">
                          <IconButton aria-label="redo" icon={<FaRedo />} onClick={redo} />
                        </Tooltip>
                      </HStack>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </VStack>
          ) : (
            <Text color="brand.textLight">Loading product…</Text>
          )}
        </Box>

        {/* STAGE */}
        <Flex flex="1" direction="column" gap={3}>
          <Box
            bg="brand.secondary"
            borderWidth="1px"
            borderColor="whiteAlpha.300"
            rounded="lg"
            p={0}
            overflow="hidden"
          >
            {/* Stage frame with rulers */}
            <Box
              ref={stageRef}
              position="relative"
              w="100%"
              // fixed height based on width to keep top-anchored shirt consistent
              _before={{
                content: '""',
                display: "block",
                paddingTop: `${100 / STAGE_ASPECT}%`,
              }}
            >
              {/* rulers */}
              {rulersOn && (
                <>
                  <Box position="absolute" left={`${RULER_THICK}px`} top="0" right="0" h={`${RULER_THICK}px`} bg="blackAlpha.500">
                    <canvas ref={rulerTopRef} style={{ width: "100%", height: "100%" }} />
                  </Box>
                  <Box position="absolute" top={`${RULER_THICK}px`} left="0" w={`${RULER_THICK}px`} bottom="0" bg="blackAlpha.500">
                    <canvas ref={rulerLeftRef} style={{ width: "100%", height: "100%" }} />
                  </Box>
                </>
              )}
              {/* canvas gutter area */}
              <Box
                position="absolute"
                left={`${RULER_THICK}px`}
                top={`${RULER_THICK}px`}
                right="0"
                bottom="0"
                bg={gridOn ? undefined : "transparent"}
                style={gridOn ? { backgroundImage: GRID_BG } : undefined}
              >
                <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
              </Box>
            </Box>
          </Box>
        </Flex>

        {/* Layers */}
        <Box
          w={{ base: "0", lg: "240px" }}
          display={{ base: "none", lg: "block" }}
          flexShrink={0}
          bg="brand.secondary"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          rounded="lg"
          p={3}
        >
          <Heading as="h3" size="sm" color="brand.textLight" mb={2}>Layers</Heading>
          <Text fontSize="xs" color="whiteAlpha.700" mb={3}>
            Click a layer to select on canvas. Toggle visibility or adjust order.
          </Text>
          <VStack align="stretch" spacing={2}>
            {layers.length === 0 && (
              <Text fontSize="sm" color="whiteAlpha.700">No layers yet. Add an image or text.</Text>
            )}
            {layers.map(layer => (
              <HStack
                key={layer.id}
                justify="space-between"
                p={2}
                borderWidth="1px"
                borderColor={selectedLayerId === layer.id ? "yellow.400" : "whiteAlpha.200"}
                rounded="md"
                _hover={{ borderColor: "yellow.300", cursor: "pointer" }}
                onClick={() => {
                  fabricRef.current.setActiveObject(layer.ref);
                  setSelectedLayerId(layer.id);
                }}
              >
                <Text noOfLines={1} color="brand.textLight" fontSize="sm">{layer.name}</Text>
                <HStack>
                  <IconButton
                    aria-label="toggle visible"
                    size="xs"
                    icon={layer.visible ? <FaEye /> : <FaEyeSlash />}
                    onClick={(e)=>{ e.stopPropagation(); toggleLayerVisible(layer); }}
                  />
                  <IconButton
                    aria-label="toggle lock"
                    size="xs"
                    icon={layer.locked ? <FaLock /> : <FaLockOpen />}
                    onClick={(e)=>{ e.stopPropagation(); toggleLayerLock(layer); }}
                  />
                  <IconButton
                    aria-label="up"
                    size="xs"
                    icon={<FaArrowUp />}
                    onClick={(e)=>{ e.stopPropagation(); bringForward(layer); }}
                  />
                  <IconButton
                    aria-label="down"
                    size="xs"
                    icon={<FaArrowDown />}
                    onClick={(e)=>{ e.stopPropagation(); sendBack(layer); }}
                  />
                </HStack>
              </HStack>
            ))}
          </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}
