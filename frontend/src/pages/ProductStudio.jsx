// frontend/src/pages/ProductStudio.jsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid,
  AspectRatio, Image, Tooltip, useToast, Divider, Badge, Slider,
  SliderTrack, SliderFilledTrack, SliderThumb, Tabs, TabList, TabPanels,
  Tab, TabPanel, Switch, IconButton, Input,
} from "@chakra-ui/react";
import {
  FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus, FaTshirt,
  FaHatCowboy, FaHockeyPuck, FaRedoAlt, FaEye, FaEyeSlash, FaLock, FaLockOpen,
  FaChevronUp, FaChevronDown, FaUpload, FaCompressAlt,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";

// Central image registry (Cloudinary + fallback)
import {
  getMockupUrl,
  listColors,
  resolveColor,
  MOCKUPS_PLACEHOLDER,
} from "../data/mockupsRegistry";

// ---------- constants ----------
const DPI = 300;
const CANVAS_ASPECT = 3 / 4;

// Placement table: fractions relative to the whole canvas (background mockup fills height)
const PLACEMENTS = {
  tshirt: {
    front:  { leftFrac: 0.29, topFrac: 0.285, widthFrac: 0.42, aspect: 12 / 16 },
    back:   { leftFrac: 0.29, topFrac: 0.320, widthFrac: 0.42, aspect: 12 / 16 },
    left:   { leftFrac: 0.58, topFrac: 0.40,  widthFrac: 0.17, aspect: 4 / 3.5 },
    right:  { leftFrac: 0.25, topFrac: 0.40,  widthFrac: 0.17, aspect: 4 / 3.5 },
  },
  hoodie: {
    front:  { leftFrac: 0.30, topFrac: 0.31, widthFrac: 0.38, aspect: 12 / 14 },
    back:   { leftFrac: 0.30, topFrac: 0.33, widthFrac: 0.40, aspect: 12 / 16 },
  },
  tote: {
    front:  { leftFrac: 0.34, topFrac: 0.28, widthFrac: 0.32, aspect: 14 / 16 },
    back:   { leftFrac: 0.34, topFrac: 0.28, widthFrac: 0.32, aspect: 14 / 16 },
  },
  hat: {
    front:  { leftFrac: 0.43, topFrac: 0.36, widthFrac: 0.14, aspect: 4 / 1.75 },
  },
  beanie: {
    front:  { leftFrac: 0.40, topFrac: 0.38, widthFrac: 0.20, aspect: 5 / 1.75 },
  },
};

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "left", "right"],
  hoodie: ["front", "back"],
  tote: ["front", "back"],
  hat: ["front"],
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

const norm = (s) => String(s || "").trim().toLowerCase();
function ProductTypeBadgeIcon({ type }) {
  const IconCmp =
    type === "tshirt" ? FaTshirt :
    type === "hoodie" ? FaTshirt :
    type === "hat"    ? FaHatCowboy :
    type === "beanie" ? FaHockeyPuck :
    FaTshirt;
  return <Icon as={IconCmp} color="brand.accentYellow" />;
}
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Swatches (same palette you liked from ProductCard)
const COLOR_SWATCHES = {
  black: "#000000",
  white: "#FFFFFF",
  maroon: "#800000",
  red: "#D32F2F",
  royal: "#1E40AF",
  "royal blue": "#1E40AF",
  purple: "#6B21A8",
  charcoal: "#36454F",
  "military green": "#4B5320",
  "forest green": "#228B22",
  lime: "#9CCC65",
  "tropical blue": "#1CA3EC",
  navy: "#0B1F44",
  gold: "#D4AF37",
  orange: "#F57C00",
  azalea: "#FF77A9",
  "brown savana": "#7B5E57",
  "brown savanna": "#7B5E57",
  brown: "#6D4C41",
  sand: "#E0CDA9",
  ash: "#B2BEB5",
  sport_grey: "#B5B8B1",
  grey: "#8E8E8E",
};

// ---------- component ----------
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

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const clipRef = useRef(null);           // clip path (print area)
  const printRectRef = useRef(null);      // the dashed print area rect

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [mockupVisible, setMockupVisible] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);
  const [layerTick, setLayerTick] = useState(0);

  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const warnedRef = useRef(false);

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  // ---------- data fetch ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (cancelled) return;
        const p = res.data;
        setProduct(p);

        // default color from registry where possible
        const regColors = listColors(norm(p?.slug || slugParam));
        if (regColors.length) {
          setColor(resolveColor(p?.slug || slugParam, colorParam || "black") || regColors[0]);
        }

        if (!sizeParam) {
          const sset = new Set();
          (p?.variants || []).forEach(v => v.size && sset.add(v.size));
          const first = sset.values().next().value;
          if (first) setSize(first);
        }

        if (!availableViews.includes(view)) setView(availableViews[0] || "front");
      } catch (e) {
        console.error(e);
        setProduct({ name: params.slug, slug: params.slug });
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
      } catch {} finally {
        if (!cancelled) setLoadingDesigns(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- fabric init ----------
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    if (!fabricRef.current) {
      const parentW = wrapRef.current.clientWidth;
      const parentH = parentW / CANVAS_ASPECT;

      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: parentW,
        height: parentH,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      const onChange = () => {
        setHasObjects(
          fc.getObjects().some(o => !["printArea", "gridOverlay"].includes(o.id))
        );
        setLayerTick((t) => t + 1);
      };
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);

      // Keys
      const onKey = (e) => {
        const active = fc.getActiveObject();
        if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
          e.preventDefault(); zoomToPrintArea(zoom + 0.1); return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "-") {
          e.preventDefault(); zoomToPrintArea(zoom - 0.1); return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "g") {
          setShowGrid((v)=>!v); refreshBackground(); return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "m") {
          setMockupVisible((v)=>!v);
          const bg = fc.backgroundImage;
          if (bg) { bg.set("opacity", bg.opacity === 0 ? mockupOpacity : 0); fc.requestRenderAll(); }
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "f") {
          autoFit(); return;
        }
        if (!active) return;
        const step = e.shiftKey ? 5 : 1;
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(); return; }
        if (e.key === "ArrowLeft")  { active.left -= step; }
        if (e.key === "ArrowRight") { active.left += step; }
        if (e.key === "ArrowUp")    { active.top  -= step; }
        if (e.key === "ArrowDown")  { active.top  += step; }
        active.setCoords(); fc.requestRenderAll();
      };
      window.addEventListener("keydown", onKey);

      const ro = new ResizeObserver(() => {
        if (!fabricRef.current) return;
        const w = wrapRef.current.clientWidth;
        const h = w / CANVAS_ASPECT;
        fabricRef.current.setWidth(w);
        fabricRef.current.setHeight(h);
        refreshBackground();
      });
      ro.observe(wrapRef.current);

      return () => {
        window.removeEventListener("keydown", onKey);
        ro.disconnect();
      };
    }
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- helpers ----------
  const makeGridOverlay = useCallback((fc) => {
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
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  const computePrintRect = (fc, type, v) => {
    const rule = (PLACEMENTS[type] && PLACEMENTS[type][v]) || PLACEMENTS.tshirt.front;
    const width = fc.width * rule.widthFrac;
    const height = width / rule.aspect; // keep 12x16 etc.
    const left = fc.width * rule.leftFrac;
    const top  = fc.height * rule.topFrac;
    return { left, top, width, height };
  };

  const applyClipToUserObjects = (fc, clip) => {
    fc.getObjects()
      .filter(o => !["printArea", "gridOverlay"].includes(o.id))
      .forEach(o => { o.clipPath = clip; });
  };

  // Center zoom around the print area
  const zoomToPrintArea = (nextZoomRaw) => {
    const fc = fabricRef.current; if (!fc) return;
    const clamped = Math.max(0.75, Math.min(2, nextZoomRaw));
    setZoom(clamped);

    const rect = printRectRef.current;
    if (rect) {
      const a = rect.getBoundingRect(true, true);
      const cx = a.left + a.width / 2;
      const cy = a.top  + a.height / 2;
      const pt = new window.fabric.Point(cx, cy);
      fc.zoomToPoint(pt, clamped);
    } else {
      fc.setZoom(clamped);
    }
    fc.requestRenderAll();
  };

  const refreshBackground = useCallback(async () => {
    const fc = fabricRef.current;
    const slug = product?.slug || slugParam || "classic-tee";
    if (!fc) return;

    // Keep user objects; remove guides/overlays
    const keep = fc.getObjects().filter(o => !["printArea", "gridOverlay"].includes(o.id));
    fc.clear();
    keep.forEach(o => fc.add(o));

    // background mockup
    const url = await getMockupUrl({ slug, color, view });

    window.fabric.Image.fromURL(
      url || MOCKUPS_PLACEHOLDER,
      (img) => {
        // Fit by height, center horizontally
        const scale = fc.height / img.height;
        img.set({
          top: 0,
          left: fc.width / 2,
          originX: "center",
          originY: "top",
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          opacity: mockupVisible ? mockupOpacity : 0,
        });
        fc.setBackgroundImage(img, fc.renderAll.bind(fc));

        // Grid overlay
        const gridDataUrl = makeGridOverlay(fc);
        window.fabric.Image.fromURL(
          gridDataUrl,
          (gridImg) => {
            gridImg.set({
              id: "gridOverlay",
              selectable: false,
              evented: false,
              opacity: showGrid ? 1 : 0,
              top: 0,
              left: 0,
              originX: "left",
              originY: "top",
            });
            fc.setOverlayImage(gridImg, fc.renderAll.bind(fc));
          },
          { crossOrigin: "anonymous" }
        );

        // PRINT AREA (based on placement fractions)
        const { left, top, width, height } = computePrintRect(fc, productType, view);

        const rect = new window.fabric.Rect({
          id: "printArea",
          left, top, width, height,
          originX: "left",
          originY: "top",
          fill: "",
          stroke: "#FFFFFF",
          strokeDashArray: [6, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        fc.add(rect);
        printRectRef.current = rect;

        // clip path = absolute rect
        const clipRect = new window.fabric.Rect({
          left, top, width, height,
          absolutePositioned: true,
          originX: "left", originY: "top",
        });
        clipRef.current = clipRect;
        applyClipToUserObjects(fc, clipRect);

        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, slugParam, color, view, mockupOpacity, mockupVisible, showGrid, makeGridOverlay, productType]);

  useEffect(() => { refreshBackground(); }, [refreshBackground]);

  // clamp + warn + tiny center snap inside print area
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;

    const onTransform = () => {
      const area = printRectRef.current;
      const o = fc.getActiveObject();
      if (!area || !o) return;

      const a = area.getBoundingRect(true,true);
      const bb = o.getBoundingRect(true,true);

      // center snap
      const cx = a.left + a.width/2;
      const cy = a.top + a.height/2;
      const ocx = bb.left + bb.width/2;
      const ocy = bb.top + bb.height/2;
      if (Math.abs(ocx - cx) < 8) { o.left += cx - ocx; }
      if (Math.abs(ocy - cy) < 8) { o.top  += cy - ocy; }

      // clamp to area
      const bb2 = o.getBoundingRect(true,true);
      if (bb2.left < a.left) o.left += a.left - bb2.left;
      if (bb2.top  < a.top)  o.top  += a.top  - bb2.top;
      if (bb2.left + bb2.width > a.left + a.width)
        o.left -= bb2.left + bb2.width - (a.left + a.width);
      if (bb2.top + bb2.height > a.top + a.height)
        o.top  -= bb2.top  + bb2.height - (a.top + a.height);

      o.setCoords(); fc.requestRenderAll();

      const overflow =
        bb2.left < a.left || bb2.top < a.top ||
        bb2.left + bb2.width > a.left + a.width ||
        bb2.top + bb2.height > a.top + a.height;

      if (overflow && !warnedRef.current) {
        warnedRef.current = true;
        toast({ title: "Part of your design is outside the print area", status: "warning", duration: 1400 });
        setTimeout(() => (warnedRef.current = false), 1000);
      }
    };

    fc.on("object:moving", onTransform);
    fc.on("object:scaling", onTransform);
    fc.on("object:rotating", onTransform);
    return () => {
      fc.off("object:moving", onTransform);
      fc.off("object:scaling", onTransform);
      fc.off("object:rotating", onTransform);
    };
  }, [toast]);

  // ---------- actions ----------
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id"])));
    if (undoStack.current.length > 60) undoStack.current.shift();
  }, []);
  const applyJSON = (json) => {
    const fc = fabricRef.current; if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll(), (_o,obj) => obj);
  };
  const undo = () => {
    const fc = fabricRef.current; if (!fc || undoStack.current.length===0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };
  const redo = () => {
    const fc = fabricRef.current; if (!fc || redoStack.current.length===0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  const addText = () => {
    const fc = fabricRef.current;
    const textValue = prompt("Enter text");
    if (!fc || !textValue || !textValue.trim()) return;
    const t = new window.fabric.IText(textValue.trim(), {
      left: fc.width/2, top: fc.height/2,
      originX: "center", originY: "center",
      fill: "#ffffff", fontSize: 36,
    });
    t.clipPath = clipRef.current || null;
    pushHistory(); fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
  };

  const addDesign = (design) => {
    const fc = fabricRef.current; if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(design.imageDataUrl, (img) => {
      img.set({ left: fc.width/2, top: fc.height/2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
      img.clipPath = clipRef.current || null;
      pushHistory(); fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };

  const uploadLocal = (file) => {
    if (!file) return;
    const fc = fabricRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result;
      if (/\.svg$/i.test(file.name)) {
        window.fabric.loadSVGFromString(url, (objects, options) => {
          const grp = window.fabric.util.groupSVGElements(objects, options);
          grp.set({ left: fc.width/2, top: fc.height/2, originX: "center", originY: "center", scaleX: 0.6, scaleY: 0.6 });
          grp.clipPath = clipRef.current || null;
          pushHistory(); fc.add(grp); fc.setActiveObject(grp); fc.requestRenderAll();
        });
      } else {
        window.fabric.Image.fromURL(url, (img) => {
          img.set({ left: fc.width/2, top: fc.height/2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
          img.clipPath = clipRef.current || null;
          pushHistory(); fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const del = () => {
    const fc = fabricRef.current; if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea" || active.id === "gridOverlay") return;
    pushHistory(); fc.remove(active); fc.discardActiveObject(); fc.requestRenderAll();
  };

  const centerH = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    const a = printRectRef.current?.getBoundingRect(true,true); if (!a) return;
    const bb = o.getBoundingRect(true,true);
    o.left += a.left + a.width/2 - (bb.left + bb.width/2);
    o.setCoords(); fc.requestRenderAll();
  };

  const autoFit = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    const a = printRectRef.current?.getBoundingRect(true,true); if (!a) return;
    const maxW = a.width * 0.9;
    const maxH = a.height * 0.9;
    const ow = o.getScaledWidth();
    const oh = o.getScaledHeight();
    const s = Math.min(maxW/ow, maxH/oh);
    o.scaleX *= s; o.scaleY *= s;
    const bb = o.getBoundingRect(true,true);
    o.left += a.left + a.width/2 - (bb.left + bb.width/2);
    o.top  += a.top  + a.height/2 - (bb.top  + bb.height/2);
    o.setCoords(); fc.requestRenderAll();
  };

  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;

    const area = printRectRef.current;
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter(o => !["printArea", "gridOverlay"].includes(o.id));
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    // True output size (inches * DPI)
    const rule = (PLACEMENTS[productType] && PLACEMENTS[productType][view]) || PLACEMENTS.tshirt.front;
    const outW = Math.round((12) * DPI * (rule.aspect)); // we keep aspect by scaling below anyway
    // Instead of guessing, compute from fraction + DPI relative to current on-screen rect
    const aBB = area.getBoundingRect(true, true);
    const OUT_W = Math.round(12 * DPI); // base 12-inch width for tees
    const OUT_H = Math.round(OUT_W / rule.aspect);

    const tmp = new window.fabric.Canvas(null, { width: OUT_W, height: OUT_H });
    const scaleFactor = OUT_W / aBB.width;

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top  - aBB.top  + bb.height / 2;

      clone.originX = "center"; clone.originY = "center";
      clone.left = relX * scaleFactor; clone.top = relY * scaleFactor;
      clone.scaleX = o.scaleX * scaleFactor; clone.scaleY = o.scaleY * scaleFactor;
      clone.clipPath = null;
      if (clone.type === "i-text") clone.fontSize = (o.fontSize || 36) * scaleFactor;

      tmp.add(clone);
    });
    tmp.requestRenderAll();

    const png = tmp.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    tmp.dispose();
    const previewPNG = fc.toDataURL({ format: "png", quality: 0.92 });

    toast({ title: "Uploading design…", status: "info", duration: 2200 });
    try {
      const upload = await client.post("/upload-print-file", {
        imageData: png,
        designName: `${product?.name || "Custom"} ${view}`,
      });
      const fileUrl = upload.data?.publicUrl;
      if (!fileUrl) throw new Error("Upload failed");

      const unitPrice = product?.priceMin || product?.basePrice || 0;
      const slug = product?.slug || slugParam;
      const prodImage = await getMockupUrl({ slug, color, view });
      const item = {
        productId: product?.id || product?._id || "",
        slug,
        name: product?.name, color, size, view,
        preview: previewPNG,
        printFileUrl: fileUrl,
        productImage: prodImage,
        unitPrice,
      };
      localStorage.setItem("itemToCheckout", JSON.stringify(item));
      navigate("/checkout");
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", status: "error" });
    }
  };

  const registryColors = useMemo(() => listColors(norm(product?.slug || slugParam)), [product, slugParam]);
  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => v.size && set.add(v.size));
    return [...set];
  }, [product]);
  const canProceed = product && (!registryColors.length || color) && (!sizes.length || size) && hasObjects;

  const layerList = () => {
    const fc = fabricRef.current; if (!fc) return [];
    return fc.getObjects()
      .filter(o => !["printArea", "gridOverlay"].includes(o.id))
      .map((o,idx) => ({
        id: o._layerId || `layer_${idx}`,
        obj: o,
        label: o.type === "i-text" ? "TEXT" : o.type === "image" ? "IMAGE" : o.type === "group" ? "SVG" : (o.type || "OBJECT").toUpperCase(),
        visible: o.visible !== false,
        locked: !!o.lockMovementX || !!o.lockMovementY,
      }));
  };
  const toggleVisible = (it) => { const fc=fabricRef.current; it.obj.visible=!it.obj.visible; fc.requestRenderAll(); setLayerTick(t=>t+1); };
  const toggleLock = (it) => { const fc=fabricRef.current; const locked=!(it.obj.lockMovementX&&it.obj.lockMovementY); it.obj.lockMovementX=locked; it.obj.lockMovementY=locked; it.obj.hasControls=!locked; it.obj.selectable=!locked; fc.requestRenderAll(); setLayerTick(t=>t+1); };
  const bringFwd     = (it) => { const fc=fabricRef.current; fc.bringForward(it.obj); fc.requestRenderAll(); setLayerTick(t=>t+1); };
  const sendBack     = (it) => { const fc=fabricRef.current; fc.sendBackwards(it.obj); fc.requestRenderAll(); setLayerTick(t=>t+1); };

  // ---------- UI ----------
  return (
    <Flex direction={{ base: "column", xl: "row" }} minH="100vh" bg="brand.primary">
      {/* LEFT */}
      <Box w={{ base: "100%", xl: "320px" }} p={4} borderRightWidth={{ xl: "1px" }} borderColor="whiteAlpha.200" bg="brand.paper">
        <VStack align="stretch" spacing={4}>
          <HStack>
            <ProductTypeBadgeIcon type={productType} />
            <Heading size="md" color="brand.textLight">
              {product?.name || "Product"}
            </Heading>
            <Badge variant="outline" colorScheme="yellow" opacity={0.8}>
              {productType.toUpperCase()}
            </Badge>
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
                      {registryColors.length ? (
                        registryColors.map((c) => {
                          const hex = COLOR_SWATCHES[c] || "#CCCCCC";
                          const selected = norm(color) === norm(c);
                          return (
                            <Tooltip key={c} label={c}>
                              <Button
                                onClick={() => setColor(c)}
                                variant={selected ? "solid" : "outline"}
                                size="xs"
                                p={0}
                                borderRadius="full"
                                borderWidth="2px"
                                borderColor={selected ? "yellow.400" : "whiteAlpha.500"}
                                _hover={{ borderColor: "yellow.300" }}
                              >
                                <Box w="16px" h="16px" borderRadius="full" bg={hex} boxShadow="inset 0 0 0 1px rgba(0,0,0,.25)" />
                              </Button>
                            </Tooltip>
                          );
                        })
                      ) : (
                        <Badge>No colors in registry</Badge>
                      )}
                    </HStack>
                  </Box>

                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">Size</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {sizes.length ? (
                        sizes.map((s) => (
                          <Button key={s} size="sm" variant={size===s?"solid":"outline"} onClick={() => setSize(s)}>{s}</Button>
                        ))
                      ) : (
                        <Badge>No size options</Badge>
                      )}
                    </HStack>
                  </Box>

                  <VStack align="stretch" spacing={3}>
                    <Text color="brand.textLight" fontWeight="medium">Zoom</Text>
                    <HStack>
                      <Tooltip label="Zoom out">
                        <Button size="sm" onClick={() => zoomToPrintArea(zoom - 0.1)} leftIcon={<FaSearchMinus />}>Out</Button>
                      </Tooltip>
                      <Slider aria-label="zoom" value={zoom} min={0.75} max={2} step={0.1} onChange={zoomToPrintArea}>
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Tooltip label="Zoom in">
                        <Button size="sm" onClick={() => zoomToPrintArea(zoom + 0.1)} leftIcon={<FaSearchPlus />}>In</Button>
                      </Tooltip>
                    </HStack>

                    <HStack>
                      <Switch isChecked={showGrid} onChange={(e) => { setShowGrid(e.target.checked); refreshBackground(); }} />
                      <Text color="brand.textLight">Show grid</Text>
                    </HStack>

                    <HStack>
                      <Switch
                        isChecked={mockupVisible}
                        onChange={(e) => {
                          setMockupVisible(e.target.checked);
                          const fc = fabricRef.current;
                          const bg = fc?.backgroundImage;
                          if (bg) { bg.set("opacity", e.target.checked ? mockupOpacity : 0); fc.requestRenderAll(); }
                        }}
                      />
                      <Text color="brand.textLight">Show mockup</Text>
                    </HStack>

                    <Box>
                      <Text color="brand.textLight" fontWeight="medium" mb={1}>Mockup opacity</Text>
                      <Slider
                        aria-label="mockup-opacity"
                        min={0.2}
                        max={1}
                        step={0.05}
                        value={mockupOpacity}
                        onChange={(v)=> {
                          setMockupOpacity(v);
                          const fc = fabricRef.current;
                          const bg = fc?.backgroundImage;
                          if (bg && mockupVisible) { bg.set("opacity", v); fc.requestRenderAll(); }
                        }}
                      >
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>
                  </VStack>

                  <Divider borderColor="whiteAlpha.300" />

                  <HStack>
                    <Button size="sm" onClick={centerH} leftIcon={<FaArrowsAltH />}>Center X</Button>
                    <Button size="sm" onClick={autoFit} leftIcon={<FaCompressAlt />}>Center & Fit</Button>
                  </HStack>

                  <Divider borderColor="whiteAlpha.300" />

                  <Button colorScheme={canProceed ? "yellow" : "gray"} isDisabled={!canProceed} onClick={makePrintReadyAndUpload}>
                    Add to cart / Checkout
                  </Button>
                  <Text fontSize="xs" color="whiteAlpha.700">We export a true print file at {DPI} DPI sized to the selected placement.</Text>

                  <HStack pt={2} spacing={2}>
                    <Tooltip label="Undo"><IconButton size="sm" onClick={undo} icon={<FaUndo />} /></Tooltip>
                    <Tooltip label="Redo"><IconButton size="sm" onClick={redo} icon={<FaRedo />} /></Tooltip>
                    <Tooltip label="Delete selected"><IconButton size="sm" onClick={del} colorScheme="red" variant="outline" icon={<FaTrash />} /></Tooltip>
                  </HStack>
                </VStack>
              </TabPanel>

              {/* Designs + Upload */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <HStack>
                    <Input type="file" accept="image/*,.svg" onChange={(e) => uploadLocal(e.target.files?.[0])} />
                    <Icon as={FaUpload} />
                  </HStack>

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
                      No saved designs yet. Upload above or create in “Generate”.
                    </Text>
                  )}
                </VStack>
              </TabPanel>

              {/* Text */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Button onClick={addText} size="sm" colorScheme="teal" leftIcon={<FaRedoAlt />}>
                    Add Text
                  </Button>
                  <Text fontSize="sm" color="whiteAlpha.800">Use Fabric controls on the canvas to edit the text.</Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>

      {/* CANVAS */}
      <Flex flex="1" direction="column" p={4}>
        <Box
          ref={wrapRef}
          w="100%"
          maxW="860px"
          mx="auto"
          sx={{
            position: "relative",
            aspectRatio: `${CANVAS_ASPECT}`,
            background: "var(--chakra-colors-brand-secondary)",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,.18)",
            overflow: "hidden",
          }}
        >
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
        </Box>
      </Flex>

      {/* LAYERS */}
      <Box display={{ base: "none", xl: "block" }} w="260px" p={4} borderLeftWidth="1px" borderColor="whiteAlpha.200" bg="brand.paper">
        <Heading size="sm" color="brand.textLight" mb={2}>Layers</Heading>
        <VStack align="stretch" spacing={1} key={layerTick}>
          {layerList().map((l) => (
            <HStack
              key={l.id}
              p={2}
              borderRadius="md"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => { const fc = fabricRef.current; fc.setActiveObject(l.obj); fc.requestRenderAll(); }}
            >
              <Text color="whiteAlpha.900" fontSize="sm" noOfLines={1}>{l.label}</Text>
              <HStack ml="auto" spacing={1}>
                <IconButton aria-label="visible" size="xs" variant="ghost" icon={l.visible ? <FaEye/> : <FaEyeSlash/>} onClick={(e)=>{e.stopPropagation(); toggleVisible(l);}} />
                <IconButton aria-label="lock" size="xs" variant="ghost" icon={l.locked ? <FaLock/> : <FaLockOpen/>} onClick={(e)=>{e.stopPropagation(); toggleLock(l);}} />
                <IconButton aria-label="up" size="xs" variant="ghost" icon={<FaChevronUp/>} onClick={(e)=>{e.stopPropagation(); bringFwd(l);}} />
                <IconButton aria-label="down" size="xs" variant="ghost" icon={<FaChevronDown/>} onClick={(e)=>{e.stopPropagation(); sendBack(l);}} />
              </HStack>
            </HStack>
          ))}
          {!layerList().length && (
            <Text color="whiteAlpha.700" fontSize="xs" px={2} py={3}>Add an image or text to get started.</Text>
          )}
        </VStack>
      </Box>
    </Flex>
  );
}
