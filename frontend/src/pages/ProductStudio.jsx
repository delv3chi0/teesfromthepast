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
  Icon,
  SimpleGrid,
  AspectRatio,
  Image,
  Tooltip,
  useToast,
  Skeleton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
  Divider,
  Badge,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
} from "@chakra-ui/react";
import {
  FaTrash,
  FaArrowsAltH,
  FaUndo,
  FaRedo,
  FaSearchMinus,
  FaSearchPlus,
  FaTshirt,
  FaHatCowboy,
  FaHockeyPuck,
  FaLayerGroup,
  FaChevronUp,
  FaChevronDown,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaLockOpen,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";
import styles from "./ProductStudio.module.css";

/** MOCKUPS import (works whether your generator exported default or named) */
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_MOD?.default ?? MOCKUPS_MOD?.MOCKUPS ?? {});

/** ------------------------------
 *  CONSTANTS / META
 *  ------------------------------ */
const DPI = 300;
/* Canvas aspect (visual working area). 3:4 keeps tees natural */
const PREVIEW_ASPECT = 3 / 4;
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

/** Calibrated print rectangles (percentages of the mockup image) */
const PRINT_META = {
  tshirt: {
    front: { x: 0.27, y: 0.18, w: 0.46, h: 0.53 },
    back: { x: 0.27, y: 0.20, w: 0.46, h: 0.53 },
    sleeve: { x: 0.65, y: 0.35, w: 0.18, h: 0.16 },
  },
  hoodie: {
    front: { x: 0.28, y: 0.23, w: 0.44, h: 0.48 },
    back: { x: 0.28, y: 0.22, w: 0.44, h: 0.52 },
  },
  tote: {
    front: { x: 0.30, y: 0.22, w: 0.40, h: 0.50 },
    back: { x: 0.30, y: 0.22, w: 0.40, h: 0.50 },
  },
  hat: {
    front: { x: 0.40, y: 0.38, w: 0.20, h: 0.12 },
  },
  beanie: {
    front: { x: 0.34, y: 0.42, w: 0.32, h: 0.14 },
  },
};

/** Color swatches + hex (normalize keys to lower).  */
const COLOR_HEX = {
  black: "#000000",
  maroon: "#7f1d1d",
  red: "#dc2626",
  orange: "#f97316",
  gold: "#facc15",
  lime: "#84cc16",
  green: "#22c55e",
  "forest green": "#166534",
  teal: "#14b8a6",
  "tropical blue": "#1ca3ec",
  blue: "#2563eb",
  "royal blue": "#1E40AF",
  purple: "#7c3aed",
  pink: "#ec4899",
  white: "#ffffff",
  charcoal: "#36454F",
  ash: "#b2beb5",
  grey: "#8e8e8e",
  sport_grey: "#B5B8B1",
  azalea: "#FF77A9",
  "brown savanna": "#7B5E57",
  brown: "#6D4C41",
  sand: "#E0CDA9",
  navy: "#0B1F44",
  "military green": "#4B5320",
};

/** Show swatches in this order: black → rainbow → white → extras */
const SWATCH_ORDER = [
  "black",
  "maroon",
  "red",
  "orange",
  "gold",
  "lime",
  "green",
  "teal",
  "tropical blue",
  "blue",
  "royal blue",
  "purple",
  "pink",
  "white",
];

/** Utils */
const norm = (s) =>
  String(s || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[_-]+/g, " ");
const normColorKey = (s) => norm(s);
const normSlug = (p) => norm(p?.slug || p?.name || "");

function detectProductType(product) {
  const t = `${product?.type || ""} ${product?.category || ""} ${product?.name || ""}`.toLowerCase();
  if (/(tee|t-shirt|shirt|unisex)/.test(t)) return "tshirt";
  if (/(hoodie|sweatshirt)/.test(t)) return "hoodie";
  if (/(tote|bag)/.test(t)) return "tote";
  if (/(hat|cap|trucker|snapback)/.test(t)) return "hat";
  if (/(beanie|knit)/.test(t)) return "beanie";
  return "tshirt";
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function ProductTypeBadgeIcon({ type }) {
  const Cmp =
    type === "tshirt"
      ? FaTshirt
      : type === "hoodie"
      ? FaTshirt
      : type === "hat"
      ? FaHatCowboy
      : type === "beanie"
      ? FaHockeyPuck
      : FaTshirt;
  return <Icon as={Cmp} color="brand.accentYellow" />;
}

/** ---------------------------------------------------
 *  MAIN
 *  --------------------------------------------------- */
export default function ProductStudio() {
  const toast = useToast();
  const navigate = useNavigate();
  const params = useParams();
  const query = useQuery();

  const slugParam = query.get("slug") || params.slug || "";
  const colorParam = query.get("color") || "";
  const sizeParam = query.get("size") || "";

  const [product, setProduct] = useState(null);
  const productType = useMemo(() => detectProductType(product), [product]);
  const availableViews = useMemo(() => {
    const map = {
      tshirt: ["front", "back", "sleeve"],
      hoodie: ["front", "back"],
      tote: ["front", "back"],
      hat: ["front"],
      beanie: ["front"],
    };
    return map[productType] || ["front"];
  }, [productType]);

  const [view, setView] = useState("front");

  /** Defaults */
  const [color, setColor] = useState(colorParam || "black");
  const [size, setSize] = useState(sizeParam || "");

  /** canvas state */
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const topRulerRef = useRef(null);
  const leftRulerRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);

  /** text + designs */
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  /** layers */
  const [layers, setLayers] = useState([]);

  /** history */
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  /** --------- Data fetch --------- */
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

        // default color = black, but fall back to first color if black doesn't exist
        const colorSet = new Set();
        (p?.variants || []).forEach((v) => v.color && colorSet.add(norm(v.color)));
        (p?.colors || []).forEach((c) => colorSet.add(norm(c)));
        const normalized = [...colorSet];
        const hasBlack = normalized.includes("black");
        setColor(hasBlack ? "black" : normalized[0] || "black");

        // default size (first available)
        const sizeSet = new Set();
        (p?.variants || []).forEach((v) => v.size && sizeSet.add(v.size));
        setSize(sizeSet.size ? [...sizeSet][0] : "");

        setView((v) =>
          (availableViews || []).includes(v) ? v : (availableViews || ["front"])[0]
        );
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDesigns(true);
        const res = await client.get("/mydesigns");
        if (!cancelled) setDesigns(res.data || []);
      } catch (_e) {
        // ignore
      } finally {
        if (!cancelled) setLoadingDesigns(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** --------- Canvas init / resize --------- */
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    const w = wrapRef.current.clientWidth;
    const h = wrapRef.current.clientHeight;

    if (!fabricRef.current) {
      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: w,
        height: h,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      // Grid background
      const drawGrid = () => {
        const spacing = 24 * zoom;
        const grid = new window.fabric.StaticCanvas(null, {
          width: fc.width,
          height: fc.height,
        });
        const lines = [];
        for (let i = 0; i < fc.width; i += spacing) {
          lines.push(
            new window.fabric.Line([i, 0, i, fc.height], {
              stroke: "rgba(255,255,255,0.06)",
              selectable: false,
              evented: false,
            })
          );
        }
        for (let j = 0; j < fc.height; j += spacing) {
          lines.push(
            new window.fabric.Line([0, j, fc.width, j], {
              stroke: "rgba(255,255,255,0.06)",
              selectable: false,
              evented: false,
            })
          );
        }
        lines.forEach((l) => grid.add(l));
        grid.renderAll();

        fc.setOverlayImage(
          showGrid ? grid.toDataURL({ format: "png" }) : null,
          fc.renderAll.bind(fc)
        );
      };

      drawGrid();

      // Track object changes for Layers + history
      const syncLayers = () => {
        const L = fc
          .getObjects()
          .filter((o) => o.id !== "printArea")
          .map((o, idx) => ({
            id: o.__uid || idx,
            type: o.type === "i-text" ? "TEXT" : "IMAGE",
            visible: o.visible !== false,
            locked: o.lockMovementX && o.lockMovementY,
            ref: o,
          }));
        setLayers(L);
      };

      const onAny = () => syncLayers();
      fc.on("object:added", onAny);
      fc.on("object:removed", onAny);
      fc.on("object:modified", onAny);
      fc.on("selection:created", onAny);
      fc.on("selection:updated", onAny);

      // rulers
      drawRulers();

      const ro = new ResizeObserver(() => {
        fc.setWidth(wrapRef.current.clientWidth);
        fc.setHeight(wrapRef.current.clientHeight);
        drawGrid();
        refreshBackground();
        drawRulers();
        fc.requestRenderAll();
      });
      ro.observe(wrapRef.current);

      return () => ro.disconnect();
    } else {
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      fabricRef.current.requestRenderAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapRef.current]);

  /** rulers drawing */
  const drawRulers = useCallback(() => {
    if (!showRulers) return;
    const fc = fabricRef.current;
    if (!fc) return;

    /** top ruler */
    if (topRulerRef.current) {
      const ctx = topRulerRef.current.getContext("2d");
      topRulerRef.current.width = topRulerRef.current.clientWidth;
      topRulerRef.current.height = topRulerRef.current.clientHeight;
      const w = topRulerRef.current.width;
      const h = topRulerRef.current.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "10px sans-serif";

      const step = 50 * zoom; // 50px step
      for (let x = 0, i = 0; x <= w; x += step, i += 1) {
        const isMajor = i % 2 === 0;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, h);
        ctx.lineTo(x + 0.5, isMajor ? 0 : h - 8);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.stroke();
        if (isMajor) {
          ctx.fillText(String(Math.round(x)), x + 2, 10);
        }
      }
    }

    /** left ruler */
    if (leftRulerRef.current) {
      const ctx = leftRulerRef.current.getContext("2d");
      leftRulerRef.current.width = leftRulerRef.current.clientWidth;
      leftRulerRef.current.height = leftRulerRef.current.clientHeight;
      const w = leftRulerRef.current.width;
      const h = leftRulerRef.current.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "10px sans-serif";

      const step = 50 * zoom;
      for (let y = 0, i = 0; y <= h; y += step, i += 1) {
        const isMajor = i % 2 === 0;
        ctx.beginPath();
        ctx.moveTo(w, y + 0.5);
        ctx.lineTo(isMajor ? 0 : 8, y + 0.5);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.stroke();
        if (isMajor) {
          ctx.save();
          ctx.translate(2, y + 10);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(String(Math.round(y)), 0, 0);
          ctx.restore();
        }
      }
    }
  }, [showRulers, zoom]);

  /** --------------- Background mockup + print area --------------- */
  const pickMockupUrl = (prod, v, c) => {
    const slugKey = normSlug(prod) || norm(slugParam);
    const colorKey = normColorKey(c);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[v];
    if (bySlug) return bySlug;

    // fallbacks through variant/files/images
    const variants = prod?.variants || [];
    const variant =
      variants.find((vv) => norm(vv.color || vv.colorName) === colorKey) ||
      variants[0];

    const tryFiles = (files = []) => {
      const pref = (t) =>
        files.find(
          (f) => f?.type === t && (f.preview_url || f.url || f.thumbnail_url)
        );
      const f = pref("preview") || pref("mockup") || files[0];
      return f?.preview_url || f?.url || f?.thumbnail_url || null;
    };

    if (variant?.imageSet?.length) {
      const primary =
        variant.imageSet.find((i) => i.isPrimary) || variant.imageSet[0];
      if (primary?.url) return primary.url;
    }
    if (variant?.files?.length) {
      const f = tryFiles(variant.files);
      if (f) return f;
    }
    if (prod?.images?.length) {
      const pimg = prod.images.find((i) => i.isPrimary) || prod.images[0];
      if (pimg?.url) return pimg.url;
      if (typeof prod.images[0] === "string") return prod.images[0];
    }
    if (variant?.image) return variant.image;
    if (prod?.image) return prod.image;

    return PLACEHOLDER;
  };

  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !product) return;

    const mockupUrl = pickMockupUrl(product, view, color) || PLACEHOLDER;

    // Keep existing user objects
    const userObjects = fc.getObjects().filter((o) => o.id !== "printArea");
    fc.clear();
    userObjects.forEach((o) => fc.add(o));

    window.fabric.Image.fromURL(
      mockupUrl,
      (img) => {
        // Fill width, stick to TOP CENTER
        const scale = fc.width / img.width;
        const bgW = img.width * scale;
        const bgH = img.height * scale;

        img.set({
          originX: "center",
          originY: "top",
          left: fc.width / 2,
          top: 0,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          opacity: mockupOpacity,
        });

        fc.setBackgroundImage(img, fc.renderAll.bind(fc));

        // Draw print area using calibrated percentages
        const meta = PRINT_META[productType]?.[view];
        const rect =
          meta ||
          PRINT_META.tshirt.front; // safe fallback for uncalibrated view

        const px = rect.x * bgW;
        const py = rect.y * bgH;
        const pw = rect.w * bgW;
        const ph = rect.h * bgH;

        // Create dashed overlay rectangle
        const pa = new window.fabric.Rect({
          id: "printArea",
          left: px + (fc.width - bgW) / 2, // because bg is centered
          top: py,
          width: pw,
          height: ph,
          originX: "left",
          originY: "top",
          fill: "",
          stroke: "rgba(255,255,255,0.9)",
          strokeDashArray: [6, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
        });

        fc.add(pa);
        fc.requestRenderAll();
        drawRulers();
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, view, color, productType, mockupOpacity, drawRulers]);

  useEffect(() => {
    if (product) refreshBackground();
  }, [product, refreshBackground, view, color]);

  /** keep objects inside print area */
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    const constrain = () => {
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const a = area.getBoundingRect(true, true);
      const objs = fc.getObjects().filter((o) => o.id !== "printArea");

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

  /** history helpers */
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
    fc.loadFromJSON(json, () => fc.renderAll());
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

  /** actions */
  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim())
      return toast({ title: "Enter text first", status: "info" });
    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2,
      top: fc.height / 3,
      originX: "center",
      originY: "center",
      fill: textColor,
      fontSize: textSize,
    });
    pushHistory();
    fc.add(t);
    fc.setActiveObject(t);
    fc.requestRenderAll();
    setTextValue("");
  };
  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(
      design.imageDataUrl,
      (img) => {
        img.set({
          left: fc.width / 2,
          top: fc.height / 2.5,
          originX: "center",
          originY: "center",
          scaleX: 0.6,
          scaleY: 0.6,
        });
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
    drawRulers();
    fc.requestRenderAll();
  };

  /** Layers panel helpers */
  const toggleLayerVisibility = (layerIdx) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const userObjs = fc.getObjects().filter((o) => o.id !== "printArea");
    const tgt = userObjs[layerIdx];
    if (!tgt) return;
    tgt.visible = !tgt.visible;
    fc.requestRenderAll();
    setLayers((L) =>
      L.map((l, i) => (i === layerIdx ? { ...l, visible: tgt.visible } : l))
    );
  };
  const lockToggle = (layerIdx) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const userObjs = fc.getObjects().filter((o) => o.id !== "printArea");
    const tgt = userObjs[layerIdx];
    if (!tgt) return;
    const locked = !(tgt.lockMovementX && tgt.lockMovementY);
    tgt.lockMovementX = tgt.lockMovementY = locked;
    tgt.selectable = !locked;
    fc.requestRenderAll();
    setLayers((L) =>
      L.map((l, i) => (i === layerIdx ? { ...l, locked } : l))
    );
  };
  const moveLayer = (layerIdx, dir) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const userObjs = fc.getObjects().filter((o) => o.id !== "printArea");
    const tgt = userObjs[layerIdx];
    if (!tgt) return;
    const delta = dir === "up" ? -1 : 1;
    const newIndex = layerIdx + delta;
    if (newIndex < 0 || newIndex >= userObjs.length) return;
    fc.moveTo(tgt, newIndex + 1); // +1 because printArea sits at 0
    fc.requestRenderAll();
    // rebuild layers list
    const rebuilt = fc
      .getObjects()
      .filter((o) => o.id !== "printArea")
      .map((o, idx) => ({
        id: o.__uid || idx,
        type: o.type === "i-text" ? "TEXT" : "IMAGE",
        visible: o.visible !== false,
        locked: o.lockMovementX && o.lockMovementY,
        ref: o,
      }));
    setLayers(rebuilt);
  };

  /** Available colors/sizes (ordered swatches) */
  const colorOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(norm(v.color)));
    (product?.colors || []).forEach((c) => set.add(norm(c)));
    const list = [...set];

    // sort using SWATCH_ORDER priority, then alpha
    const priority = Object.fromEntries(SWATCH_ORDER.map((c, i) => [c, i]));
    list.sort((a, b) => {
      const pa = priority[a] ?? 999;
      const pb = priority[b] ?? 999;
      return pa === pb ? a.localeCompare(b) : pa - pb;
    });
    return list;
  }, [product]);

  const sizeOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(
      (v) => (!color || norm(v.color) === norm(color)) && v.size && set.add(v.size)
    );
    return [...set];
  }, [product, color]);

  const canProceed =
    product && (!colorOptions.length || color) && (!sizeOptions.length || size);

  /** Export print-ready, upload, and proceed to checkout */
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;

    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area)
      return toast({ title: "No print area defined", status: "error" });

    const objs = fc.getObjects().filter((o) => o.id !== "printArea");
    if (!objs.length)
      return toast({ title: "Nothing to print", status: "warning" });

    // Output size from calibrated meta (in inches)
    const areaDef =
      PRINT_META[productType]?.[view] || PRINT_META.tshirt.front;
    const outW = Math.round(areaDef.w * fc.width * (DPI / (fc.width / 12))); // approx scaling
    const outH = Math.round(areaDef.h * fc.height * (DPI / (fc.height / 16)));

    // Safer: compute based on PA rect pixels → inches (assume 300 dpi @ mockup scale)
    const aBB = area.getBoundingRect(true, true);
    const pxPerIn = (DPI / 300) * (aBB.width / (areaDef.w * fc.width)); // coarse normalization
    const targetW = Math.max(600, Math.round(aBB.width * (DPI / 72))); // ensure decent size

    const tmp = new window.fabric.Canvas(null, {
      width: Math.round(aBB.width * (DPI / 2.4)),
      height: Math.round(aBB.height * (DPI / 2.4)),
    });

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      clone.originX = "left";
      clone.originY = "top";
      clone.left = (bb.left - aBB.left) * (DPI / 2.4);
      clone.top = (bb.top - aBB.top) * (DPI / 2.4);
      clone.scaleX = o.scaleX * (DPI / 2.4);
      clone.scaleY = o.scaleY * (DPI / 2.4);
      if (clone.type === "i-text")
        clone.fontSize = (o.fontSize || 36) * (DPI / 2.4);
      tmp.add(clone);
    });
    tmp.requestRenderAll();

    const png = tmp.toDataURL({ format: "png", quality: 1 });
    tmp.dispose();
    const previewPNG = fc.toDataURL({ format: "png", quality: 0.92 });

    toast({ title: "Uploading design…", status: "info", duration: 2000 });
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

  /** UI bits */
  const ColorDot = ({ c }) => {
    const hex = COLOR_HEX[c] || "#ccc";
    const active = norm(c) === norm(color);
    return (
      <Tooltip label={c}>
        <Box
          as="button"
          onClick={() => setColor(c)}
          aria-label={c}
          borderRadius="full"
          boxSize="14px"
          borderWidth={active ? "2px" : "1px"}
          borderColor={active ? "yellow.400" : "blackAlpha.600"}
          background={hex}
        />
      </Tooltip>
    );
  };

  return (
    <div className={styles.root}>
      {/* Left Panel */}
      <Box className={styles.leftPanel}>
        <VStack align="stretch" spacing={4} layerStyle="cardBlue" p={4} rounded="md">
          <HStack justify="space-between">
            <HStack>
              <ProductTypeBadgeIcon type={productType} />
              <Heading size="md" color="brand.textLight">
                {product?.name || "Product"}
              </Heading>
            </HStack>
            <Badge variant="outline" colorScheme="yellow" opacity={0.8}>
              {productType}
            </Badge>
          </HStack>

          <Tabs variant="enclosed" colorScheme="yellow" size="sm">
            <TabList>
              <Tab>Options</Tab>
              <Tab>Designs</Tab>
              <Tab>Text</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      View
                    </Text>
                    <HStack wrap="wrap" spacing={2}>
                      {availableViews.map((v) => (
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

                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      Color
                    </Text>
                    <HStack spacing={2} wrap="wrap">
                      {colorOptions.length ? (
                        colorOptions.map((c) => <ColorDot key={c} c={c} />)
                      ) : (
                        <Badge>No color options</Badge>
                      )}
                    </HStack>
                  </Box>

                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      Size
                    </Text>
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

                  <Divider borderColor="whiteAlpha.300" />

                  <VStack align="stretch" spacing={2}>
                    <Text color="brand.textLight" fontWeight="medium">
                      Canvas zoom
                    </Text>
                    <HStack>
                      <Tooltip label="Zoom out">
                        <Button
                          size="xs"
                          onClick={() => setZoomSafe(zoom - 0.1)}
                          leftIcon={<FaSearchMinus />}
                        >
                          Out
                        </Button>
                      </Tooltip>
                      <Slider
                        aria-label="zoom"
                        value={zoom}
                        min={0.5}
                        max={2}
                        step={0.1}
                        onChange={setZoomSafe}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Tooltip label="Zoom in">
                        <Button
                          size="xs"
                          onClick={() => setZoomSafe(zoom + 0.1)}
                          leftIcon={<FaSearchPlus />}
                        >
                          In
                        </Button>
                      </Tooltip>
                    </HStack>
                  </VStack>

                  <HStack>
                    <Switch
                      size="sm"
                      isChecked={showGrid}
                      onChange={(e) => {
                        setShowGrid(e.target.checked);
                        const fc = fabricRef.current;
                        if (fc) {
                          // re-trigger overlay grid draw
                          fc.setOverlayImage(null, () => {
                            const spacing = 24 * zoom;
                            const grid = new window.fabric.StaticCanvas(null, {
                              width: fc.width,
                              height: fc.height,
                            });
                            if (e.target.checked) {
                              for (let i = 0; i < fc.width; i += spacing) {
                                grid.add(
                                  new window.fabric.Line([i, 0, i, fc.height], {
                                    stroke: "rgba(255,255,255,0.06)",
                                  })
                                );
                              }
                              for (let j = 0; j < fc.height; j += spacing) {
                                grid.add(
                                  new window.fabric.Line([0, j, fc.width, j], {
                                    stroke: "rgba(255,255,255,0.06)",
                                  })
                                );
                              }
                            }
                            grid.renderAll();
                            fc.setOverlayImage(
                              e.target.checked
                                ? grid.toDataURL({ format: "png" })
                                : null,
                              fc.renderAll.bind(fc)
                            );
                          });
                        }
                      }}
                    />
                    <Text fontSize="sm">Grid</Text>

                    <Switch
                      size="sm"
                      isChecked={showRulers}
                      onChange={(e) => {
                        setShowRulers(e.target.checked);
                        drawRulers();
                      }}
                      ml={4}
                    />
                    <Text fontSize="sm">Rulers</Text>
                  </HStack>

                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      Mockup opacity
                    </Text>
                    <Slider
                      value={mockupOpacity}
                      min={0.2}
                      max={1}
                      step={0.05}
                      onChange={(v) => {
                        setMockupOpacity(v);
                        refreshBackground();
                      }}
                    >
                      <SliderTrack>
                        <SliderFilledTrack />
                      </SliderTrack>
                      <SliderThumb />
                    </Slider>
                  </Box>

                  <Button
                    colorScheme="yellow"
                    isDisabled={!canProceed}
                    onClick={makePrintReadyAndUpload}
                  >
                    Add to cart / Checkout
                  </Button>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    We export a true print file at 300 DPI sized to the current
                    placement.
                  </Text>
                </VStack>
              </TabPanel>

              <TabPanel px={0}>
                {loadingDesigns ? (
                  <VStack align="stretch">
                    <Skeleton height="28px" />
                    <Skeleton height="28px" />
                  </VStack>
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
                  <Text color="brand.textLight" fontSize="sm">
                    No saved designs yet. Create one in “Create”.
                  </Text>
                )}
              </TabPanel>

              <TabPanel px={0}>
                <VStack align="stretch" spacing={3}>
                  <Text color="brand.textLight" fontWeight="medium">
                    Add Text
                  </Text>
                  <HStack>
                    <Input
                      value={textValue}
                      onChange={(e) => setTextValue(e.target.value)}
                      placeholder="Your text"
                    />
                    <Button onClick={addText}>Add</Button>
                  </HStack>
                  <HStack mt={2} spacing={3}>
                    <Input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      w="52px"
                      p={0}
                    />
                    <NumberInput
                      value={textSize}
                      min={8}
                      max={200}
                      onChange={(v) =>
                        setTextSize(parseInt(v || "36", 10))
                      }
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </HStack>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>

      {/* Canvas Column */}
      <Box className={styles.canvasCol} position="relative">
        <div
          className={styles.canvasViewport}
          style={
            showRulers
              ? { "--stage-left": "22px", "--stage-top": "22px" }
              : undefined
          }
        >
          {/* rulers */}
          {showRulers && (
            <>
              <canvas ref={topRulerRef} className={styles.rulerTop} />
              <canvas ref={leftRulerRef} className={styles.rulerLeft} />
            </>
          )}

          {/* top-right toolbar */}
          <HStack className={styles.stageToolbar}>
            <Tooltip label="Undo">
              <Button size="xs" onClick={undo} leftIcon={<FaUndo />}>
                Undo
              </Button>
            </Tooltip>
            <Tooltip label="Redo">
              <Button size="xs" onClick={redo} leftIcon={<FaRedo />}>
                Redo
              </Button>
            </Tooltip>
            <Tooltip label="Center horizontally">
              <Button size="xs" onClick={centerH} leftIcon={<FaArrowsAltH />}>
                Center
              </Button>
            </Tooltip>
            <Tooltip label="Delete selected">
              <Button
                size="xs"
                onClick={del}
                colorScheme="red"
                variant="outline"
              >
                <FaTrash />
              </Button>
            </Tooltip>
          </HStack>

          {/* stage */}
          <div className={styles.stageInset}>
            <canvas ref={canvasRef} className={styles.fabricCanvas} />
          </div>
        </div>
      </Box>

      {/* Right Panel – Layers */}
      <Box className={styles.rightPanel}>
        <VStack align="stretch" spacing={3} layerStyle="cardBlue" p={4} rounded="md">
          <HStack>
            <FaLayerGroup />
            <Heading size="sm">Layers</Heading>
          </HStack>
          {layers.length === 0 ? (
            <Text fontSize="sm" color="whiteAlpha.700">
              No layers yet. Add an image or text.
            </Text>
          ) : (
            <VStack align="stretch" spacing={2}>
              {layers
                .map((l, i) => ({ ...l, idx: i }))
                .reverse() /* top-most first */
                .map((l) => (
                  <HStack
                    key={l.id}
                    justify="space-between"
                    borderWidth="1px"
                    borderColor="whiteAlpha.300"
                    rounded="md"
                    px={2}
                    py={1}
                  >
                    <HStack>
                      <Badge>{l.type}</Badge>
                    </HStack>
                    <HStack>
                      <Tooltip label={l.visible ? "Hide" : "Show"}>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            toggleLayerVisibility(layers.length - 1 - l.idx)
                          }
                        >
                          {l.visible ? <FaEye /> : <FaEyeSlash />}
                        </Button>
                      </Tooltip>
                      <Tooltip label={l.locked ? "Unlock" : "Lock"}>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => lockToggle(layers.length - 1 - l.idx)}
                        >
                          {l.locked ? <FaLock /> : <FaLockOpen />}
                        </Button>
                      </Tooltip>
                      <Tooltip label="Bring forward">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => moveLayer(layers.length - 1 - l.idx, "up")}
                        >
                          <FaChevronUp />
                        </Button>
                      </Tooltip>
                      <Tooltip label="Send backward">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            moveLayer(layers.length - 1 - l.idx, "down")
                          }
                        >
                          <FaChevronDown />
                        </Button>
                      </Tooltip>
                    </HStack>
                  </HStack>
                ))}
            </VStack>
          )}
        </VStack>
      </Box>
    </div>
  );
}
