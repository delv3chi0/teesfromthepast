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
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
  AspectRatio,
  Image,
  useToast,
  Collapse,
  Divider,
  Badge,
  Icon,
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

// --- Robust mockups import (works whether default or named export) ---
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_MOD?.default ?? MOCKUPS_MOD?.MOCKUPS ?? {});

// ---------------------------------------------
// Constants
// ---------------------------------------------
const DPI = 300;                  // output DPI
const CANVAS_ASPECT = 2 / 3;      // main design area aspect ratio (tall)
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Color dots order: black -> rainbow -> white
const COLOR_ORDER = [
  "black", "maroon", "red", "orange", "gold", "lime", "tropical blue", "royal",
  "purple", "charcoal", "ash", "sport_grey", "white"
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

// Product types & views
const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "sleeve"],
  hoodie: ["front", "back"],
  tote:   ["front", "back"],
  hat:    ["front"],
  beanie: ["front"],
};

// ------------------------------------------------------------
// Placement templates (percent-based, stable across sizes)
// Each entry tells us where to draw the PRINT AREA relative
// to the mockup image on the main canvas.
// All values are FRACTIONS of canvas width/height.
// ------------------------------------------------------------
const PLACEMENTS = {
  tshirt: {
    mockup: { // uniform scale/position so the shirt always sits the same
      // The mockup image is scaled so its width = mockup.w * canvasWidth
      // and positioned with top/left padding in % of canvas dims.
      w: 0.62,
      top: 0.08,
      left: 0.19,
    },
    front: {
      x: 0.29,  // left
      y: 0.23,  // top
      w: 0.32,  // width
      h: 0.42,  // height
    },
    back:  { x: 0.29, y: 0.23, w: 0.32, h: 0.42 },
    sleeve:{ x: 0.62, y: 0.38, w: 0.12, h: 0.12 },
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
const norm = (s) =>
  String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug = (p) => norm(p?.slug || p?.name || "");
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
  // Simple glyph to show the current product type next to title
  return (
    <Badge colorScheme="yellow" variant="outline" borderRadius="sm" ml={2}>
      {String(type || "").toUpperCase()}
    </Badge>
  );
}

// ---------------------------------------------
// Component
// ---------------------------------------------
export default function ProductStudio() {
  const toast = useToast();
  const navigate = useNavigate();
  const query = useQuery();
  const params = useParams();

  const slugParam = query.get("slug") || params.slug || "";
  const colorParam = query.get("color") || "";
  const sizeParam = query.get("size") || "";

  const [product, setProduct] = useState(null);
  const productType = useMemo(() => detectProductType(product), [product]);
  const availableViews = useMemo(
    () => VIEWS_BY_TYPE[productType] || ["front"],
    [productType]
  );

  const [view, setView] = useState("front");
  const [color, setColor] = useState(colorParam || "black");
  const [size, setSize] = useState(sizeParam || "");

  // Canvas / Fabric refs
  const wrapRef = useRef(null);      // container for main canvas
  const canvasRef = useRef(null);    // actual <canvas>
  const rulersRef = useRef({});      // ruler canvases
  const fabricRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [gridOn, setGridOn] = useState(true);
  const [rulersOn, setRulersOn] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);

  // Layers panel / selection
  const [layersOpen, setLayersOpen] = useState(true);
  const [activeId, setActiveId] = useState(null);

  // My designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  // History
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // ---------------------------------------------
  // Fetch product + defaults
  // ---------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(
          `/storefront/product/${encodeURIComponent(slugParam)}`
        );
        if (cancelled) return;
        const p = res.data;
        setProduct(p);

        // default color: prefer black if present -> else first color
        const colorSet = new Set();
        (p?.variants || []).forEach((v) => v.color && colorSet.add(v.color));
        (p?.colors || []).forEach((c) => colorSet.add(c));
        const colors = [...colorSet];
        if (!colorParam) {
          if (colors.map((c) => c.toLowerCase()).includes("black")) {
            setColor("black");
          } else if (colors.length) {
            setColor(colors[0]);
          }
        }
        if (!sizeParam) {
          const sizeSet = new Set();
          (p?.variants || []).forEach((v) => v.size && sizeSet.add(v.size));
          const first = [...sizeSet][0];
          if (first) setSize(first);
        }
        if (!availableViews.includes(view)) setView(availableViews[0] || "front");
      } catch (e) {
        console.error(e);
        toast({ title: "Could not load product", status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  // Fetch my saved designs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDesigns(true);
        const res = await client.get("/mydesigns");
        if (!cancelled) setDesigns(res.data || []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingDesigns(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------
  // Canvas init + resizing
  // ---------------------------------------------
  useEffect(() => {
    if (!window.fabric) return;
    if (!wrapRef.current || !canvasRef.current) return;

    // Create Fabric canvas once
    if (!fabricRef.current) {
      // Size main canvas to container, top-aligned, fixed aspect
      const parentW = wrapRef.current.clientWidth;
      const h = Math.round(parentW / CANVAS_ASPECT);

      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: parentW,
        height: h,
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = fc;

      // Selection hook -> sync active id
      fc.on("selection:created", () => {
        const obj = fc.getActiveObject();
        setActiveId(obj?._layerId || null);
      });
      fc.on("selection:updated", () => {
        const obj = fc.getActiveObject();
        setActiveId(obj?._layerId || null);
      });
      fc.on("selection:cleared", () => setActiveId(null));

      // Keep shirt always in the same place by re-setting background each resize
      const onResize = () => {
        if (!fabricRef.current || !wrapRef.current) return;
        const W = wrapRef.current.clientWidth;
        const H = Math.round(W / CANVAS_ASPECT);
        fabricRef.current.setWidth(W);
        fabricRef.current.setHeight(H);
        refreshBackground(); // re-apply mockup + print area bounds
        drawRulers();        // redraw rulers to scale ticks
      };
      const ro = new ResizeObserver(onResize);
      ro.observe(wrapRef.current);
    }

    drawRulers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------
  // Helpers: history + JSON restore
  // ---------------------------------------------
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["_layerId", "id"])));
    if (undoStack.current.length > 60) undoStack.current.shift();
  }, []);
  const applyJSON = (json) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll(), (_o, obj) => obj);
  };
  const undo = () => {
    const fc = fabricRef.current;
    if (!fc || undoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["_layerId", "id"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };
  const redo = () => {
    const fc = fabricRef.current;
    if (!fc || redoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["_layerId", "id"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  // ---------------------------------------------
  // Mockup picking + background refresh
  // ---------------------------------------------
  const pickMockupUrl = (product, view, color) => {
    const slugKey = normSlug(product) || norm(slugParam);
    const colorKey = normColor(color);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[view];
    if (bySlug) return bySlug;

    // Variant fallbacks
    const variants = product?.variants || [];
    const variant =
      variants.find((v) => v.color === color || v.colorName === color) ||
      variants[0];

    const fromFiles = (files = []) => {
      const pref = (t) =>
        files.find(
          (f) =>
            f?.type === t &&
            (f.preview_url || f.url || f.thumbnail_url)
        );
      const f = pref("preview") || pref("mockup") || files[0];
      return f?.preview_url || f?.url || f?.thumbnail_url || null;
    };

    if (variant?.imageSet?.length) {
      const primary = variant.imageSet.find((i) => i.isPrimary) || variant.imageSet[0];
      if (primary?.url) return primary.url;
    }
    if (variant?.files?.length) {
      const f = fromFiles(variant.files);
      if (f) return f;
    }
    if (product?.images?.length) {
      const pimg = product.images.find((i) => i.isPrimary) || product.images[0];
      if (pimg?.url) return pimg.url;
      if (typeof product.images[0] === "string") return product.images[0];
    }
    if (variant?.image) return variant.image;
    if (product?.image) return product.image;
    return PLACEHOLDER;
  };

  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !product) return;

    // Keep user objects but remove old printArea & background
    const users = fc.getObjects().filter((o) => o.id !== "printArea");
    fc.clear();
    users.forEach((o) => fc.add(o));

    // 1) Place mockup image with consistent position/scale (from template)
    const t = PLACEMENTS[productType] || PLACEMENTS.tshirt;
    const mockCfg = t.mockup;
    const mockupUrl = pickMockupUrl(product, view, color) || PLACEHOLDER;

    window.fabric.Image.fromURL(
      mockupUrl,
      (img) => {
        const W = fc.getWidth();
        const H = fc.getHeight();

        const imgScale = (mockCfg.w * W) / img.width;
        img.set({
          left: mockCfg.left * W,
          top: mockCfg.top * H,
          originX: "left",
          originY: "top",
          scaleX: imgScale,
          scaleY: imgScale,
          selectable: false,
          evented: false,
          opacity: mockupOpacity,
          id: "mockupBG",
        });

        fc.setBackgroundImage(img, fc.renderAll.bind(fc));
        // 2) Draw print area (percent-based rect)
        const area = t[view] || t.front;
        const rect = new window.fabric.Rect({
          left: Math.round(area.x * W),
          top: Math.round(area.y * H),
          originX: "left",
          originY: "top",
          width: Math.round(area.w * W),
          height: Math.round(area.h * H),
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
          id: "printArea",
        });
        fc.add(rect);
        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, view, color, mockupOpacity, productType]);

  // Re-apply background when product/view/color changes
  useEffect(() => {
    if (!product) return;
    refreshBackground();
    drawRulers();
  }, [refreshBackground, product, view, color]);

  // ---------------------------------------------
  // Snapping & boundary constraint inside print area
  // ---------------------------------------------
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const SNAP = 8; // px
    const constrain = () => {
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const a = area.getBoundingRect(true, true);

      const objs = fc.getObjects().filter((o) => o.id !== "printArea");
      objs.forEach((o) => {
        const bb = o.getBoundingRect(true, true);

        // boundary clamp
        if (bb.left < a.left) o.left += a.left - bb.left;
        if (bb.top < a.top) o.top += a.top - bb.top;
        if (bb.left + bb.width > a.left + a.width)
          o.left -= bb.left + bb.width - (a.left + a.width);
        if (bb.top + bb.height > a.top + a.height)
          o.top -= bb.top + bb.height - (a.top + a.height);

        // snap to center lines (area center)
        const areaCx = a.left + a.width / 2;
        const areaCy = a.top + a.height / 2;
        const objCx = bb.left + bb.width / 2;
        const objCy = bb.top + bb.height / 2;

        if (Math.abs(objCx - areaCx) < SNAP) o.left += areaCx - objCx;
        if (Math.abs(objCy - areaCy) < SNAP) o.top += areaCy - objCy;

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

  // ---------------------------------------------
  // Rulers (real ticks; redraw on resize/zoom)
  // ---------------------------------------------
  const drawRulers = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !rulersOn) return;
    const W = fc.getWidth();
    const H = fc.getHeight();

    const top = document.getElementById("ps-ruler-top");
    const left = document.getElementById("ps-ruler-left");
    if (!top || !left) return;

    const unitPx = 50 * zoom; // tick every ~50px at current zoom
    const smallTick = 6;
    const bigTick = 12;

    // Horizontal
    const ctxT = top.getContext("2d");
    top.width = W;
    top.height = 20;
    ctxT.clearRect(0, 0, W, 20);
    ctxT.strokeStyle = "rgba(255,255,255,0.6)";
    ctxT.fillStyle = "rgba(255,255,255,0.8)";
    ctxT.lineWidth = 1;

    for (let x = 0; x <= W; x += unitPx) {
      const isBig = Math.round(x / unitPx) % 2 === 0;
      ctxT.beginPath();
      ctxT.moveTo(x + 0.5, 20);
      ctxT.lineTo(x + 0.5, 20 - (isBig ? bigTick : smallTick));
      ctxT.stroke();
      if (isBig) {
        ctxT.font = "10px monospace";
        ctxT.fillText(Math.round(x).toString(), x + 3, 10);
      }
    }

    // Vertical
    const ctxL = left.getContext("2d");
    left.width = 20;
    left.height = H;
    ctxL.clearRect(0, 0, 20, H);
    ctxL.strokeStyle = "rgba(255,255,255,0.6)";
    ctxL.fillStyle = "rgba(255,255,255,0.8)";
    ctxL.lineWidth = 1;

    for (let y = 0; y <= H; y += unitPx) {
      const isBig = Math.round(y / unitPx) % 2 === 0;
      ctxL.beginPath();
      ctxL.moveTo(20, y + 0.5);
      ctxL.lineTo(20 - (isBig ? bigTick : smallTick), y + 0.5);
      ctxL.stroke();
      if (isBig) {
        ctxL.font = "10px monospace";
        ctxL.fillText(Math.round(y).toString(), 2, y - 2);
      }
    }
  }, [rulersOn, zoom]);

  // ---------------------------------------------
  // Canvas actions
  // ---------------------------------------------
  const setZoomSafe = (v) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const z = Math.min(2, Math.max(0.6, v));
    setZoom(z);
    fc.setZoom(z);
    fc.requestRenderAll();
    drawRulers();
  };

  const addText = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const t = new window.fabric.IText("Your text", {
      left: fc.getWidth() * 0.5,
      top: fc.getHeight() * 0.5,
      originX: "center",
      originY: "center",
      fill: "#ffffff",
      fontSize: 42,
    });
    t._layerId = `layer_${Date.now()}`;
    pushHistory();
    fc.add(t);
    fc.setActiveObject(t);
    fc.requestRenderAll();
  };

  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(
      design.imageDataUrl,
      (img) => {
        img.set({
          left: fc.getWidth() * 0.5,
          top: fc.getHeight() * 0.5,
          originX: "center",
          originY: "center",
          scaleX: 0.5,
          scaleY: 0.5,
        });
        img._layerId = `layer_${Date.now()}`;
        pushHistory();
        fc.add(img);
        fc.setActiveObject(img);
        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  };

  const del = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const a = fc.getActiveObject();
    if (!a || a.id === "printArea") return;
    pushHistory();
    fc.remove(a);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };

  const centerHoriz = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const a = fc.getActiveObject();
    if (!a || a.id === "printArea") return;
    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area) return;
    const aBB = area.getBoundingRect(true, true);
    a.center();
    a.top = a.top + (aBB.top - fc.getHeight() / 2);
    a.left = aBB.left + aBB.width / 2;
    fc.requestRenderAll();
  };

  // ---------------------------------------------
  // Export: high-res print, upload & checkout
  // ---------------------------------------------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;

    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter((o) => o.id !== "printArea");
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    // Build output size from product type template
    const t = PLACEMENTS[productType] || PLACEMENTS.tshirt;
    const areaFrac = t[view] || t.front; // width/height fraction of canvas
    const outW = Math.round(areaFrac.w * fc.getWidth() * (DPI / 96)); // crude Px->DPI scale
    const outH = Math.round(areaFrac.h * fc.getHeight() * (DPI / 96));

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);
    const scaleFactor = outW / aBB.width;

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top - aBB.top + bb.height / 2;

      clone.originX = "center";
      clone.originY = "center";
      clone.left = relX * scaleFactor;
      clone.top = relY * scaleFactor;
      clone.scaleX = o.scaleX * scaleFactor;
      clone.scaleY = o.scaleY * scaleFactor;
      if (clone.type === "i-text") clone.fontSize = (o.fontSize || 42) * scaleFactor;

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

  // ---------------------------------------------
  // Derived color/size lists (ordered colors)
  // ---------------------------------------------
  const colorOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(v.color.toLowerCase()));
    (product?.colors || []).forEach((c) => set.add(c.toLowerCase()));
    const arr = [...set];
    // reorder by COLOR_ORDER, keeping unknowns at the end
    const known = arr.filter((c) => COLOR_ORDER.includes(c));
    const unknown = arr.filter((c) => !COLOR_ORDER.includes(c));
    const ordered = [
      ...COLOR_ORDER.filter((c) => known.includes(c)),
      ...unknown,
    ];
    return ordered;
  }, [product]);

  const sizeOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => {
      if (!color || v.color?.toLowerCase() === color.toLowerCase())
        v.size && set.add(v.size);
    });
    return [...set];
  }, [product, color]);

  const canCheckout =
    product &&
    (!colorOptions.length || color) &&
    (!sizeOptions.length || size) &&
    fabricRef.current &&
    fabricRef.current.getObjects().filter((o) => o.id !== "printArea").length > 0;

  // ---------------------------------------------
  // Layers UI helpers
  // ---------------------------------------------
  const getLayerList = () => {
    const fc = fabricRef.current;
    if (!fc) return [];
    return fc
      .getObjects()
      .filter((o) => o.id !== "printArea")
      .map((o, idx) => ({
        id: o._layerId || `layer_${idx}`,
        obj: o,
        label: (o.type || "object").toUpperCase(),
        visible: o.visible !== false,
        locked: !!o.lockMovementX || !!o.lockMovementY,
      }));
  };

  const toggleVisible = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const layer = getLayerList().find((l) => l.id === id);
    if (!layer) return;
    layer.obj.visible = !layer.obj.visible;
    fc.requestRenderAll();
  };

  const toggleLock = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const layer = getLayerList().find((l) => l.id === id);
    if (!layer) return;
    const locked = !(layer.obj.lockMovementX && layer.obj.lockMovementY);
    layer.obj.lockMovementX = locked;
    layer.obj.lockMovementY = locked;
    layer.obj.hasControls = !locked;
    layer.obj.selectable = !locked;
    fc.requestRenderAll();
  };

  const bringFwd = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const layer = getLayerList().find((l) => l.id === id);
    if (!layer) return;
    fc.bringForward(layer.obj);
    fc.requestRenderAll();
  };

  const sendBack = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const layer = getLayerList().find((l) => l.id === id);
    if (!layer) return;
    fc.sendBackwards(layer.obj);
    fc.requestRenderAll();
  };

  // ---------------------------------------------
  // UI
  // ---------------------------------------------
  return (
    <Flex className="ps-root" bg="brand.primary" minH="100vh" overflow="hidden">
      {/* LEFT: Controls */}
      <Box className="ps-left">
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" mb={1}>
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
                      {(availableViews || ["front"]).map((v) => (
                        <Button
                          key={v}
                          size="xs"
                          variant={view === v ? "solid" : "outline"}
                          onClick={() => setView(v)}
                        >
                          {v}
                        </Button>
                      ))}
                    </HStack>
                  </Box>

                  {/* Colors as dots */}
                  <Box>
                    <Text className="ps-label">Color</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {colorOptions.length ? (
                        colorOptions.map((c) => {
                          const key = c.toLowerCase();
                          const hex = COLOR_SWATCHES[key] || "#ccc";
                          const isSel =
                            key === String(color || "").toLowerCase();
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
                      ) : (
                        <Badge>No colors</Badge>
                      )}
                    </HStack>
                  </Box>

                  {/* Sizes */}
                  <Box>
                    <Text className="ps-label">Size</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {sizeOptions.length ? (
                        sizeOptions.map((s) => (
                          <Button
                            key={s}
                            size="xs"
                            variant={size === s ? "solid" : "outline"}
                            onClick={() => setSize(s)}
                          >
                            {s}
                          </Button>
                        ))
                      ) : (
                        <Badge>No size options</Badge>
                      )}
                    </HStack>
                  </Box>

                  {/* Zoom */}
                  <Box>
                    <Text className="ps-label">Zoom</Text>
                    <HStack>
                      <Button size="xs" onClick={() => setZoomSafe(zoom - 0.1)}>
                        −
                      </Button>
                      <Text fontSize="sm" color="whiteAlpha.800">
                        {zoom.toFixed(2)}x
                      </Text>
                      <Button size="xs" onClick={() => setZoomSafe(zoom + 0.1)}>
                        +
                      </Button>
                    </HStack>
                  </Box>

                  {/* Grid / Rulers / Mockup opacity */}
                  <HStack spacing={2}>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setRulersOn((v) => !v)}
                    >
                      {rulersOn ? "Hide rulers" : "Show rulers"}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setGridOn((v) => !v)}
                    >
                      {gridOn ? "Hide grid" : "Show grid"}
                    </Button>
                  </HStack>

                  <Box>
                    <Text className="ps-label">Mockup opacity</Text>
                    <input
                      type="range"
                      min="0.2"
                      max="1"
                      step="0.05"
                      value={mockupOpacity}
                      onChange={(e) => setMockupOpacity(parseFloat(e.target.value))}
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
                    We export a true print file at {DPI} DPI sized to the selected
                    placement.
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
                              <Image
                                src={d.imageDataUrl}
                                alt={d.prompt}
                                objectFit="cover"
                              />
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
                    (Use Fabric controls on the canvas to edit font, size, etc.)
                  </Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Undo/redo + delete + centerH */}
          <HStack pt={1}>
            <Tooltip label="Undo">
              <IconButton size="sm" onClick={undo} icon={<FaUndo />} />
            </Tooltip>
            <Tooltip label="Redo">
              <IconButton size="sm" onClick={redo} icon={<FaRedo />} />
            </Tooltip>
            <Tooltip label="Delete selected">
              <IconButton
                size="sm"
                onClick={del}
                colorScheme="red"
                variant="outline"
                icon={<FaTrash />}
              />
            </Tooltip>
            <Tooltip label="Center horizontally within print area">
              <IconButton size="sm" onClick={centerHoriz} icon={<FaArrowsAltH />} />
            </Tooltip>
          </HStack>
        </VStack>
      </Box>

      {/* CENTER: Rulers + Canvas */}
      <Box className="ps-center">
        {rulersOn && (
          <>
            <canvas id="ps-ruler-top" className="ps-ruler-top" />
            <canvas id="ps-ruler-left" className="ps-ruler-left" />
          </>
        )}

        <Box
          ref={wrapRef}
          className={`ps-canvas-wrap ${gridOn ? "ps-grid" : ""}`}
        >
          <canvas ref={canvasRef} className="ps-canvas" />
        </Box>
      </Box>

      {/* RIGHT: Layers (dockable) */}
      <Box className={`ps-right ${layersOpen ? "" : "collapsed"}`}>
        <HStack justify="space-between" px={3} py={2}>
          <Heading size="sm" color="brand.textLight">
            Layers
          </Heading>
          <IconButton
            aria-label="toggle layers"
            size="xs"
            onClick={() => setLayersOpen((v) => !v)}
            icon={layersOpen ? <FaChevronRight /> : <FaChevronLeft />}
          />
        </HStack>
        <Divider borderColor="whiteAlpha.300" mb={1} />
        <VStack align="stretch" spacing={1} px={2} className="ps-layers">
          {getLayerList().map((l) => (
            <HStack
              key={l.id}
              className={`ps-layer ${activeId === l.id ? "active" : ""}`}
              onClick={() => {
                const fc = fabricRef.current;
                if (!fc) return;
                fc.setActiveObject(l.obj);
                fc.requestRenderAll();
                setActiveId(l.id);
              }}
            >
              <Text className="ps-layer-label" noOfLines={1}>
                {l.label}
              </Text>
              <HStack ml="auto" spacing={1}>
                <IconButton
                  aria-label="visible"
                  size="xs"
                  variant="ghost"
                  icon={l.visible ? <FaEye /> : <FaEyeSlash />}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisible(l.id);
                  }}
                />
                <IconButton
                  aria-label="lock"
                  size="xs"
                  variant="ghost"
                  icon={l.locked ? <FaLock /> : <FaLockOpen />}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(l.id);
                  }}
                />
                <IconButton
                  aria-label="up"
                  size="xs"
                  variant="ghost"
                  icon={<FaChevronUp />}
                  onClick={(e) => {
                    e.stopPropagation();
                    bringFwd(l.id);
                  }}
                />
                <IconButton
                  aria-label="down"
                  size="xs"
                  variant="ghost"
                  icon={<FaChevronDown />}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendBack(l.id);
                  }}
                />
              </HStack>
            </HStack>
          ))}
          {!getLayerList().length && (
            <Text color="whiteAlpha.700" fontSize="xs" px={2} py={3}>
              Click a layer on canvas to select &amp; re-order. Add an image or
              text to get started.
            </Text>
          )}
        </VStack>
      </Box>
    </Flex>
  );
}
