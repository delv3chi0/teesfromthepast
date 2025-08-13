// frontend/src/pages/ProductStudio.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  IconButton,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  AspectRatio,
  Image,
  useToast,
  Divider,
  Badge,
} from "@chakra-ui/react";
import {
  FaUndo,
  FaRedo,
  FaTrash,
  FaArrowsAltH,
  FaLock,
  FaLockOpen,
  FaEye,
  FaEyeSlash,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";
import "../styles/productstudio.css";

// Robust mockups import (default or named export)
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_MOD?.default ?? MOCKUPS_MOD?.MOCKUPS ?? {});

// ---------------------------------------------
// Constants
// ---------------------------------------------
const DPI = 300;             // output DPI target
const CANVAS_ASPECT = 2 / 3; // main stage aspect (tall)
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

const COLOR_ORDER = [
  "black", "maroon", "red", "orange", "gold", "lime",
  "tropical blue", "royal", "purple", "charcoal", "ash", "sport_grey", "white"
];
const COLOR_SWATCHES = {
  black: "#000000",
  maroon: "#800000",
  red: "#D32F2F",
  orange: "#F57C00",
  gold: "#D4AF37",
  lime: "#9CCC65",
  "tropical blue": "#1CA3EC",
  royal: "#1E40AF",
  purple: "#6B21A8",
  charcoal: "#36454F",
  ash: "#B2BEB5",
  sport_grey: "#B5B8B1",
  white: "#FFFFFF",
};

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "sleeve"],
  hoodie: ["front", "back"],
  tote:   ["front", "back"],
  hat:    ["front"],
  beanie: ["front"],
};

// ------------------------------------------------------------
// Placement templates (fractions of the canvas W/H).
// This keeps mockup + print area perfectly repeatable.
// ------------------------------------------------------------
const PLACEMENTS = {
  tshirt: {
    mockup: { w: 0.62, top: 0.08, left: 0.19 },
    front:  { x: 0.29, y: 0.23, w: 0.32, h: 0.42 },
    back:   { x: 0.29, y: 0.23, w: 0.32, h: 0.42 },
    sleeve: { x: 0.62, y: 0.38, w: 0.12, h: 0.12 },
  },
  hoodie: {
    mockup: { w: 0.62, top: 0.09, left: 0.19 },
    front:  { x: 0.31, y: 0.27, w: 0.28, h: 0.34 },
    back:   { x: 0.30, y: 0.24, w: 0.30, h: 0.40 },
  },
  tote: {
    mockup: { w: 0.55, top: 0.10, left: 0.225 },
    front:  { x: 0.34, y: 0.26, w: 0.32, h: 0.38 },
    back:   { x: 0.34, y: 0.26, w: 0.32, h: 0.38 },
  },
  hat: {
    mockup: { w: 0.48, top: 0.12, left: 0.26 },
    front:  { x: 0.43, y: 0.33, w: 0.14, h: 0.06 },
  },
  beanie: {
    mockup: { w: 0.48, top: 0.14, left: 0.26 },
    front:  { x: 0.40, y: 0.36, w: 0.20, h: 0.06 },
  },
};

// Helpers
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug  = (p) => norm(p?.slug || p?.name || "");
const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};
const detectProductType = (product) => {
  const text = `${product?.type || product?.category || ""} ${product?.name || ""}`.toLowerCase();
  if (/(tee|t-shirt|shirt|unisex)/.test(text)) return "tshirt";
  if (/(hoodie|sweatshirt)/.test(text)) return "hoodie";
  if (/(tote|bag)/.test(text)) return "tote";
  if (/(hat|cap|trucker|snapback)/.test(text)) return "hat";
  if (/(beanie|knit)/.test(text)) return "beanie";
  return "tshirt";
};

function ProductTypeBadgeIcon({ type }) {
  return (
    <Badge colorScheme="yellow" variant="outline" borderRadius="sm" ml={2}>
      {String(type || "").toUpperCase()}
    </Badge>
  );
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
  const [color, setColor] = useState(colorParam || "black");
  const [size, setSize]   = useState(sizeParam || "");

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [gridOn, setGridOn] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);
  const [layersOpen, setLayersOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Load product
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (cancelled) return;
        const p = res.data;
        setProduct(p);

        // Default color (prefer black)
        const colorSet = new Set();
        (p?.variants || []).forEach(v => v.color && colorSet.add(v.color.toLowerCase()));
        (p?.colors || []).forEach(c => colorSet.add(c.toLowerCase()));
        const colors = [...colorSet];
        if (!colorParam) {
          if (colors.includes("black")) setColor("black");
          else if (colors.length) setColor(colors[0]);
        }

        if (!sizeParam) {
          const sizeSet = new Set();
          (p?.variants || []).forEach(v => v.size && sizeSet.add(v.size));
          const first = [...sizeSet][0];
          if (first) setSize(first);
        }
        if (!availableViews.includes(view)) setView(availableViews[0] || "front");
      } catch (e) {
        console.error(e);
        toast({ title: "Could not load product", status: "error" });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  // Load designs
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

  // Canvas init & resize
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    if (!fabricRef.current) {
      const parentW = wrapRef.current.clientWidth;
      const h = Math.round(parentW / CANVAS_ASPECT);

      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: parentW,
        height: h,
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = fc;

      fc.on("selection:created", () => setActiveId(fc.getActiveObject()?._layerId || null));
      fc.on("selection:updated", () => setActiveId(fc.getActiveObject()?._layerId || null));
      fc.on("selection:cleared", () => setActiveId(null));

      const ro = new ResizeObserver(() => {
        if (!fabricRef.current || !wrapRef.current) return;
        const W = wrapRef.current.clientWidth;
        const H = Math.round(W / CANVAS_ASPECT);
        fabricRef.current.setWidth(W);
        fabricRef.current.setHeight(H);
        refreshBackground();
      });
      ro.observe(wrapRef.current);
    }

    refreshBackground();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // History helpers
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["_layerId","id"])));
    if (undoStack.current.length > 60) undoStack.current.shift();
  }, []);
  const applyJSON = (json) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll(), (_o,obj) => obj);
  };
  const undo = () => {
    const fc = fabricRef.current; if (!fc || undoStack.current.length===0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["_layerId","id"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };
  const redo = () => {
    const fc = fabricRef.current; if (!fc || redoStack.current.length===0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["_layerId","id"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  // Mockup selection
  const pickMockupUrl = (product, view, color) => {
    const slugKey  = normSlug(product) || norm(slugParam);
    const colorKey = normColor(color);
    const fromMap = MOCKUPS?.[slugKey]?.[colorKey]?.[view];
    if (fromMap) return fromMap;

    const variants = product?.variants || [];
    const variant =
      variants.find(v => v.color?.toLowerCase() === color?.toLowerCase() || v.colorName?.toLowerCase() === color?.toLowerCase()) ||
      variants[0];

    const chooseFile = (files=[]) => {
      const pref = (t) => files.find(f => f?.type===t && (f.preview_url||f.url||f.thumbnail_url));
      const f = pref("preview") || pref("mockup") || files[0];
      return f?.preview_url || f?.url || f?.thumbnail_url || null;
    };

    if (variant?.imageSet?.length) {
      const primary = variant.imageSet.find(i=>i.isPrimary) || variant.imageSet[0];
      if (primary?.url) return primary.url;
    }
    if (variant?.files?.length) {
      const f = chooseFile(variant.files);
      if (f) return f;
    }
    if (product?.images?.length) {
      const pimg = product.images.find(i=>i.isPrimary) || product.images[0];
      if (pimg?.url) return pimg.url;
      if (typeof product.images[0] === "string") return product.images[0];
    }
    if (variant?.image) return variant.image;
    if (product?.image)  return product.image;
    return PLACEHOLDER;
  };

  // Refresh background + print area using templates
  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current; if (!fc || !product) return;

    const userObjs = fc.getObjects().filter(o => o.id !== "printArea");
    fc.clear();
    userObjs.forEach(o => fc.add(o));

    const tpl = PLACEMENTS[productType] || PLACEMENTS.tshirt;
    const mockCfg = tpl.mockup;
    const url = pickMockupUrl(product, view, color) || PLACEHOLDER;

    window.fabric.Image.fromURL(url, (img) => {
      const W = fc.getWidth();
      const H = fc.getHeight();
      const scale = (mockCfg.w * W) / img.width;

      img.set({
        left: mockCfg.left * W,
        top:  mockCfg.top  * H,
        originX: "left",
        originY: "top",
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        opacity: mockupOpacity,
        id: "mockupBG",
      });
      fc.setBackgroundImage(img, fc.renderAll.bind(fc));

      const area = tpl[view] || tpl.front;
      const rect = new window.fabric.Rect({
        id: "printArea",
        left:  area.x * W,
        top:   area.y * H,
        width: area.w * W,
        height:area.h * H,
        originX: "left",
        originY: "top",
        fill: "rgba(0,0,0,0)",
        stroke: "#FFFFFF",
        strokeDashArray: [6, 6],
        strokeWidth: 2,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
      });
      fc.add(rect);
      fc.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  }, [product, view, color, mockupOpacity, productType]);

  useEffect(() => {
    if (!product) return;
    refreshBackground();
  }, [refreshBackground, product, view, color]);

  // Snap + clamp inside print area
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const SNAP = 8;

    const constrain = () => {
      const area = fc.getObjects().find(o => o.id === "printArea");
      if (!area) return;
      const a = area.getBoundingRect(true,true);

      const objs = fc.getObjects().filter(o => o.id !== "printArea");
      objs.forEach(o => {
        const bb = o.getBoundingRect(true,true);

        if (bb.left < a.left) o.left += a.left - bb.left;
        if (bb.top  < a.top)  o.top  += a.top  - bb.top;
        if (bb.left + bb.width > a.left + a.width)
          o.left -= bb.left + bb.width - (a.left + a.width);
        if (bb.top + bb.height > a.top + a.height)
          o.top  -= bb.top  + bb.height - (a.top  + a.height);

        const cx = a.left + a.width/2;
        const cy = a.top  + a.height/2;
        const ocx = bb.left + bb.width/2;
        const ocy = bb.top  + bb.height/2;

        if (Math.abs(ocx - cx) < SNAP) o.left += cx - ocx;
        if (Math.abs(ocy - cy) < SNAP) o.top  += cy - ocy;

        o.setCoords();
      });
      fc.requestRenderAll();
    };

    fc.on("object:moving",  constrain);
    fc.on("object:scaling", constrain);
    fc.on("object:rotating",constrain);
    return () => {
      fc.off("object:moving",  constrain);
      fc.off("object:scaling", constrain);
      fc.off("object:rotating",constrain);
    };
  }, [view, productType]);

  // Canvas actions
  const setZoomSafe = (v) => {
    const fc = fabricRef.current; if (!fc) return;
    const z = Math.min(2, Math.max(0.6, v));
    setZoom(z);
    fc.setZoom(z);
    fc.requestRenderAll();
  };

  const addText = () => {
    const fc = fabricRef.current; if (!fc) return;
    const t = new window.fabric.IText("Your text", {
      left: fc.getWidth()*0.5, top: fc.getHeight()*0.5,
      originX: "center", originY: "center",
      fill: "#ffffff", fontSize: 42
    });
    t._layerId = `layer_${Date.now()}`;
    pushHistory();
    fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
  };

  const addDesign = (d) => {
    const fc = fabricRef.current; if (!fc || !d?.imageDataUrl) return;
    window.fabric.Image.fromURL(d.imageDataUrl, (img) => {
      img.set({
        left: fc.getWidth()*0.5, top: fc.getHeight()*0.5,
        originX: "center", originY: "center",
        scaleX: 0.5, scaleY: 0.5
      });
      img._layerId = `layer_${Date.now()}`;
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };

  const del = () => {
    const fc = fabricRef.current; if (!fc) return;
    const a = fc.getActiveObject();
    if (!a || a.id === "printArea") return;
    pushHistory();
    fc.remove(a); fc.discardActiveObject(); fc.requestRenderAll();
  };

  const centerHoriz = () => {
    const fc = fabricRef.current; if (!fc) return;
    const a = fc.getActiveObject(); if (!a || a.id==="printArea") return;
    const area = fc.getObjects().find(o=>o.id==="printArea"); if (!area) return;
    const aBB = area.getBoundingRect(true,true);
    a.left = aBB.left + aBB.width/2 - (a.getBoundingRect(true,true).width/2 - (a.left - a.oCoords?.tl?.x || 0)); // safe-ish center in area
    fc.requestRenderAll();
  };

  // Export high-res
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;

    const area = fc.getObjects().find(o => o.id==="printArea");
    if (!area) return toast({ title:"No print area defined", status:"error" });

    const objs = fc.getObjects().filter(o => o.id !== "printArea");
    if (!objs.length) return toast({ title:"Nothing to print", status:"warning" });

    const tpl = PLACEMENTS[productType] || PLACEMENTS.tshirt;
    const areaFrac = tpl[view] || tpl.front;

    const outW = Math.round(areaFrac.w * fc.getWidth()  * (DPI/96));
    const outH = Math.round(areaFrac.h * fc.getHeight() * (DPI/96));

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true,true);
    const scaleFactor = outW / aBB.width;

    objs.forEach(o => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true,true);
      const relX = bb.left - aBB.left + bb.width/2;
      const relY = bb.top  - aBB.top  + bb.height/2;

      clone.originX = "center"; clone.originY = "center";
      clone.left = relX * scaleFactor; clone.top = relY * scaleFactor;
      clone.scaleX = o.scaleX * scaleFactor; clone.scaleY = o.scaleY * scaleFactor;
      if (clone.type === "i-text") clone.fontSize = (o.fontSize || 42) * scaleFactor;

      tmp.add(clone);
    });
    tmp.requestRenderAll();

    const png = tmp.toDataURL({ format:"png", quality:1, multiplier:1 });
    tmp.dispose();
    const previewPNG = fc.toDataURL({ format:"png", quality:0.92 });

    toast({ title:"Uploading design…", status:"info", duration:2500 });
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
      toast({ title:"Upload failed", status:"error" });
    }
  };

  // Derived color/size lists
  const colorOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => v.color && set.add(v.color.toLowerCase()));
    (product?.colors || []).forEach(c => set.add(c.toLowerCase()));
    const arr = [...set];
    const known   = arr.filter(c => COLOR_ORDER.includes(c));
    const unknown = arr.filter(c => !COLOR_ORDER.includes(c));
    return [...COLOR_ORDER.filter(c => known.includes(c)), ...unknown];
  }, [product]);

  const sizeOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => {
      if (!color || v.color?.toLowerCase() === color?.toLowerCase())
        v.size && set.add(v.size);
    });
    return [...set];
  }, [product, color]);

  const canCheckout =
    product &&
    (!colorOptions.length || color) &&
    (!sizeOptions.length || size) &&
    fabricRef.current &&
    fabricRef.current.getObjects().filter(o => o.id !== "printArea").length > 0;

  // Layers helpers
  const getLayerList = () => {
    const fc = fabricRef.current; if (!fc) return [];
    return fc.getObjects()
      .filter(o => o.id !== "printArea")
      .map((o,idx) => ({
        id: o._layerId || `layer_${idx}`,
        obj: o,
        label: (o.type || "object").toUpperCase(),
        visible: o.visible !== false,
        locked: !!o.lockMovementX || !!o.lockMovementY,
      }));
  };
  const toggleVisible = (id) => {
    const fc = fabricRef.current; if (!fc) return;
    const l = getLayerList().find(x => x.id===id); if (!l) return;
    l.obj.visible = !l.obj.visible; fc.requestRenderAll();
  };
  const toggleLock = (id) => {
    const fc = fabricRef.current; if (!fc) return;
    const l = getLayerList().find(x => x.id===id); if (!l) return;
    const locked = !(l.obj.lockMovementX && l.obj.lockMovementY);
    l.obj.lockMovementX = locked; l.obj.lockMovementY = locked;
    l.obj.hasControls = !locked; l.obj.selectable = !locked;
    fc.requestRenderAll();
  };
  const bringFwd = (id) => { const fc=fabricRef.current; if(!fc) return;
    const l=getLayerList().find(x=>x.id===id); if(!l) return; fc.bringForward(l.obj); fc.requestRenderAll(); };
  const sendBack = (id) => { const fc=fabricRef.current; if(!fc) return;
    const l=getLayerList().find(x=>x.id===id); if(!l) return; fc.sendBackwards(l.obj); fc.requestRenderAll(); };

  return (
    <Box className="ps-root" bg="brand.primary">
      {/* LEFT */}
      <Box className="ps-left">
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <HStack>
              <Heading size="md" color="brand.textLight">
                {product?.name || "Product"}
              </Heading>
              <ProductTypeBadgeIcon type={productType} />
            </HStack>
          </HStack>

          <Tabs size="sm" variant="enclosed" colorScheme="yellow">
            <TabList>
              <Tab>Options</Tab>
              <Tab>Designs</Tab>
              <Tab>Text</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  {/* View */}
                  <Box>
                    <Text className="ps-label">View</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {(availableViews || ["front"]).map(v => (
                        <Button
                          key={v}
                          size="xs"
                          variant={view===v?"solid":"outline"}
                          onClick={() => setView(v)}
                        >
                          {v}
                        </Button>
                      ))}
                    </HStack>
                  </Box>

                  {/* Color dots */}
                  <Box>
                    <Text className="ps-label">Color</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {colorOptions.length ? (
                        colorOptions.map((c) => {
                          const key = c.toLowerCase();
                          const hex = COLOR_SWATCHES[key] || "#ccc";
                          const isSel = key === String(color||"").toLowerCase();
                          return (
                            <Tooltip key={c} label={c}>
                              <Box
                                onClick={() => setColor(c)}
                                borderRadius="full"
                                boxSize="16px"
                                borderWidth={isSel ? "2px" : "1px"}
                                borderColor={isSel ? "yellow.400" : "blackAlpha.600"}
                                background={hex}
                                cursor="pointer"
                              />
                            </Tooltip>
                          );
                        })
                      ) : <Badge>No colors</Badge>}
                    </HStack>
                  </Box>

                  {/* Size */}
                  <Box>
                    <Text className="ps-label">Size</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {sizeOptions.length ? (
                        sizeOptions.map(s => (
                          <Button
                            key={s}
                            size="xs"
                            variant={size===s?"solid":"outline"}
                            onClick={() => setSize(s)}
                          >
                            {s}
                          </Button>
                        ))
                      ) : <Badge>No size options</Badge>}
                    </HStack>
                  </Box>

                  {/* Zoom + grid */}
                  <Box>
                    <Text className="ps-label">Zoom</Text>
                    <HStack>
                      <Button size="xs" onClick={() => setZoomSafe(zoom-0.1)}>−</Button>
                      <Text fontSize="sm" color="whiteAlpha.800">{zoom.toFixed(2)}x</Text>
                      <Button size="xs" onClick={() => setZoomSafe(zoom+0.1)}>+</Button>
                      <Button size="xs" variant="outline" onClick={() => setGridOn(v=>!v)}>
                        {gridOn ? "Hide grid" : "Show grid"}
                      </Button>
                    </HStack>
                  </Box>

                  {/* Mockup opacity */}
                  <Box>
                    <Text className="ps-label">Mockup opacity</Text>
                    <input
                      type="range"
                      min="0.2" max="1" step="0.05"
                      value={mockupOpacity}
                      onChange={(e)=>setMockupOpacity(parseFloat(e.target.value))}
                      onMouseUp={refreshBackground}
                      onTouchEnd={refreshBackground}
                      className="ps-range"
                    />
                  </Box>

                  <Divider borderColor="whiteAlpha.300" />
                  <Button
                    size="sm"
                    colorScheme={canCheckout ? "yellow" : "gray"}
                    isDisabled={!canCheckout}
                    onClick={makePrintReadyAndUpload}
                  >
                    Add to cart / Checkout
                  </Button>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    We export a true print file at {DPI} DPI sized to the selected placement.
                  </Text>
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  {loadingDesigns ? (
                    <Text color="whiteAlpha.800">Loading designs…</Text>
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
                            _hover={{ borderColor: "purple.400" }}
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
                    <Text color="whiteAlpha.800" fontSize="sm">
                      No saved designs yet. Create one in “Generate”.
                    </Text>
                  )}
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Button onClick={addText} size="sm" colorScheme="teal">
                    Add Text
                  </Button>
                  <Text fontSize="sm" color="whiteAlpha.800">
                    (Use Fabric controls on the canvas to edit text.)
                  </Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Quick actions */}
          <HStack pt={1}>
            <Tooltip label="Undo"><IconButton size="sm" onClick={undo} icon={<FaUndo />} /></Tooltip>
            <Tooltip label="Redo"><IconButton size="sm" onClick={redo} icon={<FaRedo />} /></Tooltip>
            <Tooltip label="Delete selected"><IconButton size="sm" onClick={del} colorScheme="red" variant="outline" icon={<FaTrash />} /></Tooltip>
            <Tooltip label="Center horizontally"><IconButton size="sm" onClick={centerHoriz} icon={<FaArrowsAltH />} /></Tooltip>
          </HStack>
        </VStack>
      </Box>

      {/* CENTER */}
      <Box className={`ps-center`}>
        <Box
          ref={wrapRef}
          className={`ps-canvas-wrap ${gridOn ? "ps-grid" : ""}`}
        >
          <canvas ref={canvasRef} className="ps-canvas" />
        </Box>
      </Box>

      {/* RIGHT: Layers */}
      <Box className={`ps-right ${layersOpen ? "" : "collapsed"}`}>
        <HStack justify="space-between" px={3} py={2}>
          <Heading size="sm" color="brand.textLight">Layers</Heading>
          <IconButton
            aria-label="toggle layers"
            size="xs"
            onClick={() => setLayersOpen(v => !v)}
            icon={layersOpen ? <FaChevronRight /> : <FaChevronLeft />}
          />
        </HStack>
        <Divider borderColor="whiteAlpha.300" mb={1} />
        <VStack align="stretch" spacing={1} px={2} className="ps-layers">
          {getLayerList().map((l) => (
            <HStack
              key={l.id}
              className={`ps-layer ${activeId===l.id ? "active" : ""}`}
              onClick={() => {
                const fc = fabricRef.current; if (!fc) return;
                fc.setActiveObject(l.obj); fc.requestRenderAll(); setActiveId(l.id);
              }}
            >
              <Text className="ps-layer-label" noOfLines={1}>{l.label}</Text>
              <HStack ml="auto" spacing={1}>
                <IconButton
                  aria-label="visible" size="xs" variant="ghost"
                  icon={l.visible ? <FaEye/> : <FaEyeSlash/>}
                  onClick={(e)=>{e.stopPropagation(); toggleVisible(l.id);}}
                />
                <IconButton
                  aria-label="lock" size="xs" variant="ghost"
                  icon={l.locked ? <FaLock/> : <FaLockOpen/>}
                  onClick={(e)=>{e.stopPropagation(); toggleLock(l.id);}}
                />
                <IconButton aria-label="up" size="xs" variant="ghost" icon={<FaChevronUp/>}
                  onClick={(e)=>{e.stopPropagation(); bringFwd(l.id);}} />
                <IconButton aria-label="down" size="xs" variant="ghost" icon={<FaChevronDown/>}
                  onClick={(e)=>{e.stopPropagation(); sendBack(l.id);}} />
              </HStack>
            </HStack>
          ))}
          {!getLayerList().length && (
            <Text color="whiteAlpha.700" fontSize="xs" px={2} py={3}>
              Click a layer on canvas to select &amp; re-order. Add an image or text to get started.
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
