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
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge,
  Checkbox,
  useBreakpointValue,
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
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaLockOpen,
  FaRotateRight,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";

// Try to tolerate different exports from ../data/mockups.js
// (No build break if it doesn't have a default)
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS = (MOCKUPS_MOD?.default ?? MOCKUPS_MOD?.MOCKUPS ?? {}) as any;

// ------------------------------
// Constants & helpers
// ------------------------------
const DPI = 300;
const WORK_ASPECT = 3 / 4; // 3:4 canvas
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Product-type detection
function detectProductType(product) {
  const text = `${product?.type || product?.category || ""} ${product?.name || ""}`.toLowerCase();
  if (/(tee|t-shirt|shirt|unisex)/.test(text)) return "tshirt";
  if (/(hoodie|sweatshirt)/.test(text)) return "hoodie";
  if (/(tote|bag)/.test(text)) return "tote";
  if (/(hat|cap|trucker|snapback)/.test(text)) return "hat";
  if (/(beanie|knit)/.test(text)) return "beanie";
  return "tshirt";
}

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "sleeve"],
  hoodie: ["front", "back"],
  tote: ["front", "back"],
  hat: ["front"],
  beanie: ["front"],
};

// Normalizers for lookup
const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug = (p) => norm(p?.slug || p?.name || "");

// Placement guidance (relative to canvas size; tuned visually)
// These control where the dashed print area sits *on the preview*.
// Export uses the exact size from PRINT_SPECS below.
const PLACEMENTS = {
  tshirt: {
    front: { x: 0.5, y: 0.43, w: 0.42, h: 0.50 },
    back: { x: 0.5, y: 0.42, w: 0.40, h: 0.50 },
    sleeve: { x: 0.72, y: 0.35, w: 0.18, h: 0.14 },
  },
  hoodie: {
    front: { x: 0.5, y: 0.44, w: 0.42, h: 0.46 },
    back: { x: 0.5, y: 0.42, w: 0.40, h: 0.50 },
  },
  tote: {
    front: { x: 0.5, y: 0.45, w: 0.50, h: 0.60 },
    back: { x: 0.5, y: 0.45, w: 0.50, h: 0.60 },
  },
  hat: {
    front: { x: 0.5, y: 0.35, w: 0.24, h: 0.10 },
  },
  beanie: {
    front: { x: 0.5, y: 0.38, w: 0.30, h: 0.12 },
  },
};

// True print sizes in inches for export
const PRINT_SPECS = {
  tshirt: {
    front: { widthInches: 12, heightInches: 16 },
    back: { widthInches: 12, heightInches: 16 },
    sleeve: { widthInches: 4, heightInches: 3.5 },
  },
  hoodie: {
    front: { widthInches: 13, heightInches: 13 },
    back: { widthInches: 12, heightInches: 16 },
  },
  tote: {
    front: { widthInches: 14, heightInches: 16 },
    back: { widthInches: 14, heightInches: 16 },
  },
  hat: {
    front: { widthInches: 4, heightInches: 1.75 },
  },
  beanie: {
    front: { widthInches: 5, heightInches: 1.75 },
  },
};

// World-class color swatch mapping + ordered "rainbow" with black first, white last
const COLOR_HEX = {
  black: "#000000",
  white: "#FFFFFF",
  maroon: "#800000",
  red: "#D32F2F",
  orange: "#F57C00",
  gold: "#FFD54F", // yellow-ish
  lime: "#9CCC65",
  green: "#228B22",
  "military green": "#4B5320",
  "forest green": "#228B22",
  "tropical blue": "#1CA3EC",
  royal: "#1E40AF",
  "royal blue": "#1E40AF",
  indigo: "#3F51B5",
  violet: "#7C4DFF",
  purple: "#6B21A8",
  charcoal: "#36454F",
  navy: "#0B1F44",
  azalea: "#FF77A9",
  brown: "#6D4C41",
  "brown savana": "#7B5E57",
  "brown savanna": "#7B5E57",
  sand: "#E0CDA9",
  ash: "#B2BEB5",
  sport_grey: "#B5B8B1",
  grey: "#8E8E8E",
};
const COLOR_ORDER = [
  "black",
  "red",
  "orange",
  "gold", // yellow
  "lime",
  "green",
  "tropical blue",
  "royal",
  "indigo",
  "violet",
  "purple",
  "charcoal",
  "navy",
  "maroon",
  "azalea",
  "brown",
  "brown savanna",
  "brown savana",
  "sand",
  "ash",
  "grey",
  "white",
];
const colorIndex = (name) => {
  const k = String(name || "").trim().toLowerCase();
  const i = COLOR_ORDER.indexOf(k);
  return i >= 0 ? i : 999;
};

// Icon for product badge
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
  return <IconButton aria-label={type} icon={<IconCmp />} size="xs" variant="ghost" color="brand.accentYellow" />;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// ------------------------------
// Component
// ------------------------------
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
  const availableViews = useMemo(() => VIEWS_BY_TYPE[productType] || ["front"], [productType]);

  // UI selections
  const [view, setView] = useState("front");
  const [color, setColor] = useState(colorParam);
  const [size, setSize] = useState(sizeParam);

  // Canvas refs
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const fabricRef = useRef(null);

  // UI state
  const [zoom, setZoom] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [rulersOn, setRulersOn] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(0.98);

  // Text tool
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);

  // Designs & layers
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);

  // Histories
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Responsive widths
  const showSidebars = useBreakpointValue({ base: false, md: true });
  const panelW = useBreakpointValue({ base: "100%", xl: "320px" });
  const layersW = useBreakpointValue({ base: "100%", xl: "260px" });

  // ------------------------------
  // Data fetch: product & defaults
  // ------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (cancelled) return;

        const p = res.data;
        setProduct(p);

        // compute available colors from product/variants
        const colorSet = new Set();
        (p?.variants || []).forEach((v) => v.color && colorSet.add(String(v.color)));
        (p?.colors || []).forEach((c) => colorSet.add(String(c)));

        // default color: black if available, else first
        const list = [...colorSet].sort((a, b) => colorIndex(a) - colorIndex(b));
        if (!colorParam) {
          const preferred = list.find((c) => String(c).toLowerCase() === "black") || list[0];
          if (preferred) setColor(preferred);
        }

        // default size: first available
        if (!sizeParam) {
          const sizes = new Set();
          (p?.variants || []).forEach((v) => v.size && sizes.add(String(v.size)));
          const firstS = [...sizes][0];
          if (firstS) setSize(firstS);
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

  // Designs
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

  // ------------------------------
  // Fabric setup
  // ------------------------------
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    // init once
    if (!fabricRef.current) {
      const parentW = wrapRef.current.clientWidth;
      const parentH = parentW / WORK_ASPECT;

      const fc = new window.fabric.Canvas(canvasRef.current, {
        width: parentW,
        height: parentH,
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = fc;

      const updateFlags = () => {
        const objs = fc.getObjects().filter((o) => o.id !== "printArea");
        setHasObjects(objs.length > 0);

        // layers (top-most last)
        const layersList = objs.map((o, idx) => ({
          id: o.__uid || (o.__uid = `${Date.now()}-${Math.random()}`),
          type: o.type,
          visible: o.visible !== false,
          locked: !!(o.lockMovementX || o.lockMovementY),
          index: idx,
        }));
        setLayers(layersList);
      };

      fc.on("object:added", updateFlags);
      fc.on("object:removed", updateFlags);
      fc.on("object:modified", updateFlags);
      fc.on("selection:created", updateFlags);
      fc.on("selection:updated", updateFlags);
      fc.on("selection:cleared", updateFlags);

      // resize observer to keep preview centered/contained
      const ro = new ResizeObserver(() => {
        if (!fabricRef.current) return;
        const w = wrapRef.current.clientWidth;
        const h = w / WORK_ASPECT;
        fabricRef.current.setWidth(w);
        fabricRef.current.setHeight(h);
        fabricRef.current.requestRenderAll();
        // re-lay print area in new size
        layPrintArea();
      });
      ro.observe(wrapRef.current);
      // cleanup
      return () => ro.disconnect();
    }
  }, []);

  // ------------------------------
  // Background mockup + print area
  // ------------------------------
  const pickMockupUrl = useCallback(
    (prod, v, c) => {
      if (!prod) return PLACEHOLDER;
      const slugKey = normSlug(prod) || norm(slugParam);
      const colorKey = normColor(c);

      // 1) Cloudinary mapping (fast/cleanest)
      const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[v];
      if (bySlug) return bySlug;

      // 2) Variant / files / product images fallbacks
      const variants = prod?.variants || [];
      const variant =
        variants.find((x) => x.color === c || x.colorName === c) || variants[0];

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
    },
    [slugParam]
  );

  // place/refresh mockup + dashed print area (centered)
  const layPrintArea = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    // remove existing print area, preserve user objects
    const userObjects = fc.getObjects().filter((o) => o.id !== "printArea");
    fc.clear();
    userObjects.forEach((o) => fc.add(o));

    const place =
      PLACEMENTS?.[productType]?.[view] ||
      PLACEMENTS.tshirt.front; // sane default

    const rect = new window.fabric.Rect({
      id: "printArea",
      left: place.x * fc.width,
      top: place.y * fc.height,
      originX: "center",
      originY: "center",
      width: place.w * fc.width,
      height: place.h * fc.height,
      fill: "",
      stroke: "white",
      strokeDashArray: [6, 6],
      strokeWidth: 2,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true,
      hoverCursor: "default",
    });

    fc.add(rect);
    fc.sendToBack(rect);
    fc.requestRenderAll();
  }, [productType, view]);

  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;

    // prepare & add print area (first, at back)
    layPrintArea();

    const url = pickMockupUrl(product, view, color) || PLACEHOLDER;

    const addImg = (src) => {
      window.fabric.Image.fromURL(
        src,
        (img) => {
          // contain-fit inside canvas
          const scale = Math.min(fc.width / img.width, fc.height / img.height);
          img.set({
            left: fc.width / 2,
            top: fc.height / 2,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            opacity: mockupOpacity,
          });
          img.id = "mockupBg";
          fc.add(img);
          fc.sendToBack(img);

          // keep dashed rect above mockup
          const pa = fc.getObjects().find((o) => o.id === "printArea");
          if (pa) fc.bringToFront(pa);

          fc.requestRenderAll();
        },
        { crossOrigin: "anonymous" } // CORS-safe for canvas
      );
    };

    // If remote host blocks CORS, fall back to placeholder silently.
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => addImg(url);
    img.onerror = () => addImg(PLACEHOLDER);
    img.src = url;
  }, [product, view, color, mockupOpacity, layPrintArea, pickMockupUrl]);

  useEffect(() => {
    if (product && fabricRef.current) refreshBackground();
  }, [product, refreshBackground, view, color]);

  // ------------------------------
  // History & utilities
  // ------------------------------
  const pushHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id", "__uid"])));
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
    const curr = JSON.stringify(fc.toDatalessJSON(["id", "__uid"]));
    redoStack.current.push(curr);
    const prev = undoStack.current.pop();
    if (prev) applyJSON(prev);
  };
  const redo = () => {
    const fc = fabricRef.current;
    if (!fc || redoStack.current.length === 0) return;
    const curr = JSON.stringify(fc.toDatalessJSON(["id", "__uid"]));
    undoStack.current.push(curr);
    const nxt = redoStack.current.pop();
    if (nxt) applyJSON(nxt);
  };

  const setZoomSafe = (z) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const clamped = Math.max(0.5, Math.min(2, z));
    setZoom(clamped);
    fc.setZoom(clamped);
    fc.requestRenderAll();
  };

  // keep objects within print area
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const constrain = () => {
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const objs = fc.getObjects().filter((o) => o.id !== "printArea" && o.id !== "mockupBg");
      const a = area.getBoundingRect(true, true);
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

  // ------------------------------
  // Add content
  // ------------------------------
  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim())
      return toast({ title: "Enter text first", status: "info" });
    pushHistory();
    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2,
      top: fc.height / 2,
      originX: "center",
      originY: "center",
      fill: textColor,
      fontSize: textSize,
    });
    fc.add(t);
    fc.setActiveObject(t);
    setTextValue("");
    fc.requestRenderAll();
  };

  const addDesign = (design) => {
    const fc = fabricRef.current;
    if (!fc || !design?.imageDataUrl) return;
    pushHistory();
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
        fc.add(img);
        fc.setActiveObject(img);
        fc.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  };

  // Toolbar actions
  const del = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea" || active.id === "mockupBg") return;
    pushHistory();
    fc.remove(active);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };
  const centerH = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea" || o.id === "mockupBg") return;
    o.centerH();
    fc.requestRenderAll();
  };
  const rotate90 = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea" || o.id === "mockupBg") return;
    o.rotate(((o.angle || 0) + 90) % 360);
    o.setCoords();
    fc.requestRenderAll();
  };

  // Layer helpers
  const activateLayer = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockupBg")
      .find((o) => o.__uid === id);
    if (!obj) return;
    fc.setActiveObject(obj);
    setSelectedLayerId(id);
    fc.requestRenderAll();
  };
  const layerToggleVisible = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockupBg")
      .find((o) => o.__uid === id);
    if (!obj) return;
    obj.visible = !obj.visible;
    fc.requestRenderAll();
  };
  const layerLockToggle = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockupBg")
      .find((o) => o.__uid === id);
    if (!obj) return;
    const locked = !(obj.lockMovementX || obj.lockMovementY);
    obj.lockMovementX = locked;
    obj.lockMovementY = locked;
    obj.selectable = !locked;
    obj.evented = !locked;
    fc.requestRenderAll();
  };
  const layerBringForward = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockupBg")
      .find((o) => o.__uid === id);
    if (!obj) return;
    fc.bringForward(obj);
    fc.requestRenderAll();
  };
  const layerSendBackward = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockupBg")
      .find((o) => o.__uid === id);
    if (!obj) return;
    fc.sendBackwards(obj);
    // ensure it never goes behind mockupBg/printArea
    const bg = fc.getObjects().find((o) => o.id === "mockupBg");
    const pa = fc.getObjects().find((o) => o.id === "printArea");
    if (bg) fc.sendToBack(bg);
    if (pa) fc.bringToFront(pa);
    fc.requestRenderAll();
  };
  const layerDelete = (id) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockupBg")
      .find((o) => o.__uid === id);
    if (!obj) return;
    pushHistory();
    fc.remove(obj);
    fc.requestRenderAll();
  };

  // ------------------------------
  // Export → upload → checkout
  // ------------------------------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;

    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area) return toast({ title: "No print area defined", status: "error" });

    const objs = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockupBg");
    if (!objs.length)
      return toast({ title: "Nothing to print", status: "warning" });

    const spec =
      PRINT_SPECS[productType]?.[view] || PRINT_SPECS.tshirt.front;
    const outW = Math.round(spec.widthInches * DPI);
    const outH = Math.round(spec.heightInches * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);
    const scaleFactor = outW / aBB.width; // canvas px → print px

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
      if (clone.type === "i-text")
        clone.fontSize = (o.fontSize || 36) * scaleFactor;

      tmp.add(clone);
    });
    tmp.requestRenderAll();

    // Clean PNG with transparency; mockup is NOT included
    const png = tmp.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    tmp.dispose();

    // preview for cart
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

  // ------------------------------
  // Derived color/size lists
  // ------------------------------
  const colors = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(v.color));
    (product?.colors || []).forEach((c) => set.add(c));
    return [...set].sort((a, b) => colorIndex(a) - colorIndex(b));
  }, [product]);

  const sizes = useMemo(() => {
    const s = new Set();
    (product?.variants || []).forEach((v) => {
      if (!color || v.color === color) v.size && s.add(v.size);
    });
    return [...s];
  }, [product, color]);

  const canProceed =
    product && (!colors.length || color) && (!sizes.length || size) && hasObjects;

  // ------------------------------
  // UI – Panels & Canvas
  // ------------------------------
  return (
    <Flex direction="column" minH="100vh" bg="brand.primary">
      <Box px={{ base: 3, md: 6 }} pt={4}>
        <Image src="/logo.png" alt="Tees From The Past" h="36px" objectFit="contain" />
      </Box>

      <Flex
        flex="1"
        gap={{ base: 4, xl: 6 }}
        px={{ base: 3, md: 6 }}
        pb={6}
        mt={2}
        direction={{ base: "column", xl: "row" }}
        align="stretch"
      >
        {/* LEFT: Panels (Options / Designs / Text) */}
        <Box
          w={{ base: "100%", xl: panelW }}
          bg="brand.paper"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          rounded="lg"
          overflow="hidden"
        >
          <VStack align="stretch" spacing={0}>
            <HStack px={4} py={3} justify="space-between" borderBottomWidth="1px" borderColor="whiteAlpha.200">
              <HStack>
                <ProductTypeBadgeIcon type={productType} />
                <Heading size="md" color="brand.textLight" fontFamily="Bungee">
                  {product?.name || "Product"}
                </Heading>
              </HStack>
              <Badge variant="outline" colorScheme="yellow" opacity={0.9}>
                {productType.toUpperCase()}
              </Badge>
            </HStack>

            <Tabs variant="enclosed" colorScheme="yellow" isFitted>
              <TabList>
                <Tab>Options</Tab>
                <Tab>Designs</Tab>
                <Tab>Text</Tab>
              </TabList>

              <TabPanels>
                {/* Options */}
                <TabPanel>
                  <VStack align="stretch" spacing={5}>
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

                    {/* Color (dots) */}
                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">
                        Color
                      </Text>
                      <HStack spacing={1} wrap="wrap">
                        {colors.length ? (
                          colors.map((c) => {
                            const key = String(c).toLowerCase();
                            const hex = COLOR_HEX[key] || "#cccccc";
                            const selected = color === c;
                            return (
                              <Tooltip label={c} key={c}>
                                <Box
                                  as="button"
                                  onClick={() => setColor(c)}
                                  w="18px"
                                  h="18px"
                                  rounded="full"
                                  borderWidth={selected ? "2px" : "1px"}
                                  borderColor={selected ? "yellow.300" : "blackAlpha.600"}
                                  background={hex}
                                  boxShadow={selected ? "0 0 0 2px rgba(234,179,8,.35)" : "none"}
                                />
                              </Tooltip>
                            );
                          })
                        ) : (
                          <Badge>No color options</Badge>
                        )}
                      </HStack>
                    </Box>

                    {/* Size */}
                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">
                        Size
                      </Text>
                      <HStack wrap="wrap" spacing={2}>
                        {sizes.length ? (
                          sizes.map((s) => (
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
                      <Text mb={2} color="brand.textLight" fontWeight="medium">
                        Canvas zoom
                      </Text>
                      <HStack>
                        <Tooltip label="Zoom out">
                          <IconButton
                            aria-label="Zoom out"
                            size="sm"
                            icon={<FaSearchMinus />}
                            onClick={() => setZoomSafe(zoom - 0.1)}
                          />
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
                          <IconButton
                            aria-label="Zoom in"
                            size="sm"
                            icon={<FaSearchPlus />}
                            onClick={() => setZoomSafe(zoom + 0.1)}
                          />
                        </Tooltip>
                      </HStack>
                    </Box>

                    {/* Grid / Rulers / Mockup opacity */}
                    <Box>
                      <HStack spacing={4} mb={2}>
                        <Checkbox isChecked={gridOn} onChange={(e) => setGridOn(e.target.checked)}>
                          Grid
                        </Checkbox>
                        <Checkbox isChecked={rulersOn} onChange={(e) => setRulersOn(e.target.checked)}>
                          Rulers
                        </Checkbox>
                      </HStack>
                      <Text mb={1} color="brand.textLight" fontWeight="medium">
                        Mockup opacity
                      </Text>
                      <Slider
                        value={mockupOpacity}
                        min={0.4}
                        max={1}
                        step={0.02}
                        onChange={(v) => setMockupOpacity(v)}
                        onChangeEnd={() => refreshBackground()}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>

                    <Divider borderColor="whiteAlpha.300" />

                    <VStack align="stretch" spacing={3}>
                      <Button
                        colorScheme={canProceed ? "yellow" : "gray"}
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
                </TabPanel>

                {/* Designs */}
                <TabPanel>
                  <VStack align="stretch" spacing={3}>
                    {loadingDesigns ? (
                      <>
                        <Skeleton height="28px" />
                        <Skeleton height="120px" />
                      </>
                    ) : designs.length ? (
                      <SimpleGrid columns={{ base: 3, sm: 4 }} spacing={2}>
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
                      <Text color="brand.textLight" fontSize="sm">
                        No saved designs yet. Create one in “Generate”.
                      </Text>
                    )}
                  </VStack>
                </TabPanel>

                {/* Text */}
                <TabPanel>
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
                        onChange={(v) => setTextSize(parseInt(v || "36", 10))}
                        maxW="140px"
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

        {/* CENTER: Canvas & toolbar */}
        <Flex
          flex="1"
          direction="column"
          bg="brand.secondary"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          rounded="lg"
          overflow="hidden"
          minH={{ base: "60vh", xl: "auto" }}
        >
          {/* Toolbar */}
          <HStack
            spacing={2}
            px={3}
            py={2}
            borderBottomWidth="1px"
            borderColor="whiteAlpha.300"
            justify="space-between"
            flexWrap="wrap"
          >
            <HStack>
              <Tooltip label="Undo">
                <IconButton aria-label="Undo" size="sm" icon={<FaUndo />} onClick={undo} />
              </Tooltip>
              <Tooltip label="Redo">
                <IconButton aria-label="Redo" size="sm" icon={<FaRedo />} onClick={redo} />
              </Tooltip>
            </HStack>
            <HStack>
              <Tooltip label="Delete">
                <IconButton aria-label="Delete" size="sm" icon={<FaTrash />} onClick={del} />
              </Tooltip>
              <Tooltip label="Center horizontally">
                <IconButton aria-label="Center" size="sm" icon={<FaArrowsAltH />} onClick={centerH} />
              </Tooltip>
              <Tooltip label="Rotate 90°">
                <IconButton aria-label="Rotate" size="sm" icon={<FaRotateRight />} onClick={rotate90} />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Canvas region (kept centered, consistent aspect) */}
          <Box flex="1" overflow="auto" display="grid" placeItems="center" p={{ base: 2, md: 4 }}>
            <Box
              ref={wrapRef}
              position="relative"
              width={{ base: "100%", md: "min(100%, 800px)" }}
              // Keep a 3:4 preview box with absolute canvas inside
              style={{ paddingTop: `${100 / WORK_ASPECT}%` }}
            >
              {/* rulers */}
              {rulersOn && (
                <>
                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    right="0"
                    h="22px"
                    bg="blackAlpha.400"
                    zIndex={1}
                  />
                  <Box
                    position="absolute"
                    top="0"
                    bottom="0"
                    left="0"
                    w="22px"
                    bg="blackAlpha.400"
                    zIndex={1}
                  />
                </>
              )}

              {/* grid overlay (soft) */}
              {gridOn && (
                <Box
                  position="absolute"
                  inset="0"
                  backgroundImage="linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)"
                  backgroundSize="20px 20px, 20px 20px"
                  pointerEvents="none"
                  zIndex={1}
                />
              )}

              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  inset: 0,
                }}
              />
            </Box>
          </Box>
        </Flex>

        {/* RIGHT: Layers */}
        <Box
          w={{ base: "100%", xl: layersW }}
          bg="brand.paper"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          rounded="lg"
          overflow="hidden"
          minH={{ base: "200px", xl: "auto" }}
        >
          <VStack align="stretch" spacing={0} h="100%">
            <Box px={4} py={3} borderBottomWidth="1px" borderColor="whiteAlpha.200">
              <Heading size="sm" color="brand.textLight" fontFamily="Bungee">
                Layers
              </Heading>
              <Text fontSize="xs" color="whiteAlpha.700">
                Use the canvas or list to select. Tap the eyeball to toggle visibility.
              </Text>
            </Box>

            <VStack align="stretch" spacing={0} maxH={{ base: "240px", xl: "calc(100vh - 240px)" }} overflowY="auto">
              {layers.length === 0 && (
                <Text px={4} py={3} fontSize="sm" color="whiteAlpha.700">
                  No layers yet. Add an image or text.
                </Text>
              )}
              {layers
                .map((L, i) => (
                  <HStack
                    key={L.id}
                    px={3}
                    py={2}
                    borderBottomWidth="1px"
                    borderColor="whiteAlpha.200"
                    bg={selectedLayerId === L.id ? "whiteAlpha.100" : "transparent"}
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => activateLayer(L.id)}
                    cursor="pointer"
                    justify="space-between"
                  >
                    <HStack>
                      <Badge colorScheme={L.type === "i-text" ? "purple" : "blue"}>{L.type === "i-text" ? "TEXT" : "IMAGE"}</Badge>
                    </HStack>
                    <HStack>
                      <Tooltip label={L.visible ? "Hide" : "Show"}>
                        <IconButton
                          aria-label="toggle"
                          size="xs"
                          variant="ghost"
                          icon={L.visible ? <FaEye /> : <FaEyeSlash />}
                          onClick={(e) => {
                            e.stopPropagation();
                            layerToggleVisible(L.id);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label={L.locked ? "Unlock" : "Lock"}>
                        <IconButton
                          aria-label="lock"
                          size="xs"
                          variant="ghost"
                          icon={L.locked ? <FaLock /> : <FaLockOpen />}
                          onClick={(e) => {
                            e.stopPropagation();
                            layerLockToggle(L.id);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Bring forward">
                        <IconButton
                          aria-label="up"
                          size="xs"
                          variant="ghost"
                          icon={<FaArrowUp />}
                          onClick={(e) => {
                            e.stopPropagation();
                            layerBringForward(L.id);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Send backward">
                        <IconButton
                          aria-label="down"
                          size="xs"
                          variant="ghost"
                          icon={<FaArrowDown />}
                          onClick={(e) => {
                            e.stopPropagation();
                            layerSendBackward(L.id);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Delete">
                        <IconButton
                          aria-label="delete"
                          size="xs"
                          variant="ghost"
                          icon={<FaTrash />}
                          onClick={(e) => {
                            e.stopPropagation();
                            layerDelete(L.id);
                          }}
                        />
                      </Tooltip>
                    </HStack>
                  </HStack>
                ))
                .reverse()}
            </VStack>
          </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}
