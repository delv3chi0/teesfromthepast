// frontend/src/pages/ProductStudio.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid, AspectRatio, Image,
  Tooltip, useToast, Skeleton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Input, Divider, Badge, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, Tabs, TabList, TabPanels, Tab, TabPanel,
  Tag, TagLabel
} from "@chakra-ui/react";
import {
  FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus,
  FaTshirt, FaHatCowboy, FaHockeyPuck, FaEye, FaEyeSlash, FaLock, FaLockOpen, FaSyncAlt
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";

// styles for rulers, guides, sticky layout
import "../styles/productstudio.css";

// Cloudinary mockups map — tolerate either default or named export
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_MOD?.default || MOCKUPS_MOD?.MOCKUPS || {});

// ------------------------------
// Constants & helpers
// ------------------------------
const DPI = 300;
const PREVIEW_ASPECT = 2 / 3; // keep the stage consistently tall and fixed
const PLACEHOLDER = "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// “visual alignment” for the preview overlay (percentages of canvas size, tuned per view)
const PREVIEW_LAYOUT = {
  tshirt: {
    front:  { widthFrac: 0.42, heightFrac: 0.56, topFrac: 0.28 },
    back:   { widthFrac: 0.42, heightFrac: 0.56, topFrac: 0.28 },
    sleeve: { widthFrac: 0.28, heightFrac: 0.24, topFrac: 0.18 },
  },
  hoodie: {
    front:  { widthFrac: 0.40, heightFrac: 0.48, topFrac: 0.24 },
    back:   { widthFrac: 0.40, heightFrac: 0.56, topFrac: 0.26 },
  },
  tote:   {
    front:  { widthFrac: 0.44, heightFrac: 0.52, topFrac: 0.30 },
    back:   { widthFrac: 0.44, heightFrac: 0.52, topFrac: 0.30 },
  },
  hat:    { front: { widthFrac: 0.26, heightFrac: 0.12, topFrac: 0.20 } },
  beanie: { front: { widthFrac: 0.30, heightFrac: 0.14, topFrac: 0.22 } },
};

// real-world print sizes (inches) used for export
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

const RAINBOW_ORDER = [
  "black","charcoal","navy","royal","tropical blue","purple","maroon","red","orange","gold","lime","military green","brown savana","brown","sand","ash","sport_grey","grey","white"
];
const SWATCH_HEX = {
  black:"#000", white:"#fff", maroon:"#800000", red:"#d32f2f", royal:"#1e40af", "royal blue":"#1e40af",
  purple:"#6b21a8", charcoal:"#36454f", "military green":"#4b5320", "forest green":"#228b22", lime:"#9ccc65",
  "tropical blue":"#1ca3ec", navy:"#0b1f44", gold:"#d4af37", orange:"#f57c00", azalea:"#ff77a9",
  "brown savana":"#7b5e57", "brown savanna":"#7b5e57", brown:"#6d4c41", sand:"#e0cda9", ash:"#b2beb5",
  sport_grey:"#b5b8b1", grey:"#8e8e8e",
};

// normalize keys
const norm = (s) => String(s || "").trim().toLowerCase();
const normSlug  = (p) => norm(p?.slug || p?.name || "");
const normColor = (c) => norm(c).replace(/\s+/g," ").replace(/[_-]+/g," ");

// pick product type by text
function detectProductType(product) {
  const text = `${product?.type || product?.category || ""} ${product?.name || ""}`.toLowerCase();
  if (/(tee|t-shirt|shirt|unisex)/.test(text)) return "tshirt";
  if (/(hoodie|sweatshirt)/.test(text)) return "hoodie";
  if (/(tote|bag)/.test(text)) return "tote";
  if (/(hat|cap|trucker|snapback)/.test(text)) return "hat";
  if (/(beanie|knit)/.test(text)) return "beanie";
  return "tshirt";
}

// query helper
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

// ---------------------------------
// Main Component
// ---------------------------------
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
  const [size, setSize] = useState(sizeParam);

  // stage & fabric
  const stageRef = useRef(null);       // wrapper that controls exact stage height (sticky)
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  // UI state
  const [zoom, setZoom] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [lockPrintArea, setLockPrintArea] = useState(true);

  // Text tool
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);

  // Designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

  // Layers (with thumbnails)
  const [layers, setLayers] = useState([]);

  // Undo/Redo
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // ------------------------------
  // Data fetch
  // ------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (!cancelled) {
          const p = res.data;
          setProduct(p);

          // default color/size (prefer black if present)
          const colorSet = new Set();
          (p?.variants || []).forEach(v => v.color && colorSet.add(v.color));
          (p?.colors || []).forEach(c => colorSet.add(c));
          const sorted = sortColors([...colorSet]);
          const firstColor = sorted.find(c => normColor(c) === "black") || sorted[0];
          if (!colorParam && firstColor) setColor(firstColor);

          const sizeSet = new Set();
          (p?.variants || []).forEach(v => v.size && sizeSet.add(v.size));
          const firstS = [...sizeSet][0];
          if (!sizeParam && firstS) setSize(firstS);

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
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingDesigns(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ------------------------------
  // Fabric init + exact stage sizing
  // ------------------------------
  useEffect(() => {
    if (!window.fabric || !canvasRef.current || !stageRef.current) return;

    if (!fabricRef.current) {
      const dims = getStageDims();
      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: dims.w,
        height: dims.h,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      const onChange = () => {
        const has = fc.getObjects().filter(o => o.id !== "printArea").length > 0;
        setHasObjects(has);
        updateLayers();
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
      const { w, h } = getStageDims();
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      fabricRef.current.requestRenderAll();
      // redraw background/printArea on resize
      refreshBackground();
    });
    ro.observe(stageRef.current);
    return () => ro.disconnect();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getStageDims() {
    // The sticky stage keeps a consistent height based on viewport
    // Reserve some space for rulers if visible
    const parent = stageRef.current?.parentElement;
    const parentW = parent ? parent.clientWidth : 900;
    const baseH = Math.min(window.innerHeight - 160, Math.round(parentW / PREVIEW_ASPECT));
    const h = Math.max(540, baseH);
    const w = Math.round(h * PREVIEW_ASPECT);
    return { w, h };
  }

  // ------------------------------
  // Helpers: history & layers
  // ------------------------------
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id", "name", "lockMovementX", "lockMovementY"])));
    if (undoStack.current.length > 80) undoStack.current.shift();
  }, []);

  const applyJSON = (json) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.loadFromJSON(json, () => {
      fc.renderAll();
      updateLayers();
    });
  };

  const undo = () => {
    const fc = fabricRef.current;
    if (!fc || undoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id","name"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };

  const redo = () => {
    const fc = fabricRef.current;
    if (!fc || redoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id","name"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  function cloneToThumb(obj, size = 64) {
    const tmp = new window.fabric.Canvas(null, { width: size, height: size });
    const clone = window.fabric.util.object.clone(obj);
    // center in square
    clone.originX = "center"; clone.originY = "center";
    clone.scaleX = clone.scaleX * 0.5;
    clone.scaleY = clone.scaleY * 0.5;
    clone.left = size / 2; clone.top = size / 2;
    tmp.add(clone);
    tmp.requestRenderAll();
    const url = tmp.toDataURL({ format: "png", quality: 0.9 });
    tmp.dispose();
    return url;
  }

  function updateLayers() {
    const fc = fabricRef.current;
    if (!fc) return;
    const list = fc.getObjects()
      .filter(o => o.id !== "printArea")
      .map((o, idx) => {
        const kind = o.type === "i-text" ? "Text" : (o.type === "image" ? "Image" : o.type);
        let thumb = "";
        try { thumb = cloneToThumb(o, 64); } catch {}
        return { id: idx, kind, visible: o.visible !== false, lock: o.lockMovementX && o.lockMovementY, ref: o, thumb };
      }).reverse(); // top-most first
    setLayers(list);
  }

  // ------------------------------
  // MOCKUP PICKING (Cloudinary first)
  // ------------------------------
  function pickMockupUrl(product, view, color) {
    const slugKey = normSlug(product) || norm(slugParam);
    const colorKey = normColor(color).replace(/\s+/g, "-");
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[view];
    if (bySlug) return bySlug;

    // Fallbacks
    const variants = product?.variants || [];
    const variant = variants.find(v => (norm(v.color) === norm(color) || norm(v.colorName) === norm(color))) || variants[0];

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

  // ------------------------------
  // Background + print area
  // ------------------------------
  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    // Keep user objects; nuke previous background/printArea
    const keep = fc.getObjects().filter(o => o.id !== "printArea");
    fc.clear();
    keep.forEach(o => fc.add(o));

    // Set background mockup centered at TOP, scaled to stage width
    const mockupUrl = pickMockupUrl(product, view, color) || PLACEHOLDER;
    window.fabric.Image.fromURL(mockupUrl, (img) => {
      // scale by width to fill horizontally; then anchor at top-center
      const scale = fc.width / img.width;
      const scaledH = img.height * scale;

      fc.setBackgroundImage(img, fc.renderAll.bind(fc), {
        scaleX: scale,
        scaleY: scale,
        left: fc.width / 2,
        top: 0,
        originX: "center",
        originY: "top",
        selectable: false,
        evented: false,
      });

      // Visual preview print area sizing & position (outlined)
      const layout = PREVIEW_LAYOUT[productType]?.[view] || PREVIEW_LAYOUT.tshirt.front;
      const pxW = fc.width * layout.widthFrac;
      const pxH = fc.height * layout.heightFrac;
      const top = fc.height * layout.topFrac;

      const rect = new window.fabric.Rect({
        id: "printArea",
        left: fc.width / 2,
        top,
        originX: "center",
        originY: "top",
        width: pxW,
        height: pxH,
        fill: "rgba(255,255,255,0.02)",
        stroke: "rgba(255,255,255,0.9)",
        strokeDashArray: [8, 6],
        strokeWidth: 2,
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        excludeFromExport: true, // we only export user art
      });

      fc.add(rect);
      fc.sendToBack(rect);
      fc.requestRenderAll();
      updateLayers();
    }, { crossOrigin: "anonymous" });
  }, [product, view, color, productType, slugParam]);

  useEffect(() => {
    if (product) refreshBackground();
  }, [product, refreshBackground, view, color]);

  // ------------------------------
  // Constrain to print area + guides
  // ------------------------------
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

    const snapGuides = () => {
      if (!showGuides) return;
      const o = fc.getActiveObject(); if (!o) return;
      const area = fc.getObjects().find(x => x.id === "printArea"); if (!area) return;

      const a = area.getBoundingRect(true, true);
      const oB = o.getBoundingRect(true, true);
      const cx = oB.left + oB.width/2;
      const cy = oB.top + oB.height/2;
      const ax = a.left + a.width/2;
      const ay = a.top + a.height/2;

      // Soft snap (10px)
      const eps = 10;
      if (Math.abs(cx - ax) < eps) { o.left += (ax - cx); o.setCoords(); }
      if (Math.abs(cy - ay) < eps) { o.top  += (ay - cy); o.setCoords(); }

      fc.requestRenderAll();
    };

    fc.on("object:moving", constrain);
    fc.on("object:scaling", constrain);
    fc.on("object:rotating", constrain);
    fc.on("object:moving", snapGuides);
    return () => {
      fc.off("object:moving", constrain);
      fc.off("object:scaling", constrain);
      fc.off("object:rotating", constrain);
      fc.off("object:moving", snapGuides);
    };
  }, [view, productType, showGuides]);

  // ------------------------------
  // Tools
  // ------------------------------
  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim()) return toast({ title: "Enter text first", status: "info" });
    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2, top: fc.height * 0.35, originX: "center", originY: "center",
      fill: textColor, fontSize: textSize
    });
    pushHistory();
    fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
    updateLayers();
    setTextValue("");
  };

  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(design.imageDataUrl, (img) => {
      img.set({
        left: fc.width / 2,
        top: fc.height * 0.35,
        originX: "center",
        originY: "center",
        scaleX: 0.5, scaleY: 0.5
      });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      updateLayers();
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
    updateLayers();
  };

  const centerH = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea") return;
    o.centerH();
    fc.requestRenderAll();
  };

  const rotate90 = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o || o.id === "printArea") return;
    o.rotate(((o.angle || 0) + 90) % 360);
    o.setCoords();
    fc.requestRenderAll();
  };

  const setZoomSafe = (z) => {
    const fc = fabricRef.current; if (!fc) return;
    const clamped = Math.max(0.5, Math.min(2, z));
    setZoom(clamped);
    fc.setZoom(clamped);
    fc.requestRenderAll();
  };

  // ------------------------------
  // Export at print size (DPI) + upload
  // ------------------------------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;

    const area = fc.getObjects().find(o => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter(o => o.id !== "printArea");
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

  // ------------------------------
  // Color & size lists
  // ------------------------------
  const colors = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => v.color && set.add(v.color));
    (product?.colors || []).forEach(c => set.add(c));
    return sortColors([...set]);
  }, [product]);

  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => { if (!color || norm(v.color) === norm(color)) v.size && set.add(v.size); });
    return [...set];
  }, [product, color]);

  const canProceed = product && (!colors.length || color) && (!sizes.length || size) && hasObjects;

  // sort helper
  function sortColors(list) {
    const score = (c) => {
      const k = normColor(c);
      const idx = RAINBOW_ORDER.indexOf(k);
      return idx >= 0 ? idx : 999 + k.charCodeAt(0);
    };
    return [...list].sort((a,b) => score(a) - score(b));
  }

  // swatch render
  function Swatch({ name, isActive, onClick }) {
    const key = normColor(name);
    const hex = SWATCH_HEX[key] || "#ccc";
    return (
      <Tooltip label={name}>
        <Box
          onClick={onClick}
          cursor="pointer"
          borderRadius="full"
          boxSize="18px"
          borderWidth={isActive ? "3px" : "1px"}
          borderColor={isActive ? "yellow.400" : "blackAlpha.700"}
          background={hex}
          title={name}
        />
      </Tooltip>
    );
  }

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <Flex className="studio-root" direction={{ base: "column", xl: "row" }} minH="100vh" bg="brand.primary">
      {/* Left: Controls */}
      <Box w={{ base: "100%", xl: "36%" }} borderRightWidth={{ xl: "1px" }} borderColor="whiteAlpha.200" p={4} bg="brand.paper">
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
                <Heading size="lg" color="brand.textLight">{product.name}</Heading>
              </HStack>
              <Badge variant="outline" colorScheme="yellow" opacity={0.8}>{productType}</Badge>
            </HStack>

            <Tabs variant="enclosed" colorScheme="yellow">
              <TabList overflowX="auto">
                <Tab>Options</Tab>
                <Tab>Designs</Tab>
                <Tab>Text</Tab>
                <Tab>Layers</Tab>
              </TabList>
              <TabPanels>
                {/* Options */}
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={5}>
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
                          <Swatch key={c} name={c} isActive={normColor(color)===normColor(c)} onClick={() => setColor(c)} />
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

                    <HStack spacing={2}>
                      <Button size="sm" variant="outline" leftIcon={showRulers ? <FaEyeSlash/> : <FaEye/>} onClick={() => setShowRulers(v => !v)}>
                        {showRulers ? "Hide rulers" : "Show rulers"}
                      </Button>
                      <Button size="sm" variant="outline" leftIcon={showGuides ? <FaEyeSlash/> : <FaEye/>} onClick={() => setShowGuides(v => !v)}>
                        {showGuides ? "Hide guides" : "Show guides"}
                      </Button>
                      <Button size="sm" variant="outline" leftIcon={lockPrintArea ? <FaLock/> : <FaLockOpen/>} onClick={() => setLockPrintArea(v => !v)}>
                        {lockPrintArea ? "Lock area" : "Unlock area"}
                      </Button>
                    </HStack>
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

                {/* Layers */}
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={2}>
                    {layers.length === 0 && <Text color="brand.textLight" fontSize="sm">No layers yet.</Text>}
                    {layers.map((layer, i) => (
                      <HStack key={i} justify="space-between" p={2} borderWidth="1px" borderColor="whiteAlpha.300" rounded="md">
                        <HStack>
                          <Image src={layer.thumb} alt={layer.kind} boxSize="28px" borderRadius="sm" />
                          <Tag variant="subtle" colorScheme="purple"><TagLabel>{layer.kind}</TagLabel></Tag>
                        </HStack>
                        <HStack>
                          <Button size="xs" variant="outline" onClick={() => {
                            layer.ref.visible = !layer.ref.visible;
                            layer.ref.canvas?.requestRenderAll();
                            updateLayers();
                          }}>{layer.ref.visible ? "Hide" : "Show"}</Button>
                          <Button size="xs" variant="outline" onClick={() => {
                            const v = !(layer.ref.lockMovementX && layer.ref.lockMovementY);
                            layer.ref.lockMovementX = v; layer.ref.lockMovementY = v;
                            layer.ref.hasControls = !v;
                            layer.ref.canvas?.requestRenderAll();
                            updateLayers();
                          }}>{(layer.ref.lockMovementX && layer.ref.lockMovementY) ? "Unlock" : "Lock"}</Button>
                          <Button size="xs" variant="outline" onClick={() => {
                            layer.ref.bringToFront();
                            layer.ref.canvas?.requestRenderAll();
                            updateLayers();
                          }}>Front</Button>
                          <Button size="xs" variant="outline" onClick={() => {
                            layer.ref.sendToBack();
                            layer.ref.canvas?.requestRenderAll();
                            updateLayers();
                          }}>Back</Button>
                        </HStack>
                      </HStack>
                    ))}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>

            <Divider borderColor="whiteAlpha.300" />
            <VStack spacing={3}>
              <Button colorScheme={canProceed ? "purple" : "gray"} isDisabled={!canProceed} onClick={makePrintReadyAndUpload} width="full">
                Add to cart / Checkout
              </Button>
              <Text fontSize="xs" color="whiteAlpha.700" textAlign="center">
                We’ll generate a high-res PNG ({DPI} DPI) sized to the selected placement.
              </Text>
            </VStack>
          </VStack>
        )}
      </Box>

      {/* Right: Sticky Stage with rulers */}
      <Flex flex="1" direction="column" p={0} position="relative">
        {showRulers && (
          <>
            <div className="ruler-horizontal" />
            <div className="ruler-vertical" />
          </>
        )}

        <HStack p={3} color="brand.textLight" justify="space-between">
          <HStack>
            <Tooltip label="Undo"><Button size="sm" onClick={undo} leftIcon={<FaUndo />}>Undo</Button></Tooltip>
            <Tooltip label="Redo"><Button size="sm" onClick={redo} leftIcon={<FaRedo />}>Redo</Button></Tooltip>
          </HStack>
          <HStack>
            <Tooltip label="Rotate 90°">
              <Button size="sm" onClick={rotate90} variant="outline"><FaSyncAlt/></Button>
            </Tooltip>
            <Tooltip label="Delete selected">
              <Button size="sm" onClick={del} colorScheme="red" variant="outline"><FaTrash /></Button>
            </Tooltip>
            <Tooltip label="Center horizontally">
              <Button size="sm" onClick={centerH} variant="outline"><FaArrowsAltH /></Button>
            </Tooltip>
          </HStack>
        </HStack>

        <Box className="stage-wrap">
          <Box className="stage-frame" ref={stageRef}>
            <canvas ref={canvasRef} className="stage-canvas" />
            {showGuides && <div className="stage-crosshair" />}
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
}
