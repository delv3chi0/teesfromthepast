// frontend/src/pages/ProductStudio.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid, AspectRatio, Image,
  Tooltip, useToast, Skeleton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Input, Divider, Badge, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, Tabs, TabList, TabPanels, Tab, TabPanel,
  Switch, Spacer, Select, Checkbox, chakra
} from "@chakra-ui/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus, FaTshirt,
  FaHatCowboy, FaHockeyPuck, FaUpload, FaLayerGroup, FaArrowUp, FaArrowDown,
  FaRegSquare, FaRegObjectUngroup, FaCrosshairs
} from "react-icons/fa";
import { client } from "../api/client";
import MOCKUPS from "../data/mockups.js";

// ---------- CONSTANTS ----------
const DPI = 300;                 // Print resolution used for export PNG
const PREVIEW_ASPECT = 2 / 3;    // Canvas aspect ratio (on screen)
const PLACEHOLDER = "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Real-world print areas (defaults; fine-tune with calibration sliders per product/view)
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

// ---------- HELPERS ----------
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

// ---------- ICON BY TYPE ----------
function ProductTypeBadgeIcon({ type }) {
  const IconCmp = type === "tshirt" ? FaTshirt
                : type === "hoodie" ? FaTshirt
                : type === "hat"    ? FaHatCowboy
                : type === "beanie" ? FaHockeyPuck
                : FaTshirt;
  return <Icon as={IconCmp} color="brand.accentYellow" />;
}

// ---------- PAGE ----------
export default function ProductStudio() {
  const toast = useToast();
  const navigate = useNavigate();
  const query = useQuery();
  const params = useParams();

  const slugParam  = query.get("slug") || params.slug || "";
  const colorParam = query.get("color") || "";
  const sizeParam  = query.get("size")  || "";

  // product, type, views
  const [product, setProduct] = useState(null);
  const productType = useMemo(() => detectProductType(product), [product]);
  const availableViews = useMemo(() => VIEWS_BY_TYPE[productType] || ["front"], [productType]);

  // selections
  const [view, setView] = useState("front");
  const [color, setColor] = useState(colorParam);
  const [size, setSize]   = useState(sizeParam);

  // canvas + state
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const fabricRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);

  // calibration of print area vs mockup (lets you “line up” the dashed box)
  const [calScale, setCalScale] = useState(1);     // multiplies print area size on screen
  const [calOffsetX, setCalOffsetX] = useState(0); // px relative to canvas center
  const [calOffsetY, setCalOffsetY] = useState(0); // px relative to canvas center
  const [mockupScale, setMockupScale] = useState(1);   // extra scale on background mockup
  const [mockupOpacity, setMockupOpacity] = useState(1);

  // overlays
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const gridGroupRef = useRef(null);
  const rulerGroupRef = useRef(null);

  // text tool
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);

  // designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

  // layers list
  const [activeId, setActiveId] = useState(null);

  // history
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // ---------- DATA FETCH ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (!cancelled) {
          const p = res.data;
          setProduct(p);

          // default color/size if not given
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

  // ---------- FABRIC INIT & RESIZE ----------
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

      const onChange = () => {
        const objs = fc.getObjects().filter(o => o.id !== "printArea" && !o._isOverlay);
        setHasObjects(objs.length > 0);
        setActiveId(fc.getActiveObject()?.id || null);
      };
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
      fc.on("selection:cleared", onChange);
      fc.on("selection:updated", onChange);
      fc.on("selection:created", onChange);

      // Arrow-key nudge
      const onKey = (e) => {
        if (!fc) return;
        const o = fc.getActiveObject();
        if (!o || o.id === "printArea") return;
        let moved = false;
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") { o.left -= step; moved = true; }
        if (e.key === "ArrowRight"){ o.left += step; moved = true; }
        if (e.key === "ArrowUp")   { o.top  -= step; moved = true; }
        if (e.key === "ArrowDown") { o.top  += step; moved = true; }
        if (moved) { o.setCoords(); fc.requestRenderAll(); e.preventDefault(); }
      };
      window.addEventListener("keydown", onKey);
      fc.__cleanupKeys = () => window.removeEventListener("keydown", onKey);
    }

    const ro = new ResizeObserver(() => {
      if (!fabricRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = w / PREVIEW_ASPECT;
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      drawOverlays();     // re-create grid/rulers to the new size
      refreshBackground(); // also rescale background + print area
      fabricRef.current.requestRenderAll();
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // ---------- HISTORY ----------
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

  // ---------- MOCKUP PICKER ----------
  function pickMockupUrl(prod, v, c) {
    const slugKey = normSlug(prod) || norm(slugParam);
    const colorKey = normColor(c);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[v];
    if (bySlug) return bySlug;

    const variants = prod?.variants || [];
    const variant =
      variants.find(x => (x.color === c || x.colorName === c)) || variants[0];

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

  // ---------- GRID & RULERS ----------
  const drawOverlays = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;

    // Clean previous
    const old = fc.getObjects().filter(o => o._isOverlay);
    old.forEach(o => fc.remove(o));

    // Grid
    if (showGrid) {
      const grid = new window.fabric.Group([], { selectable: false, evented: false, _isOverlay: true });
      const step = Math.round(fc.width / 20);
      for (let i = step; i < fc.width; i += step) {
        grid.add(new window.fabric.Line([i, 0, i, fc.height], { stroke: "rgba(255,255,255,.06)" }));
      }
      for (let j = step; j < fc.height; j += step) {
        grid.add(new window.fabric.Line([0, j, fc.width, j], { stroke: "rgba(255,255,255,.06)" }));
      }
      fc.add(grid);
      gridGroupRef.current = grid;
    }

    // Rulers (top/left bars w/ ticks)
    if (showRulers) {
      const r = new window.fabric.Group([], { selectable: false, evented: false, _isOverlay: true });
      // top bar
      r.add(new window.fabric.Rect({ left: 0, top: 0, width: fc.width, height: 22, fill: "rgba(255,255,255,.05)" }));
      // left bar
      r.add(new window.fabric.Rect({ left: 0, top: 0, width: 22, height: fc.height, fill: "rgba(255,255,255,.05)" }));
      const every = 50;
      for (let x = 22 + every; x < fc.width; x += every) {
        r.add(new window.fabric.Line([x, 0, x, 22], { stroke: "rgba(255,255,255,.2)" }));
      }
      for (let y = 22 + every; y < fc.height; y += every) {
        r.add(new window.fabric.Line([0, y, 22, y], { stroke: "rgba(255,255,255,.2)" }));
      }
      fc.add(r);
      rulerGroupRef.current = r;
    }

    fc.sendToBack(rulerGroupRef.current || null);
    fc.requestRenderAll();
  }, [showGrid, showRulers]);

  useEffect(() => { drawOverlays(); }, [drawOverlays]);

  // ---------- BACKGROUND + PRINT AREA ----------
  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;

    // keep user objects (remove previous printArea, keep overlays)
    const keep = fc.getObjects().filter(o => o.id !== "printArea" && !o._replacedBackground);
    fc.clear();
    keep.forEach(o => fc.add(o));

    const mockupUrl = pickMockupUrl(product, view, color) || PLACEHOLDER;

    window.fabric.Image.fromURL(
      mockupUrl,
      (img) => {
        // Fit mockup into canvas, then apply extra mockupScale & opacity
        const baseScale = Math.min(fc.width / img.width, fc.height / img.height);
        img.set({
          scaleX: baseScale * mockupScale,
          scaleY: baseScale * mockupScale,
          top: fc.height / 2,
          left: fc.width / 2,
          opacity: mockupOpacity,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
          _replacedBackground: true,
        });
        fc.setBackgroundImage(img, fc.renderAll.bind(fc));
        // PRINT AREA (calibrated)
        const areaDef = PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
        // Downscale for preview so a 12x16" area doesn’t visually overwhelm the mockup:
        const pxW = areaDef.widthInches * DPI * (baseScale / 3) * calScale;
        const pxH = areaDef.heightInches * DPI * (baseScale / 3) * calScale;

        const rect = new window.fabric.Rect({
          id: "printArea",
          left: fc.width / 2 + calOffsetX,
          top: fc.height / 2 + calOffsetY,
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

        // Re-draw overlays last (stay on top)
        drawOverlays();
        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, view, color, productType, calScale, calOffsetX, calOffsetY, mockupScale, mockupOpacity, drawOverlays]);

  useEffect(() => { if (product) refreshBackground(); }, [product, refreshBackground, view, color]);

  // ---------- CONSTRAINTS (keep inside print area) ----------
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;

    const constrain = () => {
      const area = fc.getObjects().find(o => o.id === "printArea");
      if (!area) return;
      const objs = fc.getObjects().filter(o => o.id !== "printArea" && !o._isOverlay && !o._replacedBackground);
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
  }, [view, productType, calScale, calOffsetX, calOffsetY]);

  // ---------- TOOLS ----------
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

  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(design.imageDataUrl, (img) => {
      img.set({ left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      setSelectedDesignId(design._id);
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
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea" || active._isOverlay) return;
    pushHistory();
    fc.remove(active); fc.discardActiveObject(); fc.requestRenderAll();
  };

  const centerH = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea" || o._isOverlay) return;
    o.centerH(); fc.requestRenderAll();
  };

  const alignTop = () => {
    const fc = fabricRef.current; if (!fc) return;
    const area = fc.getObjects().find(o => o.id === "printArea");
    const o = fc.getActiveObject();
    if (!o || !area) return;
    const a = area.getBoundingRect(true, true);
    o.top = a.top + (o.getScaledHeight() / 2) + 2;
    o.setCoords(); fc.requestRenderAll();
  };
  const alignBottom = () => {
    const fc = fabricRef.current; if (!fc) return;
    const area = fc.getObjects().find(o => o.id === "printArea");
    const o = fc.getActiveObject();
    if (!o || !area) return;
    const a = area.getBoundingRect(true, true);
    o.top = a.top + a.height - (o.getScaledHeight() / 2) - 2;
    o.setCoords(); fc.requestRenderAll();
  };
  const alignCenter = () => {
    const fc = fabricRef.current; if (!fc) return;
    const area = fc.getObjects().find(o => o.id === "printArea");
    const o = fc.getActiveObject();
    if (!o || !area) return;
    o.left = area.left + area.width / 2;
    o.top  = area.top + area.height / 2;
    o.setCoords(); fc.requestRenderAll();
  };

  const setZoomSafe = (z) => {
    const fc = fabricRef.current; if (!fc) return;
    const clamped = Math.max(0.5, Math.min(2.5, z));
    setZoom(clamped); fc.setZoom(clamped); fc.requestRenderAll();
  };

  // ---------- EXPORT ----------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;

    const area = fc.getObjects().find(o => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });
    const objs = fc.getObjects().filter(o => o.id !== "printArea" && !o._isOverlay && !o._replacedBackground);
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

  // ---------- COMPUTED ----------
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

  // ---------- LAYERS PANEL ----------
  const layerObjects = () => {
    const fc = fabricRef.current; if (!fc) return [];
    return fc.getObjects().filter(o => o.id !== "printArea" && !o._isOverlay && !o._replacedBackground);
  };
  const selectLayer = (idx) => {
    const fc = fabricRef.current; if (!fc) return;
    const list = layerObjects();
    const obj = list[idx]; if (!obj) return;
    fc.setActiveObject(obj); fc.requestRenderAll();
  };
  const bringForward = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    fc.bringForward(o); fc.requestRenderAll();
  };
  const sendBackward = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    fc.sendBackwards(o); fc.requestRenderAll();
  };

  // ---------- UI ----------
  return (
    <Flex direction="column" minH="100vh" bg="brand.primary">
      <Flex
        direction={{ base: "column", xl: "row" }}
        gap={0}
        flex="1"
        maxW="1400px"
        mx="auto"
        w="100%"
      >
        {/* LEFT: Controls */}
        <Box w={{ base: "100%", xl: "360px" }} borderRightWidth={{ xl: "1px" }} borderColor="whiteAlpha.200" p={4} bg="brand.paper">
          {!product ? (
            <VStack p={6} spacing={3} align="stretch">
              <Skeleton height="28px" />
              <Skeleton height="200px" />
              <Skeleton height="28px" />
            </VStack>
          ) : (
            <VStack align="stretch" spacing={5}>
              <HStack justify="space-between">
                <HStack>
                  <ProductTypeBadgeIcon type={productType} />
                  <Heading size="md" color="brand.textLight" noOfLines={2}>{product.name}</Heading>
                </HStack>
                <Badge variant="outline" colorScheme="yellow" opacity={0.8}>{productType}</Badge>
              </HStack>

              <Tabs variant="enclosed" colorScheme="yellow" size="sm">
                <TabList>
                  <Tab>Options</Tab>
                  <Tab>Designs</Tab>
                  <Tab>Text</Tab>
                  <Tab>Calibrate</Tab>
                </TabList>
                <TabPanels>
                  {/* Options */}
                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={4}>
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
                          <Slider aria-label="zoom" value={zoom} min={0.5} max={2.5} step={0.1} onChange={setZoomSafe}>
                            <SliderTrack><SliderFilledTrack /></SliderTrack>
                            <SliderThumb />
                          </Slider>
                          <Tooltip label="Zoom in">
                            <Button size="xs" onClick={() => setZoomSafe(zoom + 0.1)} leftIcon={<FaSearchPlus />}>In</Button>
                          </Tooltip>
                        </HStack>
                      </VStack>

                      <Divider borderColor="whiteAlpha.300" />

                      <VStack align="stretch" spacing={2}>
                        <HStack>
                          <Checkbox isChecked={showGrid} onChange={(e) => setShowGrid(e.target.checked)}>Grid</Checkbox>
                          <Checkbox isChecked={showRulers} onChange={(e) => setShowRulers(e.target.checked)}>Rulers</Checkbox>
                        </HStack>
                        <HStack>
                          <Text fontSize="sm" color="whiteAlpha.800">Mockup opacity</Text>
                          <Slider value={mockupOpacity} min={0.2} max={1} step={0.05}
                                  onChange={(v)=>{ setMockupOpacity(v); refreshBackground(); }}>
                            <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                          </Slider>
                        </HStack>
                        <HStack>
                          <Text fontSize="sm" color="whiteAlpha.800">Mockup scale</Text>
                          <Slider value={mockupScale} min={0.8} max={1.3} step={0.01}
                                  onChange={(v)=>{ setMockupScale(v); refreshBackground(); }}>
                            <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                          </Slider>
                        </HStack>
                      </VStack>
                    </VStack>
                  </TabPanel>

                  {/* Designs */}
                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={3}>
                      <HStack>
                        <label htmlFor="file-up" style={{ width: "100%" }}>
                          <Button leftIcon={<FaUpload />} size="sm" as="span" w="full" variant="outline">
                            Upload PNG / JPG
                          </Button>
                        </label>
                        <input id="file-up" type="file" accept="image/*" style={{ display: "none" }}
                               onChange={(e)=> uploadImage(e.target.files?.[0]) } />
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

                  {/* Calibrate (align dashed box to mockup physically) */}
                  <TabPanel px={0}>
                    <VStack align="stretch" spacing={3}>
                      <Text color="brand.textLight" fontWeight="medium">Print Area Calibration</Text>
                      <Text fontSize="sm" color="whiteAlpha.800">
                        Use these to perfectly overlay the dashed print rectangle on the mockup.
                        These don’t affect the export size (that still uses the real inches at {DPI} DPI) —
                        they only ensure on-screen placement matches the garment.
                      </Text>
                      <HStack>
                        <Text fontSize="sm" w="110px" color="whiteAlpha.800">Scale</Text>
                        <Slider value={calScale} min={0.7} max={1.5} step={0.01}
                                onChange={(v)=>{ setCalScale(v); refreshBackground(); }}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                        </Slider>
                      </HStack>
                      <HStack>
                        <Text fontSize="sm" w="110px" color="whiteAlpha.800">X offset</Text>
                        <Slider value={calOffsetX} min={-200} max={200} step={1}
                                onChange={(v)=>{ setCalOffsetX(v); refreshBackground(); }}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                        </Slider>
                      </HStack>
                      <HStack>
                        <Text fontSize="sm" w="110px" color="whiteAlpha.800">Y offset</Text>
                        <Slider value={calOffsetY} min={-300} max={300} step={1}
                                onChange={(v)=>{ setCalOffsetY(v); refreshBackground(); }}>
                          <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
                        </Slider>
                      </HStack>
                      <HStack>
                        <Button size="sm" variant="outline" onClick={()=>{ setCalScale(1); setCalOffsetX(0); setCalOffsetY(0); refreshBackground(); }}>
                          Reset calibration
                        </Button>
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
                  We export a true print file at {DPI} DPI for the current placement.
                </Text>
              </VStack>
            </VStack>
          )}
        </Box>

        {/* CENTER: Canvas */}
        <Flex flex="1" direction="column" p={{ base: 3, md: 4 }}>
          <HStack mb={2} color="brand.textLight" justify="space-between" wrap="wrap" gap={2}>
            <HStack>
              <Tooltip label="Undo"><Button size="sm" onClick={undo} leftIcon={<FaUndo />}>Undo</Button></Tooltip>
              <Tooltip label="Redo"><Button size="sm" onClick={redo} leftIcon={<FaRedo />}>Redo</Button></Tooltip>
              <Tooltip label="Delete selected"><Button size="sm" onClick={del} colorScheme="red" variant="outline"><FaTrash /></Button></Tooltip>
            </HStack>
            <HStack>
              <Tooltip label="Align center in print area"><Button size="sm" onClick={alignCenter} variant="outline"><FaCrosshairs /></Button></Tooltip>
              <Tooltip label="Align top"><Button size="sm" onClick={alignTop} variant="outline"><FaArrowUp /></Button></Tooltip>
              <Tooltip label="Align bottom"><Button size="sm" onClick={alignBottom} variant="outline"><FaArrowDown /></Button></Tooltip>
              <Tooltip label="Center horizontally on canvas"><Button size="sm" onClick={centerH} variant="outline"><FaArrowsAltH /></Button></Tooltip>
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

        {/* RIGHT: Layers */}
        <Box w={{ base: "100%", xl: "260px" }} borderLeftWidth={{ xl: "1px" }} borderColor="whiteAlpha.200" p={4} bg="brand.paper">
          <HStack mb={2}>
            <FaLayerGroup />
            <Heading size="sm" color="brand.textLight">Layers</Heading>
          </HStack>
          <VStack align="stretch" spacing={2} maxH="calc(100vh - 140px)" overflowY="auto">
            {layerObjects().length === 0 ? (
              <Text color="whiteAlpha.700" fontSize="sm">No layers yet.</Text>
            ) : (
              layerObjects().map((o, idx) => (
                <HStack
                  key={o.__uid || o.id || idx}
                  p={2}
                  borderWidth="1px"
                  rounded="md"
                  bg={o === fabricRef.current?.getActiveObject() ? "whiteAlpha.200" : "transparent"}
                  cursor="pointer"
                  onClick={() => selectLayer(idx)}
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  <Icon as={o.type === "i-text" ? FaRegObjectUngroup : FaRegSquare} />
                  <Text fontSize="sm" noOfLines={1} flex="1">
                    {o.type === "i-text" ? `"${o.text?.slice(0, 20) || "Text"}"` : "Image"}
                  </Text>
                </HStack>
              ))
            )}
          </VStack>
          <HStack mt={3} justify="space-between">
            <Button size="xs" variant="outline" onClick={bringForward}>Bring forward</Button>
            <Button size="xs" variant="outline" onClick={sendBackward}>Send backward</Button>
          </HStack>
        </Box>
      </Flex>
    </Flex>
  );
}
