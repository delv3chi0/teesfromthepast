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
  Switch,
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
  FaSearchMinus,
  FaSearchPlus,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";
import "../styles/productstudio.css";

// Optional mockups mapping (default or named export)
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_MOD?.default ?? MOCKUPS_MOD?.MOCKUPS ?? {});

// Relative areas + physical sizes for export
import AREAS, { PRINT_SIZE_IN } from "../data/printAreas.js";

// -----------------------------
// Constants
// -----------------------------
const DPI = 300;             // print export DPI
const CANVAS_ASPECT = 2 / 3; // tall stage
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Your local public path (served by dev server / production)
// You already have: /public/mockups/classic-tee/...
const LOCAL_MOCKUP_BASE = "/mockups/classic-tee";

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
  tshirt: ["front", "back", "left", "right"], // sleeve views added
  hoodie: ["front", "back"],
  tote:   ["front", "back"],
  hat:    ["front"],
  beanie: ["front"],
};

// -----------------------------
// Helpers
// -----------------------------
const norm = (s) => String(s || "").trim().toLowerCase();
const normSlug = (p) => norm(p?.slug || p?.name || "").replace(/\s+/g, "-");
const normColorKey = (c) => norm(c).replace(/[_-]+/g, " ").replace(/\s+/g, " ");

const colorAliases = {
  "royal blue": "royal",
  tropical: "tropical blue",
  gray: "ash", // map gray-ish to a known key if needed
};
const toFolderColor = (c) => {
  const key = normColorKey(c);
  const alias = colorAliases[key] || key;
  return alias.replace(/\s+/g, "-"); // "military green" -> "military-green"
};

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

// -----------------------------
// Component
// -----------------------------
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
  const [rulersOn, setRulersOn] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);
  const [layersOpen, setLayersOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const rulerGroupRef = useRef(null);
  const overlayGridImgRef = useRef(null);

  // -----------------------------
  // Data fetch
  // -----------------------------
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
        const setC = new Set();
        (p?.variants || []).forEach(v => v.color && setC.add(normColorKey(v.color)));
        (p?.colors || []).forEach(c => c && setC.add(normColorKey(c)));
        if (!colorParam) {
          setColor(setC.has("black") ? "black" : (Array.from(setC)[0] || "black"));
        }

        // Default size
        if (!sizeParam) {
          const setS = new Set();
          (p?.variants || []).forEach(v => v.size && setS.add(v.size));
          const firstS = Array.from(setS)[0];
          if (firstS) setSize(firstS);
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

  // -----------------------------
  // Fabric init & resize
  // -----------------------------
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

      // keyboard delete
      document.addEventListener("keydown", (e) => {
        if (e.key === "Delete" || e.key === "Backspace") del();
      });

      const ro = new ResizeObserver(() => {
        if (!fabricRef.current || !wrapRef.current) return;
        const W = wrapRef.current.clientWidth;
        const H = Math.round(W / CANVAS_ASPECT);
        fabricRef.current.setWidth(W);
        fabricRef.current.setHeight(H);
        refreshScene();
      });
      ro.observe(wrapRef.current);
    }

    refreshScene();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------
  // History helpers
  // -----------------------------
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

  // -----------------------------
  // Mockup selection (local-first with fallback)
  // -----------------------------
  function pickMockupUrlLocalFirst(p, v, c) {
    // Try local file first
    if (c && v) {
      const dir = `tee-${toFolderColor(c)}`;
      const localUrl = `${LOCAL_MOCKUP_BASE}/${dir}/${v}.png`;
      return localUrl; // we'll preflight and fallback if 404
    }

    // Fallbacks (mapping/variant/product)
    return pickMockupUrlFallback(p, v, c);
  }

  function pickMockupUrlFallback(p, v, c) {
    const slugKey = normSlug(p) || norm(slugParam);
    const colorKey = normColorKey(c).replace(/\s+/g, "-");
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[v];
    if (bySlug) return bySlug;

    const variants = p?.variants || [];
    const variant =
      variants.find(x => normColorKey(x.color) === normColorKey(c)) || variants[0];

    const tryCloudinary = (arr=[]) =>
      arr.find(u => typeof u === "string" && /cloudinary/.test(u) && new RegExp(`${v}`, "i").test(u));

    if (variant?.imageSet?.length) {
      const exact = tryCloudinary(variant.imageSet.map(i => i.url));
      if (exact) return exact;
      const primary = variant.imageSet.find(i => i.isPrimary) || variant.imageSet[0];
      if (primary?.url) return primary.url;
    }
    const pickFromFiles = (files=[]) => {
      const pref = (t) => files.find(f => f?.type===t && (f.preview_url||f.url||f.thumbnail_url));
      const f = pref("preview") || pref("mockup") || files[0];
      return f?.preview_url || f?.url || f?.thumbnail_url || null;
    };
    if (variant?.files?.length) {
      const chosen = pickFromFiles(variant.files);
      if (chosen) return chosen;
    }
    if (p?.images?.length) {
      const exact = tryCloudinary(p.images.map(i => i.url || i));
      if (exact) return exact;
      const pimg = p.images.find(i => i.isPrimary) || p.images[0];
      if (pimg?.url) return pimg.url;
      if (typeof p.images[0] === "string") return p.images[0];
    }
    if (variant?.image) return variant.image;
    if (p?.image) return p.image;
    return PLACEHOLDER;
  }

  function preflight(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // -----------------------------
  // Grid + Rulers overlays
  // -----------------------------
  const applyGridOverlay = useCallback((fc) => {
    const size = 32;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${fc.width}" height="${fc.height}">
        <defs>
          <pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
            <path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#p)"/>
      </svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    window.fabric.Image.fromURL(
      dataUrl,
      (gridImg) => {
        gridImg.set({
          id: "gridOverlay",
          selectable: false,
          evented: false,
          opacity: gridOn ? 1 : 0,
          top: 0,
          left: 0,
          originX: "left",
          originY: "top",
        });
        overlayGridImgRef.current = gridImg;
        fc.setOverlayImage(gridImg, fc.renderAll.bind(fc));
      },
      { crossOrigin: "anonymous" }
    );
  }, [gridOn]);

  const applyRulers = useCallback((fc) => {
    if (rulerGroupRef.current) {
      fc.remove(rulerGroupRef.current);
      rulerGroupRef.current = null;
    }
    if (!rulersOn) { fc.renderAll(); return; }

    const g = new window.fabric.Group([], {
      id: "rulers",
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });

    const pad = 0;
    const lenTop = fc.width;
    const lenLeft = fc.height;

    // Use inches: 300dpi basis, but visually scale down by factor 3 like print box
    const pxPerIn = (DPI * 1) / 3;

    for (let x = 0; x <= lenTop; x += pxPerIn) {
      const isMajor = Math.round(x / pxPerIn) % 1 === 0;
      const h = isMajor ? 12 : 6;
      g.add(new window.fabric.Line([x, 0, x, h], { stroke: "rgba(255,255,255,.35)" }));
      if (isMajor) {
        g.add(new window.fabric.Text(`${Math.round(x / pxPerIn)}"`, {
          left: x + 2, top: h + 2, fontSize: 10, fill: "#fff", selectable: false, evented: false
        }));
      }
    }
    g.add(new window.fabric.Line([0, 0, lenTop, 0], { stroke: "rgba(255,255,255,.35)" }));

    for (let y = 0; y <= lenLeft; y += pxPerIn) {
      const isMajor = Math.round(y / pxPerIn) % 1 === 0;
      const w = isMajor ? 12 : 6;
      g.add(new window.fabric.Line([0, y, w, y], { stroke: "rgba(255,255,255,.35)" }));
      if (isMajor) {
        g.add(new window.fabric.Text(`${Math.round(y / pxPerIn)}"`, {
          left: w + 2, top: y + 2, fontSize: 10, fill: "#fff", selectable: false, evented: false
        }));
      }
    }
    g.add(new window.fabric.Line([0, 0, 0, lenLeft], { stroke: "rgba(255,255,255,.35)" }));

    rulerGroupRef.current = g;
    fc.add(g);
    fc.sendToBack(g);
    fc.renderAll();
  }, [rulersOn]);

  // -----------------------------
  // Draw print area based on AREAS (relative to mockup bounds)
  // -----------------------------
  function getMockupBounds(fc) {
    const bg = fc.backgroundImage;
    if (!bg) return { left: 0, top: 0, w: fc.width, h: fc.height };
    const w = bg.getScaledWidth();
    const h = bg.getScaledHeight();
    const left = (fc.width / 2) - (w / 2);
    const top  = 0; // top-pinned
    return { left, top, w, h };
  }

  const drawPrintArea = useCallback((fc) => {
    const old = fc.getObjects().find(o => o.id === "printArea");
    if (old) fc.remove(old);

    const cfg = AREAS[productType]?.[view] || AREAS.tshirt.front;
    const mock = getMockupBounds(fc);

    const left = mock.left + cfg.left * mock.w;
    const top  = mock.top  + cfg.top  * mock.h;
    const w    = cfg.width  * mock.w;
    const h    = cfg.height * mock.h;

    const rect = new window.fabric.Rect({
      id: "printArea",
      left: left + w / 2,
      top,
      width: w,
      height: h,
      originX: "center",
      originY: "top",
      fill: "",
      stroke: "white",
      strokeDashArray: [6, 6],
      strokeWidth: 2,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    fc.add(rect);
    fc.renderAll();
  }, [productType, view]);

  // -----------------------------
  // Full scene refresh
  // -----------------------------
  const refreshScene = useCallback(async () => {
    const fc = fabricRef.current; if (!fc || !product) return;

    // keep user objects
    const keep = fc.getObjects().filter(o => !["printArea","gridOverlay","rulers"].includes(o.id));
    fc.clear();
    keep.forEach(o => fc.add(o));

    // Choose image with local-first fallback
    const primary = pickMockupUrlLocalFirst(product, view, color);
    let chosen = primary;
    const ok = await preflight(primary);
    if (!ok) chosen = pickMockupUrlFallback(product, view, color);

    window.fabric.Image.fromURL(
      chosen || PLACEHOLDER,
      (img) => {
        const scale = fc.height / img.height; // fit to height
        fc.setBackgroundImage(img, () => {
          img.set({
            opacity: mockupOpacity,
            scaleX: scale,
            scaleY: scale,
            top: 0,
            left: fc.width / 2,
            originX: "center",
            originY: "top",
            selectable: false,
            evented: false,
          });
          applyGridOverlay(fc);
          applyRulers(fc);
          drawPrintArea(fc);
          fc.renderAll();
        });
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, view, color, mockupOpacity, applyGridOverlay, applyRulers, drawPrintArea]);

  useEffect(() => { if (product && fabricRef.current) refreshScene(); }, [product, refreshScene]);

  // -----------------------------
  // Snap + constrain to print area
  // -----------------------------
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const SNAP = 8;

    const onMove = () => {
      const area = fc.getObjects().find(o => o.id === "printArea");
      if (!area) return;
      const a = area.getBoundingRect(true, true);
      const objs = fc.getObjects().filter(o => !["printArea","gridOverlay","rulers"].includes(o.id));

      objs.forEach((o) => {
        const bb = o.getBoundingRect(true, true);
        // keep inside
        if (bb.left < a.left) o.left += a.left - bb.left;
        if (bb.top  < a.top)  o.top  += a.top  - bb.top;
        if (bb.left + bb.width > a.left + a.width) o.left -= bb.left + bb.width - (a.left + a.width);
        if (bb.top  + bb.height > a.top  + a.height) o.top  -= bb.top  + bb.height - (a.top  + a.height);

        // snap to center/edges
        const cx = a.left + a.width/2, cy = a.top + a.height/2;
        const ocx = bb.left + bb.width/2, ocy = bb.top + bb.height/2;
        if (Math.abs(ocx - cx) <= SNAP) o.left += (cx - ocx);
        if (Math.abs(ocy - cy) <= SNAP) o.top  += (cy - ocy);

        const r = o.left + o.width * o.scaleX;
        const b = o.top  + o.height * o.scaleY;
        if (Math.abs(o.left - a.left) <= SNAP) o.left = a.left;
        if (Math.abs(o.top  - a.top)  <= SNAP) o.top  = a.top;
        if (Math.abs(r - (a.left + a.width)) <= SNAP) o.left = (a.left + a.width) - o.width * o.scaleX;
        if (Math.abs(b - (a.top + a.height)) <= SNAP) o.top  = (a.top + a.height) - o.height * o.scaleY;

        o.setCoords();
      });
      fc.requestRenderAll();
    };

    fc.on("object:moving", onMove);
    fc.on("object:scaling", onMove);
    fc.on("object:rotating", onMove);
    return () => {
      fc.off("object:moving", onMove);
      fc.off("object:scaling", onMove);
      fc.off("object:rotating", onMove);
    };
  }, [view, productType]);

  // -----------------------------
  // Canvas actions
  // -----------------------------
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
    if (!a || ["printArea","gridOverlay","rulers"].includes(a.id)) return;
    pushHistory();
    fc.remove(a); fc.discardActiveObject(); fc.requestRenderAll();
  };

  const centerHoriz = () => {
    const fc = fabricRef.current; if (!fc) return;
    const a = fc.getActiveObject(); if (!a || a.id==="printArea") return;
    const area = fc.getObjects().find(o=>o.id==="printArea"); if (!area) return;
    const aBB = area.getBoundingRect(true,true);
    const bb = a.getBoundingRect(true,true);
    a.left = aBB.left + (aBB.width - bb.width)/2 + (a.left - bb.left);
    fc.requestRenderAll();
  };

  // -----------------------------
  // Export (DPI-true to PRINT_SIZE_IN)
  // -----------------------------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;

    const area = fc.getObjects().find(o => o.id==="printArea");
    if (!area) return toast({ title:"No print area defined", status:"error" });

    const objs = fc.getObjects().filter(o => !["printArea","gridOverlay","rulers"].includes(o.id));
    if (!objs.length) return toast({ title:"Nothing to print", status:"warning" });

    const size = PRINT_SIZE_IN[productType]?.[view] || PRINT_SIZE_IN.tshirt.front;
    const outW = Math.round(size.w * DPI);
    const outH = Math.round(size.h * DPI);

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
        productImage: pickMockupUrlFallback(product, view, color),
        unitPrice,
      };
      localStorage.setItem("itemToCheckout", JSON.stringify(item));
      navigate("/checkout");
    } catch (e) {
      console.error(e);
      toast({ title:"Upload failed", status:"error" });
    }
  };

  // -----------------------------
  // Derived lists
  // -----------------------------
  const colorOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => v.color && set.add(normColorKey(v.color)));
    (product?.colors || []).forEach(c => c && set.add(normColorKey(c)));
    const arr = [...set];
    const known   = arr.filter(c => COLOR_ORDER.includes(c));
    const unknown = arr.filter(c => !COLOR_ORDER.includes(c));
    return [...COLOR_ORDER.filter(c => known.includes(c)), ...unknown];
  }, [product]);

  const sizeOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => {
      if (!color || normColorKey(v.color) === normColorKey(color)) v.size && set.add(v.size);
    });
    return [...set];
  }, [product, color]);

  const canCheckout =
    product &&
    (!colorOptions.length || color) &&
    (!sizeOptions.length || size) &&
    fabricRef.current &&
    fabricRef.current.getObjects().filter(o => !["printArea","gridOverlay","rulers"].includes(o.id)).length > 0;

  // -----------------------------
  // Layers helpers
  // -----------------------------
  const getLayerList = () => {
    const fc = fabricRef.current; if (!fc) return [];
    return fc.getObjects()
      .filter(o => !["printArea","gridOverlay","rulers"].includes(o.id))
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

  // -----------------------------
  // UI
  // -----------------------------
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
              {/* Options */}
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

                  {/* Color */}
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

                  {/* Zoom / Grid / Rulers / Opacity */}
                  <Box>
                    <Text className="ps-label">Zoom</Text>
                    <HStack>
                      <IconButton size="xs" aria-label="zoom out" onClick={() => setZoomSafe(zoom-0.1)} icon={<FaSearchMinus/>} />
                      <Text fontSize="sm" color="whiteAlpha.800">{zoom.toFixed(2)}x</Text>
                      <IconButton size="xs" aria-label="zoom in" onClick={() => setZoomSafe(zoom+0.1)} icon={<FaSearchPlus/>} />
                      <HStack ml={3}>
                        <Switch size="sm" isChecked={gridOn} onChange={(e)=>{ setGridOn(e.target.checked); applyGridOverlay(fabricRef.current); }} />
                        <Text fontSize="sm">Grid</Text>
                        <Switch size="sm" isChecked={rulersOn} onChange={(e)=>{ setRulersOn(e.target.checked); applyRulers(fabricRef.current); }} />
                        <Text fontSize="sm">Rulers</Text>
                      </HStack>
                    </HStack>
                  </Box>

                  <Box>
                    <Text className="ps-label">Mockup opacity</Text>
                    <input
                      type="range"
                      min="0.2" max="1" step="0.05"
                      value={mockupOpacity}
                      onChange={(e)=>setMockupOpacity(parseFloat(e.target.value))}
                      onMouseUp={refreshScene}
                      onTouchEnd={refreshScene}
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

              {/* Designs */}
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

              {/* Text */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Button onClick={addText} size="sm" colorScheme="teal">
                    Add Text
                  </Button>
                  <Text fontSize="sm" color="whiteAlpha.800">
                    (Use the controls on the canvas to move/resize/rotate.)
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
              Click a layer on canvas to select & re-order. Add an image or text to get started.
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
