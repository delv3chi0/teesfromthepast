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
  IconButton,
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
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";

// Robust mockups import; supports default or named export
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS =
  (MOCKUPS_MOD && (MOCKUPS_MOD.default || MOCKUPS_MOD.MOCKUPS)) || {};

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const DPI = 300;
const CANVAS_ASPECT = 3 / 4; // tall/portrait stage
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

// Export sizes in INCHES (true print size)
const PRINT_SIZE_IN = {
  tshirt: {
    front: { w: 12, h: 16 },
    back: { w: 12, h: 16 },
    left: { w: 4, h: 3.5 },
    right: { w: 4, h: 3.5 },
  },
  hoodie: { front: { w: 12, h: 14 }, back: { w: 12, h: 16 } },
  tote: { front: { w: 14, h: 16 }, back: { w: 14, h: 16 } },
  hat: { front: { w: 4, h: 1.75 } },
  beanie: { front: { w: 5, h: 1.75 } },
};

// RELATIVE chest/sleeve areas (stick to the mockup no matter the canvas size)
const REL_AREAS = {
  tshirt: {
    // tuned for typical centered tee mockup
    front: { top: 0.22, left: 0.28, width: 0.44, height: 0.52 },
    back: { top: 0.22, left: 0.28, width: 0.44, height: 0.52 },
    left: { top: 0.37, left: 0.19, width: 0.18, height: 0.14 }, // left sleeve
    right: { top: 0.37, left: 0.63, width: 0.18, height: 0.14 }, // right sleeve
  },
  hoodie: {
    front: { top: 0.26, left: 0.32, width: 0.36, height: 0.36 },
    back: { top: 0.20, left: 0.27, width: 0.46, height: 0.54 },
  },
  tote: {
    front: { top: 0.30, left: 0.25, width: 0.50, height: 0.55 },
    back: { top: 0.30, left: 0.25, width: 0.50, height: 0.55 },
  },
  hat: {
    front: { top: 0.40, left: 0.38, width: 0.24, height: 0.10 },
  },
  beanie: {
    front: { top: 0.48, left: 0.34, width: 0.32, height: 0.12 },
  },
};

const VIEWS_BY_TYPE = {
  // IMPORTANT: match your Cloudinary files (front/back/left/right)
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

// Normalizers for mockup map
const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
const normColor = (c) => norm(c).replace(/[^a-z0-9-]/g, "");
const normSlug = (p) => norm(p?.slug || p?.name || "");

// Swatches
const COLOR_SWATCHES = {
  black: "#000000",
  maroon: "#800000",
  red: "#D32F2F",
  orange: "#F57C00",
  gold: "#D4AF37",
  yellow: "#FFC107",
  lime: "#9CCC65",
  green: "#2E7D32",
  "military green": "#4B5320",
  "forest green": "#228B22",
  tropical: "#1CA3EC",
  "tropical blue": "#1CA3EC",
  cyan: "#00BCD4",
  royal: "#1E40AF",
  "royal blue": "#1E40AF",
  blue: "#1565C0",
  purple: "#6B21A8",
  pink: "#EC407A",
  azalea: "#FF77A9",
  charcoal: "#36454F",
  grey: "#8E8E8E",
  gray: "#8E8E8E",
  white: "#FFFFFF",
};
const toKey = (c) =>
  String(c || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
const SWATCH_ORDER = [
  "black",
  "maroon",
  "red",
  "orange",
  "gold",
  "yellow",
  "lime",
  "green",
  "military green",
  "forest green",
  "tropical blue",
  "cyan",
  "royal blue",
  "blue",
  "purple",
  "pink",
  "azalea",
  "charcoal",
  "grey",
  "white",
];

// Badge icon
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

// ---------------------------------------------------------------------------

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
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
  const [color, setColor] = useState(colorParam);
  const [size, setSize] = useState(sizeParam);

  const [mockupOpacity, setMockupOpacity] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const fabricRef = useRef(null);
  const overlayGridImgRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Designs (your saved)
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

        // pick default color: black first if available
        const colorSet = new Set();
        (p?.variants || []).forEach((v) => v.color && colorSet.add(v.color));
        (p?.colors || []).forEach((c) => colorSet.add(c));
        const normalized = [...colorSet].map(toKey);
        const hasBlack = normalized.includes("black");
        if (!colorParam) {
          setColor(hasBlack ? "black" : colorSet.values().next().value || "");
        }

        // default size
        if (!sizeParam) {
          const sizeSet = new Set();
          (p?.variants || []).forEach((v) => v.size && sizeSet.add(v.size));
          const firstS = sizeSet.values().next().value;
          if (firstS) setSize(firstS);
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

      const onChange = () =>
        setHasObjects(
          fc
            .getObjects()
            .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay")
            .length > 0
        );
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);
    }

    const ro = new ResizeObserver(() => {
      if (!fabricRef.current) return;
      const w = wrapRef.current.clientWidth;
      const h = w / CANVAS_ASPECT;
      fabricRef.current.setWidth(w);
      fabricRef.current.setHeight(h);
      refreshBackground(); // keep pinned after resize
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------- Mockup helpers ---------------------

  // Cloudinary/MOCKUPS-first, then variants/images, else placeholder
  function pickMockupUrl(product, view, color) {
    const slugKey = normSlug(product) || norm(slugParam);
    const colorKey = normColor(color);
    const fromMap = MOCKUPS?.[slugKey]?.[colorKey]?.[view];
    if (fromMap) return fromMap;

    const variants = product?.variants || [];
    const variant =
      variants.find((v) => toKey(v.color) === toKey(color)) || variants[0];

    const chooseFile = (files = []) => {
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
      const f = chooseFile(variant.files);
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
  }

  const makeGridOverlay = useCallback((fc) => {
    const size = 32; // px grid
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

  // Compute mockup bounds after we fit-to-height & center horizontally
  function getMockupBounds(fc, img) {
    const scale = fc.height / img.height; // fit by height
    const w = img.width * scale;
    const h = fc.height; // scaled height == canvas height
    const left = fc.width / 2 - w / 2;
    const top = 0;
    return { scale, left, top, w, h };
  }

  // Draw chest/sleeve rectangle using REL_AREAS (relative)
  function drawPrintArea(fc, bounds) {
    // remove old
    const old = fc.getObjects().find((o) => o.id === "printArea");
    if (old) fc.remove(old);

    const rel =
      REL_AREAS[productType]?.[view] || REL_AREAS.tshirt.front;

    const left = bounds.left + rel.left * bounds.w;
    const top = bounds.top + rel.top * bounds.h;
    const w = rel.width * bounds.w;
    const h = rel.height * bounds.h;

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
  }

  const refreshBackground = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !product) return;

    // keep user objects, strip guides
    const userObjects = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay");
    fc.clear();
    userObjects.forEach((o) => fc.add(o));

    const url = pickMockupUrl(product, view, color) || PLACEHOLDER;

    window.fabric.Image.fromURL(
      url,
      (img) => {
        // Fit to height & center horizontally
        const scale = fc.height / img.height;
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

        fc.setBackgroundImage(img, () => {
          // Grid overlay (optional)
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
              overlayGridImgRef.current = gridImg;
              fc.setOverlayImage(gridImg, () => {
                // Add chest/sleeve rect
                const bounds = getMockupBounds(fc, img);
                drawPrintArea(fc, bounds);
                fc.renderAll();
              });
            },
            { crossOrigin: "anonymous" }
          );
        });
      },
      { crossOrigin: "anonymous" }
    );
  }, [product, view, color, mockupOpacity, showGrid, makeGridOverlay, productType]);

  // (Re)draw when inputs change
  useEffect(() => {
    if (!product || !fabricRef.current) return;
    refreshBackground();
  }, [product, refreshBackground]);

  // Constrain user objects inside print area (with light snapping)
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const SNAP = 8;

    const constrain = () => {
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const a = area.getBoundingRect(true, true);
      const objs = fc
        .getObjects()
        .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay");
      objs.forEach((o) => {
        const bb = o.getBoundingRect(true, true);

        // clamp inside
        if (bb.left < a.left) o.left += a.left - bb.left;
        if (bb.top < a.top) o.top += a.top - bb.top;
        if (bb.left + bb.width > a.left + a.width)
          o.left -= bb.left + bb.width - (a.left + a.width);
        if (bb.top + bb.height > a.top + a.height)
          o.top -= bb.top + bb.height - (a.top + a.height);

        // snap to center lines
        const cx = a.left + a.width / 2;
        const cy = a.top + a.height / 2;
        const ocx = bb.left + bb.width / 2;
        const ocy = bb.top + bb.height / 2;
        if (Math.abs(ocx - cx) < SNAP) o.left += cx - ocx;
        if (Math.abs(ocy - cy) < SNAP) o.top += cy - ocy;

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

  // --------------------- Editing actions ---------------------

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
    if (!active || active.id === "printArea" || active.id === "gridOverlay")
      return;
    pushHistory();
    fc.remove(active);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };

  const centerH = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea" || o.id === "gridOverlay") return;
    o.centerH();
    fc.requestRenderAll();
  };

  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;

    const area = fc.getObjects().find((o) => o.id === "printArea");
    if (!area)
      return toast({ title: "No print area defined", status: "error" });

    const objs = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "gridOverlay");
    if (!objs.length)
      return toast({ title: "Nothing to print", status: "warning" });

    // out size in pixels at DPI
    const size =
      PRINT_SIZE_IN[productType]?.[view] || PRINT_SIZE_IN.tshirt.front;
    const outW = Math.round(size.w * DPI);
    const outH = Math.round(size.h * DPI);

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
      if (clone.type === "i-text")
        clone.fontSize = (o.fontSize || 36) * scaleFactor;

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

  // --------------------- Derived UI bits ---------------------

  const colorOptions = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(toKey(v.color)));
    (product?.colors || []).forEach((c) => c && set.add(toKey(c)));
    // order by SWATCH_ORDER then fallback alpha
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

  // --------------------- UI ---------------------

  return (
    <Flex
      direction={{ base: "column", xl: "row" }}
      minH="100vh"
      bg="brand.primary"
    >
      {/* Left rail */}
      <Box
        w={{ base: "100%", xl: "300px" }}
        p={4}
        borderRightWidth={{ xl: "1px" }}
        borderColor="whiteAlpha.200"
        bg="brand.paper"
      >
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
                          return (
                            <Tooltip key={c} label={c}>
                              <Button
                                onClick={() => setColor(c)}
                                variant={toKey(color) === c ? "solid" : "outline"}
                                size="xs"
                                p={0}
                                borderRadius="full"
                                borderWidth="2px"
                                borderColor={
                                  toKey(color) === c
                                    ? "yellow.400"
                                    : "whiteAlpha.500"
                                }
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

                  {/* Zoom + grid + opacity */}
                  <VStack align="stretch" spacing={3}>
                    <Text color="brand.textLight" fontWeight="medium">
                      Zoom
                    </Text>
                    <HStack>
                      <Tooltip label="Zoom out">
                        <IconButton
                          size="sm"
                          onClick={() => setZoomSafe(zoom - 0.1)}
                          icon={<FaSearchMinus />}
                          aria-label="zoom out"
                        />
                      </Tooltip>
                      <Slider
                        aria-label="zoom"
                        value={zoom}
                        min={0.75}
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
                          size="sm"
                          onClick={() => setZoomSafe(zoom + 0.1)}
                          icon={<FaSearchPlus />}
                          aria-label="zoom in"
                        />
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
                  <Button
                    colorScheme={canProceed ? "yellow" : "gray"}
                    isDisabled={!canProceed}
                    onClick={makePrintReadyAndUpload}
                  >
                    Add to cart / Checkout
                  </Button>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    We export a true print file at {DPI} DPI sized to the
                    selected placement.
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
                      No saved designs yet.
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
                    Use the canvas handles to move/resize/rotate your text.
                  </Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Quick actions */}
          <HStack pt={1}>
            <Tooltip label="Undo">
              <Button size="sm" onClick={undo} leftIcon={<FaUndo />}>
                Undo
              </Button>
            </Tooltip>
            <Tooltip label="Redo">
              <Button size="sm" onClick={redo} leftIcon={<FaRedo />}>
                Redo
              </Button>
            </Tooltip>
            <Tooltip label="Delete selected">
              <Button
                size="sm"
                onClick={del}
                colorScheme="red"
                variant="outline"
              >
                <FaTrash />
              </Button>
            </Tooltip>
            <Tooltip label="Center horizontally">
              <Button size="sm" onClick={centerH} variant="outline">
                <FaArrowsAltH />
              </Button>
            </Tooltip>
          </HStack>
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

      {/* Layers rail (simple for now) */}
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
        <Text color="whiteAlpha.700" fontSize="sm">
          Click a layer on the canvas to select it. (Advanced layer controls
          coming soon.)
        </Text>
      </Box>
    </Flex>
  );
}
