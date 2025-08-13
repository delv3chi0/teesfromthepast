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
  NumberInput,
  NumberInputField,
  IconButton,
  Input,
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
  FaRedoAlt,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaLockOpen,
  FaChevronUp,
  FaChevronDown,
  FaUpload,
  FaCompressAlt,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";

// Robust mockups import (default or named export ok)
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS =
  (MOCKUPS_MOD && (MOCKUPS_MOD.default || MOCKUPS_MOD.MOCKUPS)) || {};

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const DPI = 300;
const CANVAS_ASPECT = 3 / 4; // portrait canvas area
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Print sizes (inches) and top chest inset (inches)
const PRINT_AREAS = {
  tshirt: {
    front: { w: 12, h: 16, topInsetIn: 3.0 },
    back: { w: 12, h: 16, topInsetIn: 4.0 },
    left: { w: 4, h: 3.5, topInsetIn: 2.0 },
    right: { w: 4, h: 3.5, topInsetIn: 2.0 },
  },
  hoodie: {
    front: { w: 12, h: 14, topInsetIn: 3.0 },
    back: { w: 12, h: 16, topInsetIn: 4.0 },
  },
  tote: {
    front: { w: 14, h: 16, topInsetIn: 4.0 },
    back: { w: 14, h: 16, topInsetIn: 4.0 },
  },
  hat: { front: { w: 4, h: 1.75, topInsetIn: 1.5 } },
  beanie: { front: { w: 5, h: 1.75, topInsetIn: 1.2 } },
};

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "left", "right"],
  hoodie: ["front", "back"],
  tote: ["front", "back"],
  hat: ["front"],
  beanie: ["front"],
};

function detectProductType(product) {
  const text = `${product?.type || product?.category || ""} ${
    product?.name || ""
  }`.toLowerCase();
  if (/(tee|t-shirt|shirt|unisex)/.test(text)) return "tshirt";
  if (/(hoodie|sweatshirt)/.test(text)) return "hoodie";
  if (/(tote|bag)/.test(text)) return "tote";
  if (/(hat|cap|trucker|snapback)/.test(text)) return "hat";
  if (/(beanie|knit)/.test(text)) return "beanie";
  return "tshirt";
}

const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normSlug = (p) => norm(p?.slug || p?.name || "");
const toKey = (c) =>
  String(c || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");

// Color swatches copied from ProductCard.jsx so they match
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

// Desired order (roughly dark→light, then others)
const SWATCH_ORDER = [
  "black",
  "maroon",
  "red",
  "royal",
  "royal blue",
  "purple",
  "charcoal",
  "navy",
  "military green",
  "forest green",
  "lime",
  "tropical blue",
  "gold",
  "orange",
  "azalea",
  "brown",
  "brown savana",
  "brown savanna",
  "sand",
  "ash",
  "sport_grey",
  "grey",
  "white",
];

function ProductTypeBadgeIcon({ type }) {
  const IconCmp =
    type === "tshirt"
      ? FaTshirt
      : type === "hoodie"
      ? FaTshirt
      : type === "hat"
      ? FaHatCowboy
      : type === "beanie"
      ? FaHockeyPuck
      : FaTshirt;
  return <Icon as={IconCmp} color="brand.accentYellow" />;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Helper: try URLs until one actually loads
function probeImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("load fail"));
    img.src = url;
  });
}
async function firstWorkingUrl(candidates) {
  for (const u of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const ok = await probeImage(u);
      return ok;
    } catch {
      /* try next */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------

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

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const clipRef = useRef(null); // print area clip

  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [mockupVisible, setMockupVisible] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);

  const [activeSel, setActiveSel] = useState(null);
  const [layerTick, setLayerTick] = useState(0);

  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const warnedRef = useRef(false);
  const guideVRef = useRef(null);
  const guideHRef = useRef(null);

  // Designs tab
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  // --------------------- Data fetch ---------------------
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

        // Default color: prefer black if present
        const colorSet = new Set();
        (p?.variants || []).forEach((v) => v.color && colorSet.add(toKey(v.color)));
        (p?.colors || []).forEach((c) => c && colorSet.add(toKey(c)));
        const colors = [...colorSet];
        if (!colorParam && colors.length) {
          setColor(colors.includes("black") ? "black" : colors[0]);
        }

        // Default size from variants
        if (!sizeParam) {
          const sizeSet = new Set();
          (p?.variants || []).forEach((v) => v.size && sizeSet.add(v.size));
          const first = sizeSet.values().next().value;
          if (first) setSize(first);
        }

        if (!availableViews.includes(view)) setView(availableViews[0]);
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
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingDesigns(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------- Fabric init ---------------------
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

      const refreshSel = () => {
        const a = fc.getActiveObject();
        if (!a) {
          setActiveSel(null);
          return;
        }
        setActiveSel({
          x: Math.round(a.left || 0),
          y: Math.round(a.top || 0),
          w: Math.round(a.getScaledWidth()),
          h: Math.round(a.getScaledHeight()),
          angle: Math.round(a.angle || 0),
        });
      };

      const tick = () => setLayerTick((t) => t + 1);
      const onChange = () => {
        setHasObjects(
          fc.getObjects().some(
            (o) => o.id !== "printArea" && o.id !== "gridOverlay" && o.id !== "guide"
          )
        );
        tick();
      };

      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", () => {
        onChange();
        refreshSel();
      });
      fc.on("selection:created", refreshSel);
      fc.on("selection:updated", refreshSel);
      fc.on("selection:cleared", refreshSel);

      // Keyboard shortcuts
      const onKey = (e) => {
        const active = fc.getActiveObject();

        // zoom
        if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
          e.preventDefault();
          setZoomSafe(zoom + 0.1);
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "-") {
          e.preventDefault();
          setZoomSafe(zoom - 0.1);
          return;
        }
        // grid toggle
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "g") {
          setShowGrid((v) => !v);
          refreshBackground();
          return;
        }
        // mockup toggle
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "m") {
          setMockupVisible((v) => !v);
          refreshBackground();
          return;
        }
        // fit center
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "f") {
          autoFit();
          return;
        }
        if (!active) return;

        const step = e.shiftKey ? 5 : 1;
        let moved = false;
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          del();
          return;
        }
        if (e.key === "ArrowLeft") {
          active.left -= step;
          moved = true;
        }
        if (e.key === "ArrowRight") {
          active.left += step;
          moved = true;
        }
        if (e.key === "ArrowUp") {
          active.top -= step;
          moved = true;
        }
        if (e.key === "ArrowDown") {
          active.top += step;
          moved = true;
        }
        if (e.key === "Escape") {
          fc.discardActiveObject();
          fc.requestRenderAll();
          return;
        }
        if (moved) {
          active.setCoords();
          fc.requestRenderAll();
          refreshSel();
        }
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

  // --------------------- Mockup helpers ---------------------

  function cloudinarySimple(colorKey, viewKey) {
    // Your intended simple structure (no version)
    return `https://res.cloudinary.com/dqvsdvjis/image/upload/mockups/classic-tee/tee-${colorKey}/${viewKey}.png`;
    // e.g. .../mockups/classic-tee/tee-black/front.png
  }
  function cloudinaryNested(colorKey, viewKey) {
    // Your earlier sample with duplicated path segments
    // (this covers uploads that ended up nested)
    return `https://res.cloudinary.com/dqvsdvjis/image/upload/mockups/classic-tee/tee-${colorKey}/mockups/classic-tee/tee-${colorKey}/${viewKey}.png`;
  }
  function localPublic(colorKey, viewKey) {
    // Your /public tree in the repo
    return `/mockups/classic-tee/tee-${colorKey}/${viewKey}.png`;
  }

  async function pickWorkingMockupUrl(product, view, color) {
    const slugKey = normSlug(product) || norm(slugParam);
    const colorKey = toKey(color).replace(/\s+/g, "-");
    const viewKey = (view || "front").toLowerCase();

    const fromMap = MOCKUPS?.[slugKey]?.[colorKey]?.[viewKey] || null;

    const candidates = [
      // Cloudinary first
      cloudinarySimple(colorKey, viewKey),
      cloudinaryNested(colorKey, viewKey),
      // Local public fallback
      localPublic(colorKey, viewKey),
      // Data/mockups map if provided
      fromMap,
      // Product/variant fallbacks last
      product?.images?.find?.((i) => i.isPrimary)?.url ||
        (Array.isArray(product?.images) && typeof product.images[0] === "string"
          ? product.images[0]
          : product?.images?.[0]?.url),
      product?.variants?.[0]?.image ||
        product?.variants?.[0]?.imageSet?.[0]?.url ||
        product?.image,
      PLACEHOLDER,
    ].filter(Boolean);

    const ok = await firstWorkingUrl(candidates);
    return ok || PLACEHOLDER;
  }

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

  // Background + print area + clip
  const refreshBackground = useCallback(async () => {
    const fc = fabricRef.current;
    if (!fc || !product) return;

    const userObjs = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay" && o.id !== "guide");
    fc.clear();
    userObjs.forEach((o) => fc.add(o));

    // get first working image url
    const url = await pickWorkingMockupUrl(product, view, color);

    window.fabric.Image.fromURL(
      url,
      (img) => {
        // Fit by height, center horizontally, pin top
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
              scaleX: 1,
              scaleY: 1,
            });
            fc.setOverlayImage(gridImg, fc.renderAll.bind(fc));
          },
          { crossOrigin: "anonymous" }
        );

        // PRINT AREA — inches→px using same mockup scale
        const areaDef =
          PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;

        const pxW = areaDef.w * DPI * (scale / 3); // screen mapping
        const pxH = areaDef.h * DPI * (scale / 3);
        const topInsetPx = areaDef.topInsetIn * DPI * (scale / 3);

        const left = fc.width / 2 - pxW / 2;
        const top = img.top + topInsetPx;

        const rect = new window.fabric.Rect({
          id: "printArea",
          left,
          top,
          width: pxW,
          height: pxH,
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

        // one shared clipPath to hide overflow outside area
        const clipRect = new window.fabric.Rect({
          left,
          top,
          width: pxW,
          height: pxH,
          absolutePositioned: true,
          originX: "left",
          originY: "top",
        });
        clipRef.current = clipRect;

        fc.getObjects()
          .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay")
          .forEach((o) => (o.clipPath = clipRect));

        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  }, [
    product,
    view,
    color,
    mockupOpacity,
    mockupVisible,
    showGrid,
    makeGridOverlay,
    productType,
  ]);

  useEffect(() => {
    if (!product || !fabricRef.current) return;
    refreshBackground();
  }, [product, refreshBackground]);

  // Smart guides + clamp + warn
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const SNAP = 8;

    const hideGuides = () => {
      [guideVRef.current, guideHRef.current].forEach((g) => {
        if (g) fc.remove(g);
      });
      guideVRef.current = null;
      guideHRef.current = null;
      fc.requestRenderAll();
    };

    const showGuide = (axis, x1, y1, x2, y2) => {
      const line = new window.fabric.Line([x1, y1, x2, y2], {
        stroke: "#FFD54F",
        strokeWidth: 1,
        selectable: false,
        evented: false,
        strokeDashArray: [4, 4],
        id: "guide",
        excludeFromExport: true,
      });
      if (axis === "v") {
        if (guideVRef.current) fc.remove(guideVRef.current);
        guideVRef.current = line;
      } else {
        if (guideHRef.current) fc.remove(guideHRef.current);
        guideHRef.current = line;
      }
      fc.add(line);
    };

    const onTransform = () => {
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const a = area.getBoundingRect(true, true);

      const o = fc.getActiveObject();
      if (!o) {
        hideGuides();
        return;
      }
      const bb = o.getBoundingRect(true, true);

      // snap to center
      const cx = a.left + a.width / 2;
      const cy = a.top + a.height / 2;
      const ocx = bb.left + bb.width / 2;
      const ocy = bb.top + bb.height / 2;

      let snapV = false;
      let snapH = false;

      if (Math.abs(ocx - cx) < SNAP) {
        o.left += cx - ocx;
        snapV = true;
      }
      if (Math.abs(ocy - cy) < SNAP) {
        o.top += cy - ocy;
        snapH = true;
      }

      // snap to edges
      const edges = [
        { delta: bb.left - a.left, axis: "v", line: a.left },
        { delta: bb.left + bb.width - (a.left + a.width), axis: "v", line: a.left + a.width },
        { delta: bb.top - a.top, axis: "h", line: a.top },
        { delta: bb.top + bb.height - (a.top + a.height), axis: "h", line: a.top + a.height },
      ];
      edges.forEach((e) => {
        if (Math.abs(e.delta) < SNAP) {
          if (e.axis === "v") {
            o.left -= e.delta;
            snapV = true;
          } else {
            o.top -= e.delta;
            snapH = true;
          }
        }
      });

      // clamp
      const bb2 = o.getBoundingRect(true, true);
      if (bb2.left < a.left) o.left += a.left - bb2.left;
      if (bb2.top < a.top) o.top += a.top - bb2.top;
      if (bb2.left + bb2.width > a.left + a.width)
        o.left -= bb2.left + bb2.width - (a.left + a.width);
      if (bb2.top + bb2.height > a.top + a.height)
        o.top -= bb2.top + bb2.height - (a.top + a.height);

      o.setCoords();

      const overflow =
        bb2.left < a.left ||
        bb2.top < a.top ||
        bb2.left + bb2.width > a.left + a.width ||
        bb2.top + bb2.height > a.top + a.height;
      if (overflow && !warnedRef.current) {
        warnedRef.current = true;
        toast({
          title: "Part of your design is outside the print area",
          status: "warning",
          duration: 1400,
        });
        setTimeout(() => (warnedRef.current = false), 1000);
      }

      hideGuides();
      if (snapV) showGuide("v", cx, a.top, cx, a.top + a.height);
      if (snapH) showGuide("h", a.left, cy, a.left + a.width, cy);

      fc.requestRenderAll();
    };

    fc.on("object:moving", onTransform);
    fc.on("object:scaling", onTransform);
    fc.on("object:rotating", onTransform);
    fc.on("mouse:up", hideGuides);
    fc.on("selection:cleared", hideGuides);

    return () => {
      fc.off("object:moving", onTransform);
      fc.off("object:scaling", onTransform);
      fc.off("object:rotating", onTransform);
      fc.off("mouse:up", hideGuides);
      fc.off("selection:cleared", hideGuides);
    };
  }, [toast]);

  // --------------------- Actions ---------------------

  const pushHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id"])));
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

  const setZoomSafe = (z) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const clamped = Math.max(0.75, Math.min(2, z));
    setZoom(clamped);
    fc.setZoom(clamped);
    fc.requestRenderAll();
  };

  const addText = () => {
    const fc = fabricRef.current;
    const textValue = prompt("Enter text");
    if (!fc || !textValue || !textValue.trim()) return;
    const t = new window.fabric.IText(textValue.trim(), {
      left: fc.width / 2,
      top: fc.height / 2,
      originX: "center",
      originY: "center",
      fill: "#ffffff",
      fontSize: 36,
    });
    t.clipPath = clipRef.current || null;
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
          left: fc.width / 2,
          top: fc.height / 2,
          originX: "center",
          originY: "center",
          scaleX: 0.5,
          scaleY: 0.5,
        });
        img.clipPath = clipRef.current || null;
        pushHistory();
        fc.add(img);
        fc.setActiveObject(img);
        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
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
          grp.set({
            left: fc.width / 2,
            top: fc.height / 2,
            originX: "center",
            originY: "center",
            scaleX: 0.6,
            scaleY: 0.6,
          });
          grp.clipPath = clipRef.current || null;
          pushHistory();
          fc.add(grp);
          fc.setActiveObject(grp);
          fc.requestRenderAll();
        });
      } else {
        window.fabric.Image.fromURL(url, (img) => {
          img.set({
            left: fc.width / 2,
            top: fc.height / 2,
            originX: "center",
            originY: "center",
            scaleX: 0.5,
            scaleY: 0.5,
          });
          img.clipPath = clipRef.current || null;
          pushHistory();
          fc.add(img);
          fc.setActiveObject(img);
          fc.requestRenderAll();
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const del = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea" || active.id === "gridOverlay" || active.id === "guide") return;
    pushHistory();
    fc.remove(active);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };

  const centerH = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o) return;
    const area = fc.getObjects().find((x) => x.id === "printArea");
    if (!area) return;
    const a = area.getBoundingRect(true, true);
    const bb = o.getBoundingRect(true, true);
    o.left += a.left + a.width / 2 - (bb.left + bb.width / 2);
    o.setCoords();
    fc.requestRenderAll();
  };

  const autoFit = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o) return;
    const area = fc.getObjects().find((x) => x.id === "printArea");
    if (!area) return;
    const a = area.getBoundingRect(true, true);
    // fit (preserve aspect) to 90% of area
    const maxW = a.width * 0.9;
    const maxH = a.height * 0.9;
    const ow = o.getScaledWidth();
    const oh = o.getScaledHeight();
    const s = Math.min(maxW / ow, maxH / oh);
    o.scaleX *= s;
    o.scaleY *= s;
    // center
    const bb = o.getBoundingRect(true, true);
    o.left += a.left + a.width / 2 - (bb.left + bb.width / 2);
    o.top += a.top + a.height / 2 - (bb.top + bb.height / 2);
    o.setCoords();
    fc.requestRenderAll();
  };

  // Export high‑res 300 DPI
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;

    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay" && o.id !== "guide");
    if (!objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const areaDef =
      PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    const outW = Math.round(areaDef.w * DPI);
    const outH = Math.round(areaDef.h * DPI);

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
      clone.clipPath = null; // no clip in final export
      if (clone.type === "i-text")
        clone.fontSize = (o.fontSize || 36) * scaleFactor;

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
      const item = {
        productId: product?.id || product?._id || "",
        slug: product?.slug || slugParam,
        name: product?.name,
        color,
        size,
        view,
        preview: previewPNG,
        printFileUrl: fileUrl,
        productImage: await pickWorkingMockupUrl(product, view, color),
        unitPrice,
      };
      localStorage.setItem("itemToCheckout", JSON.stringify(item));
      navigate("/checkout");
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", status: "error" });
    }
  };

  // --------------------- Derived UI bits ---------------------

  const colorOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(toKey(v.color)));
    (product?.colors || []).forEach((c) => c && set.add(toKey(c)));
    const arr = [...set];
    arr.sort((a, b) => {
      const ia = SWATCH_ORDER.indexOf(a);
      const ib = SWATCH_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return arr;
  }, [product]);

  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(
      (v) => (!color || toKey(v.color) === toKey(color)) && v.size && set.add(v.size)
    );
    return [...set];
  }, [product, color]);

  const canProceed =
    product &&
    (!colorOptions.length || color) &&
    (!sizes.length || size) &&
    hasObjects;

  // --------------------- Layers helpers ---------------------
  const layerList = () => {
    const fc = fabricRef.current;
    if (!fc) return [];
    return fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay" && o.id !== "guide")
      .map((o, idx) => ({
        id: o._layerId || `layer_${idx}`,
        obj: o,
        label:
          o.type === "i-text"
            ? "TEXT"
            : o.type === "image"
            ? "IMAGE"
            : o.type === "group"
            ? "SVG"
            : (o.type || "OBJECT").toUpperCase(),
        visible: o.visible !== false,
        locked: !!o.lockMovementX || !!o.lockMovementY,
      }));
  };
  const toggleVisible = (it) => {
    const fc = fabricRef.current;
    it.obj.visible = !it.obj.visible;
    fc.requestRenderAll();
    setLayerTick((t) => t + 1);
  };
  const toggleLock = (it) => {
    const fc = fabricRef.current;
    const locked = !(it.obj.lockMovementX && it.obj.lockMovementY);
    it.obj.lockMovementX = locked;
    it.obj.lockMovementY = locked;
    it.obj.hasControls = !locked;
    it.obj.selectable = !locked;
    fc.requestRenderAll();
    setLayerTick((t) => t + 1);
  };
  const bringFwd = (it) => {
    const fc = fabricRef.current;
    fc.bringForward(it.obj);
    fc.requestRenderAll();
    setLayerTick((t) => t + 1);
  };
  const sendBack = (it) => {
    const fc = fabricRef.current;
    fc.sendBackwards(it.obj);
    fc.requestRenderAll();
    setLayerTick((t) => t + 1);
  };

  // --------------------- UI ---------------------

  return (
    <Flex direction={{ base: "column", xl: "row" }} minH="100vh" bg="brand.primary">
      {/* Left rail */}
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
              <Tab>Upload</Tab>
            </TabList>

            <TabPanels>
              {/* Options */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  {/* View */}
                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      View
                    </Text>
                    <HStack wrap="wrap" spacing={2}>
                      {availableViews.map((v) => (
                        <Button
                          key={v}
                          size="sm"
                          variant={view === v ? "solid" : "outline"}
                          onClick={() => setView(v)}
                        >
                          {v}
                        </Button>
                      ))}
                    </HStack>
                  </Box>

                  {/* Colors */}
                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      Color
                    </Text>
                    <HStack wrap="wrap" spacing={2}>
                      {colorOptions.length ? (
                        colorOptions.map((c) => {
                          const hex = COLOR_SWATCHES[c] || "#CCCCCC";
                          const selected = toKey(color) === c;
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
                                <Box
                                  w="16px"
                                  h="16px"
                                  borderRadius="full"
                                  bg={hex}
                                  boxShadow="inset 0 0 0 1px rgba(0,0,0,.25)"
                                />
                              </Button>
                            </Tooltip>
                          );
                        })
                      ) : (
                        <Badge>No color options</Badge>
                      )}
                    </HStack>
                  </Box>

                  {/* Sizes */}
                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      Size
                    </Text>
                    <HStack wrap="wrap" spacing={2}>
                      {sizes.length ? (
                        sizes.map((s) => (
                          <Button
                            key={s}
                            size="sm"
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

                  {/* Zoom + grid + mockup */}
                  <VStack align="stretch" spacing={3}>
                    <Text color="brand.textLight" fontWeight="medium">
                      Zoom
                    </Text>
                    <HStack>
                      <Tooltip label="Zoom out">
                        <Button size="sm" onClick={() => setZoomSafe(zoom - 0.1)} leftIcon={<FaSearchMinus />}>
                          Out
                        </Button>
                      </Tooltip>
                      <Slider aria-label="zoom" value={zoom} min={0.75} max={2} step={0.1} onChange={setZoomSafe}>
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Tooltip label="Zoom in">
                        <Button size="sm" onClick={() => setZoomSafe(zoom + 0.1)} leftIcon={<FaSearchPlus />}>
                          In
                        </Button>
                      </Tooltip>
                    </HStack>

                    <HStack>
                      <Switch
                        isChecked={showGrid}
                        onChange={(e) => {
                          setShowGrid(e.target.checked);
                          refreshBackground();
                        }}
                      />
                      <Text color="brand.textLight">Show grid</Text>
                    </HStack>

                    <HStack>
                      <Switch
                        isChecked={mockupVisible}
                        onChange={(e) => {
                          setMockupVisible(e.target.checked);
                          refreshBackground();
                        }}
                      />
                      <Text color="brand.textLight">Show mockup</Text>
                    </HStack>

                    <Box>
                      <Text color="brand.textLight" fontWeight="medium" mb={1}>
                        Mockup opacity
                      </Text>
                      <Slider
                        aria-label="mockup-opacity"
                        min={0.2}
                        max={1}
                        step={0.05}
                        value={mockupOpacity}
                        onChange={(v) => setMockupOpacity(v)}
                        onChangeEnd={() => refreshBackground()}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>
                  </VStack>

                  <Divider borderColor="whiteAlpha.300" />

                  {/* Numeric controls for selection */}
                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">
                      Selection (X/Y/W/H°)
                    </Text>
                    <HStack spacing={2}>
                      <NumberInput size="sm" value={activeSel?.x ?? ""} onChange={(_, v) => {
                        const fc = fabricRef.current, o = fc?.getActiveObject(); if (!o) return;
                        o.left = v || 0; o.setCoords(); fc.requestRenderAll(); setActiveSel((s)=>({...s, x: v}));
                      }}>
                        <NumberInputField placeholder="X" />
                      </NumberInput>
                      <NumberInput size="sm" value={activeSel?.y ?? ""} onChange={(_, v) => {
                        const fc = fabricRef.current, o = fc?.getActiveObject(); if (!o) return;
                        o.top = v || 0; o.setCoords(); fc.requestRenderAll(); setActiveSel((s)=>({...s, y: v}));
                      }}>
                        <NumberInputField placeholder="Y" />
                      </NumberInput>
                      <NumberInput size="sm" value={activeSel?.w ?? ""} onChange={(_, v) => {
                        const fc = fabricRef.current, o = fc?.getActiveObject(); if (!o || !o.getScaledWidth()) return;
                        const s = (v || 1) / o.getScaledWidth();
                        o.scaleX *= s; o.setCoords(); fc.requestRenderAll(); setActiveSel((s2)=>({...s2, w: v}));
                      }}>
                        <NumberInputField placeholder="W" />
                      </NumberInput>
                      <NumberInput size="sm" value={activeSel?.h ?? ""} onChange={(_, v) => {
                        const fc = fabricRef.current, o = fc?.getActiveObject(); if (!o || !o.getScaledHeight()) return;
                        const s = (v || 1) / o.getScaledHeight();
                        o.scaleY *= s; o.setCoords(); fc.requestRenderAll(); setActiveSel((s2)=>({...s2, h: v}));
                      }}>
                        <NumberInputField placeholder="H" />
                      </NumberInput>
                      <NumberInput size="sm" value={activeSel?.angle ?? ""} onChange={(_, v) => {
                        const fc = fabricRef.current, o = fc?.getActiveObject(); if (!o) return;
                        o.angle = v || 0; o.setCoords(); fc.requestRenderAll(); setActiveSel((s2)=>({...s2, angle: v}));
                      }}>
                        <NumberInputField placeholder="°" />
                      </NumberInput>
                    </HStack>
                    <HStack mt={2}>
                      <Button size="sm" onClick={centerH} leftIcon={<FaArrowsAltH />}>Center X</Button>
                      <Button size="sm" onClick={autoFit} leftIcon={<FaCompressAlt />}>Center & Fit</Button>
                    </HStack>
                  </Box>

                  <Divider borderColor="whiteAlpha.300" />

                  <Button
                    size="sm"
                    colorScheme={canProceed ? "yellow" : "gray"}
                    isDisabled={!canProceed}
                    onClick={makePrintReadyAndUpload}
                  >
                    Add to cart / Checkout
                  </Button>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    We export a true print file at {DPI} DPI sized to the selected placement.
                  </Text>

                  <HStack pt={2} spacing={2}>
                    <Tooltip label="Undo">
                      <IconButton size="sm" onClick={undo} icon={<FaUndo />} />
                    </Tooltip>
                    <Tooltip label="Redo">
                      <IconButton size="sm" onClick={redo} icon={<FaRedo />} />
                    </Tooltip>
                    <Tooltip label="Delete selected">
                      <IconButton size="sm" onClick={del} colorScheme="red" variant="outline" icon={<FaTrash />} />
                    </Tooltip>
                  </HStack>
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
                      No saved designs yet.
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
                  <Text fontSize="sm" color="whiteAlpha.800">
                    Use Fabric controls on the canvas to edit the text.
                  </Text>
                </VStack>
              </TabPanel>

              {/* Upload */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <HStack>
                    <Input
                      type="file"
                      accept="image/*,.svg"
                      onChange={(e) => uploadLocal(e.target.files?.[0])}
                    />
                    <Icon as={FaUpload} />
                  </HStack>
                  <Text fontSize="sm" color="whiteAlpha.800">
                    Upload PNG/JPG/SVG. SVGs are grouped and clipped automatically.
                  </Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Box>

      {/* Canvas column */}
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

      {/* Layers */}
      <Box
        display={{ base: "none", xl: "block" }}
        w="260px"
        p={4}
        borderLeftWidth="1px"
        borderColor="whiteAlpha.200"
        bg="brand.paper"
      >
        <Heading size="sm" color="brand.textLight" mb={2}>
          Layers
        </Heading>

        <VStack align="stretch" spacing={1} key={layerTick}>
          {layerList().map((l) => (
            <HStack
              key={l.id}
              p={2}
              borderRadius="md"
              _hover={{ bg: "whiteAlpha.100" }}
              onClick={() => {
                const fc = fabricRef.current;
                fc.setActiveObject(l.obj);
                fc.requestRenderAll();
              }}
            >
              <Text color="whiteAlpha.900" fontSize="sm" noOfLines={1}>
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
                    toggleVisible(l);
                  }}
                />
                <IconButton
                  aria-label="lock"
                  size="xs"
                  variant="ghost"
                  icon={l.locked ? <FaLock /> : <FaLockOpen />}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLock(l);
                  }}
                />
                <IconButton
                  aria-label="up"
                  size="xs"
                  variant="ghost"
                  icon={<FaChevronUp />}
                  onClick={(e) => {
                    e.stopPropagation();
                    bringFwd(l);
                  }}
                />
                <IconButton
                  aria-label="down"
                  size="xs"
                  variant="ghost"
                  icon={<FaChevronDown />}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendBack(l);
                  }}
                />
              </HStack>
            </HStack>
          ))}
          {!layerList().length && (
            <Text color="whiteAlpha.700" fontSize="xs" px={2} py={3}>
              Add an image or text to get started.
            </Text>
          )}
        </VStack>
      </Box>
    </Flex>
  );
}
