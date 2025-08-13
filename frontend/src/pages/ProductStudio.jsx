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
  FaRedoAlt,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";

// load any form of export from ../data/mockups.js safely
import * as MOCKUPS_MOD from "../data/mockups.js";
const MOCKUPS =
  (MOCKUPS_MOD && (MOCKUPS_MOD.default || MOCKUPS_MOD.MOCKUPS)) || {};

// ------------------------------
// Constants & helpers
// ------------------------------

const DPI = 300;
const CANVAS_ASPECT = 3 / 4; // portrait
const PLACEHOLDER =
  "https://placehold.co/900x1200/1a202c/a0aec0?text=Mockup+Unavailable";

/**
 * Print presets (inches) tuned to a realistic chest print.
 * If a specific product needs micro-tuning later, add a per-slug override.
 */
const PRINT_AREAS = {
  tshirt: {
    front: { w: 11, h: 13.5, topInsetIn: 2.6 }, // chest print
    back: { w: 12, h: 16, topInsetIn: 4.0 },
    sleeve: { w: 4, h: 3.5, topInsetIn: 2.0 },
  },
  hoodie: {
    front: { w: 11, h: 13, topInsetIn: 3.2 },
    back: { w: 12, h: 16, topInsetIn: 4.2 },
  },
  tote: {
    front: { w: 12, h: 14, topInsetIn: 2.0 },
    back: { w: 12, h: 14, topInsetIn: 2.0 },
  },
  hat: { front: { w: 4.5, h: 2.0, topInsetIn: 1.4 } },
  beanie: { front: { w: 5.0, h: 2.0, topInsetIn: 1.2 } },
};

const VIEWS_BY_TYPE = {
  tshirt: ["front", "back", "sleeve"],
  hoodie: ["front", "back"],
  tote: ["front", "back"],
  hat: ["front"],
  beanie: ["front"],
};

const COLOR_SWATCHES = {
  black: "#000000",
  maroon: "#800000",
  red: "#D32F2F",
  orange: "#F57C00",
  gold: "#D4AF37",
  lime: "#9CCC65",
  "forest green": "#228B22",
  "military green": "#4B5320",
  "tropical blue": "#1CA3EC",
  royal: "#1E40AF",
  purple: "#6B21A8",
  ash: "#B2BEB5",
  grey: "#8E8E8E",
  white: "#FFFFFF",
};

const norm = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");
const normColor = (c) => norm(c).replace(/[^a-z0-9- ]/g, "");
const normSlug = (p) => norm(p?.slug || p?.name || "");

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

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

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
  const availableViews = useMemo(
    () => VIEWS_BY_TYPE[productType] || ["front"],
    [productType]
  );

  const [view, setView] = useState("front");
  const [color, setColor] = useState(colorParam || "black"); // default black
  const [size, setSize] = useState(sizeParam);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const mockupRef = useRef(null); // non-selectable mockup image object
  const printAreaRef = useRef(null); // dashed rectangle

  const [zoom, setZoom] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);

  // left rail toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);

  // designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

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
        const res = await client.get(
          `/storefront/product/${encodeURIComponent(slugParam)}`
        );
        if (!cancelled) {
          const p = res.data;
          setProduct(p);

          // default color from product if not given
          if (!colorParam) {
            const set = new Set();
            (p?.variants || []).forEach((v) => v.color && set.add(v.color));
            (p?.colors || []).forEach((c) => set.add(c));
            const first = [...set];
            // prefer black if available
            const blackIndex = first.findIndex(
              (c) => normColor(c) === "black"
            );
            setColor(
              blackIndex >= 0 ? first[blackIndex] : first[0] || "black"
            );
          }

          // default size
          if (!sizeParam) {
            const set = new Set();
            (p?.variants || []).forEach((v) => v.size && set.add(v.size));
            const firstS = [...set][0];
            if (firstS) setSize(firstS);
          }

          if (!availableViews.includes(view)) setView(availableViews[0]);
        }
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

  // ------------------------------
  // Fabric canvas init & resize
  // ------------------------------
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

    if (!fabricRef.current) {
      const parentW = wrapRef.current.clientWidth;
      const parentH = Math.max(420, parentW / CANVAS_ASPECT);

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
            .filter((o) => o.id !== "printArea" && o.id !== "mockup").length >
            0
        );
      fc.on("object:added", onChange);
      fc.on("object:removed", onChange);
      fc.on("object:modified", onChange);

      // optional rulers (simple center lines)
      const drawGuides = () => {
        if (!showRulers) return;
        const cx = fc.width / 2;
        const cy = fc.height / 2;
        const vert = new window.fabric.Line([cx, 0, cx, fc.height], {
          stroke: "rgba(255,255,255,0.12)",
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        const horiz = new window.fabric.Line([0, cy, fc.width, cy], {
          stroke: "rgba(255,255,255,0.12)",
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        vert.id = "guide";
        horiz.id = "guide";
        fc.add(vert);
        fc.add(horiz);
      };

      // simple grid
      const drawGrid = () => {
        if (!showGrid) return;
        const spacing = 24; // px
        for (let i = 0; i < fc.width; i += spacing) {
          const v = new window.fabric.Line([i, 0, i, fc.height], {
            stroke: "rgba(255,255,255,0.06)",
            selectable: false,
            evented: false,
            excludeFromExport: true,
          });
          v.id = "grid";
          fc.add(v);
        }
        for (let j = 0; j < fc.height; j += spacing) {
          const h = new window.fabric.Line([0, j, fc.width, j], {
            stroke: "rgba(255,255,255,0.06)",
            selectable: false,
            evented: false,
            excludeFromExport: true,
          });
          h.id = "grid";
          fc.add(h);
        }
      };

      drawGrid();
      drawGuides();

      const ro = new ResizeObserver(() => {
        if (!fabricRef.current) return;
        const w = wrapRef.current.clientWidth;
        const h = Math.max(420, w / CANVAS_ASPECT);
        fabricRef.current.setWidth(w);
        fabricRef.current.setHeight(h);
        refreshMockupAndArea(); // keep top-pinned & sized
        fabricRef.current.requestRenderAll();
      });
      ro.observe(wrapRef.current);
      return () => ro.disconnect();
    }
  }, [showGrid, showRulers]);

  // ------------------------------
  // Mockup & print area
  // ------------------------------
  function pickMockupUrl(p, v, c) {
    const slugKey = normSlug(p) || norm(slugParam);
    const colorKey = normColor(c);
    const bySlug = MOCKUPS?.[slugKey]?.[colorKey]?.[v];
    if (bySlug) return bySlug;

    const variants = p?.variants || [];
    const variant =
      variants.find((x) => x.color === c || x.colorName === c) || variants[0];

    const tryFiles = (files = []) => {
      const pref = (t) =>
        files.find((f) => f?.type === t && (f.preview_url || f.url));
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
    if (p?.images?.length) {
      const pimg = p.images.find((i) => i.isPrimary) || p.images[0];
      if (pimg?.url) return pimg.url;
      if (typeof p.images[0] === "string") return p.images[0];
    }
    if (variant?.image) return variant.image;
    if (p?.image) return p.image;

    return PLACEHOLDER;
  }

  const refreshMockupAndArea = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !product) return;

    // remove old guides/grid (they are re-drawn above only on init)
    // keep them; they’re light and non-blocking

    // 1) ensure mockup image object exists (not background),
    // pinned to top, centered horizontally, scaled to a nice height
    const existingMockup = mockupRef.current;
    const url = pickMockupUrl(product, view, color) || PLACEHOLDER;

    const addOrUpdateMockup = (img) => {
      // target mockup height (keep consistent visual)
      const targetH = Math.min(fc.height * 0.68, fc.height - 60); // safe margins
      const scale = targetH / img.height;
      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: "center",
        originY: "top",
        left: fc.width / 2,
        top: 24, // top margin; keeps the tee high in the viewport
        selectable: false,
        evented: false,
        opacity: mockupOpacity,
      });
      img.id = "mockup";

      if (existingMockup && fc.getObjects().includes(existingMockup)) {
        existingMockup.set({ ...img });
        mockupRef.current = existingMockup;
      } else {
        fc.add(img);
        // send to back but above grid/rulers (they were added earlier)
        fc.sendToBack(img);
        mockupRef.current = img;
      }
    };

    if (existingMockup && existingMockup.getSrc && existingMockup.getSrc() === url) {
      addOrUpdateMockup(existingMockup);
    } else {
      window.fabric.Image.fromURL(
        url,
        (img) => {
          addOrUpdateMockup(img);
          drawOrUpdatePrintArea(); // after mockup ready
          fc.requestRenderAll();
        },
        { crossOrigin: "anonymous" }
      );
    }

    // 2) update dash rect (print area)
    const drawOrUpdatePrintArea = () => {
      const mockup = mockupRef.current;
      if (!mockup) return;

      const areaDef =
        PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;

      // translate inches -> px using the same “relative DPI factor” we used before,
      // but anchored to the mockup’s current scale so it visually matches
      const relative = mockup.scaleX; // pixels per original pixel
      const pxW = Math.round(areaDef.w * DPI * (relative / 3));
      const pxH = Math.round(areaDef.h * DPI * (relative / 3));
      const topInsetPx = Math.round(areaDef.topInsetIn * DPI * (relative / 3));

      // centered horizontally; aligned to mockup top + inset
      const left = fc.width / 2;
      const top = mockup.top + topInsetPx;

      if (printAreaRef.current && fc.getObjects().includes(printAreaRef.current)) {
        printAreaRef.current.set({
          left,
          top,
          width: pxW,
          height: pxH,
          opacity: 1,
        });
        printAreaRef.current.setCoords();
      } else {
        const rect = new window.fabric.Rect({
          id: "printArea",
          left,
          top,
          originX: "center",
          originY: "top",
          width: pxW,
          height: pxH,
          fill: "", // transparent fill
          stroke: "white",
          strokeDashArray: [6, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
          excludeFromExport: true,
        });
        fc.add(rect);
        printAreaRef.current = rect;
        // keep print area above mockup but below user objects
        fc.bringForward(rect);
      }
    };

    drawOrUpdatePrintArea();
    fc.requestRenderAll();
  }, [product, view, color, productType, mockupOpacity]);

  useEffect(() => {
    if (product) refreshMockupAndArea();
  }, [product, refreshMockupAndArea, view, color, mockupOpacity]);

  // ------------------------------
  // Canvas helpers
  // ------------------------------
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
    fc.loadFromJSON(json, () => fc.renderAll(), (o, obj) => obj);
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

  const del = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.id === "printArea" || active.id === "mockup") return;
    pushHistory();
    fc.remove(active);
    fc.discardActiveObject();
    fc.requestRenderAll();
  };
  const centerH = () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const o = fc.getActiveObject();
    if (!o || o.id === "printArea" || o.id === "mockup") return;
    o.centerH();
    fc.requestRenderAll();
  };

  const setZoomSafe = (z) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const clamped = Math.max(0.75, Math.min(2, z));
    setZoom(clamped);
    fc.setZoom(clamped);
    fc.requestRenderAll();
  };

  // constrain user objects to print area
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const constrain = () => {
      const area = printAreaRef.current;
      if (!area) return;
      const objs = fc
        .getObjects()
        .filter((o) => o.id !== "printArea" && o.id !== "mockup" && o.id !== "grid" && o.id !== "guide");
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
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(36);

  const addText = () => {
    const fc = fabricRef.current;
    if (!fc || !textValue.trim())
      return toast({ title: "Enter text first", status: "info" });

    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2,
      top:
        (printAreaRef.current?.top || fc.height / 2) +
        (printAreaRef.current?.height || 0) / 2,
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
          top:
            (printAreaRef.current?.top || fc.height / 2) +
            (printAreaRef.current?.height || 0) / 2,
          originX: "center",
          originY: "center",
          scaleX: 0.5,
          scaleY: 0.5,
        });
        pushHistory();
        fc.add(img);
        fc.setActiveObject(img);
        fc.requestRenderAll();
        setSelectedDesignId(design._id);
      },
      { crossOrigin: "anonymous" }
    );
  };

  // ------------------------------
  // Export for checkout
  // ------------------------------
  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current;
    if (!fc) return;
    const area = printAreaRef.current;
    if (!area) return toast({ title: "No print area", status: "error" });

    const objs = fc
      .getObjects()
      .filter((o) => o.id !== "printArea" && o.id !== "mockup" && o.id !== "grid" && o.id !== "guide");
    if (!objs.length)
      return toast({ title: "Nothing to print", status: "warning" });

    const areaDef =
      PRINT_AREAS[productType]?.[view] || PRINT_AREAS.tshirt.front;
    const outW = Math.round(areaDef.w * DPI);
    const outH = Math.round(areaDef.h * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);

    // scale factor from the on-canvas area to print pixels
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

  // ------------------------------
  // Derived UI data
  // ------------------------------
  const colors = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => v.color && set.add(v.color));
    (product?.colors || []).forEach((c) => set.add(c));

    // rainbow-ish order black->white
    const prefer = [
      "black",
      "maroon",
      "red",
      "orange",
      "gold",
      "lime",
      "forest green",
      "military green",
      "tropical blue",
      "royal",
      "purple",
      "ash",
      "grey",
      "white",
    ];
    const normalized = [...set].map((c) => ({ raw: c, key: normColor(c) }));
    const inOrder = prefer
      .map((k) => normalized.find((n) => n.key === k))
      .filter(Boolean)
      .map((n) => n.raw);
    const leftovers = normalized
      .filter((n) => !prefer.includes(n.key))
      .map((n) => n.raw);
    return [...new Set([...inOrder, ...leftovers])];
  }, [product]);

  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach((v) => {
      if (!color || v.color === color) v.size && set.add(v.size);
    });
    return [...set];
  }, [product, color]);

  const canProceed =
    product &&
    (!colors.length || color) &&
    (!sizes.length || size) &&
    hasObjects;

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <Flex direction={{ base: "column", xl: "row" }} minH="100vh" bg="brand.primary">
      {/* Left rail */}
      <Box
        w={{ base: "100%", xl: "320px" }}
        borderRightWidth={{ xl: "1px" }}
        borderColor="whiteAlpha.200"
        p={4}
        bg="brand.paper"
      >
        {!product ? (
          <VStack p={6} spacing={3} align="stretch">
            <Skeleton height="28px" />
            <Skeleton height="200px" />
            <Skeleton height="28px" />
          </VStack>
        ) : (
          <>
            <HStack justify="space-between" mb={4}>
              <HStack>
                <ProductTypeBadgeIcon type={productType} />
                <Heading size="md" color="brand.textLight">
                  {product.name}
                </Heading>
                <Badge variant="outline" colorScheme="yellow" opacity={0.8} ml={2}>
                  {productType}
                </Badge>
              </HStack>
              <Tooltip label="Reset view">
                <Button size="xs" onClick={() => setZoomSafe(1)} leftIcon={<FaRedoAlt />}>
                  1.00x
                </Button>
              </Tooltip>
            </HStack>

            <Tabs variant="enclosed" colorScheme="yellow" size="sm">
              <TabList>
                <Tab>Options</Tab>
                <Tab>Designs</Tab>
                <Tab>Text</Tab>
              </TabList>
              <TabPanels>
                {/* Options */}
                <TabPanel px={0}>
                  <VStack align="stretch" spacing={5}>
                    {/* view */}
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

                    {/* colors */}
                    <Box>
                      <Text mb={2} color="brand.textLight" fontWeight="medium">
                        Color
                      </Text>
                      <HStack wrap="wrap" spacing={2}>
                        {colors.length ? (
                          colors.map((c) => {
                            const key = normColor(c);
                            const hex = COLOR_SWATCHES[key] || "#ccc";
                            const selected = c === color;
                            return (
                              <Tooltip label={c} key={c}>
                                <Box
                                  aria-label={c}
                                  role="button"
                                  onClick={() => setColor(c)}
                                  borderRadius="full"
                                  boxSize={selected ? "16px" : "12px"}
                                  borderWidth={selected ? "2px" : "1px"}
                                  borderColor={selected ? "yellow.400" : "blackAlpha.600"}
                                  bg={hex}
                                  cursor="pointer"
                                />
                              </Tooltip>
                            );
                          })
                        ) : (
                          <Badge>No color options</Badge>
                        )}
                      </HStack>
                    </Box>

                    {/* size */}
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
                          <Badge>One size</Badge>
                        )}
                      </HStack>
                    </Box>

                    {/* zoom */}
                    <VStack align="stretch" spacing={2}>
                      <Text color="brand.textLight" fontWeight="medium">
                        Zoom
                      </Text>
                      <HStack>
                        <Tooltip label="Zoom out">
                          <Button
                            size="xs"
                            onClick={() => setZoomSafe(zoom - 0.1)}
                            leftIcon={<FaSearchMinus />}
                          >
                            -
                          </Button>
                        </Tooltip>
                        <Text minW="48px" textAlign="center">
                          {zoom.toFixed(2)}x
                        </Text>
                        <Tooltip label="Zoom in">
                          <Button
                            size="xs"
                            onClick={() => setZoomSafe(zoom + 0.1)}
                            leftIcon={<FaSearchPlus />}
                          >
                            +
                          </Button>
                        </Tooltip>
                      </HStack>
                    </VStack>

                    {/* toggles */}
                    <HStack>
                      <Switch
                        size="sm"
                        isChecked={showGrid}
                        onChange={(e) => {
                          setShowGrid(e.target.checked);
                          // easiest: full refresh
                          window.location.reload();
                        }}
                      />
                      <Text fontSize="sm">Grid</Text>
                      <Switch
                        size="sm"
                        isChecked={showRulers}
                        onChange={(e) => {
                          setShowRulers(e.target.checked);
                          window.location.reload();
                        }}
                      />
                      <Text fontSize="sm">Rulers</Text>
                    </HStack>

                    {/* mockup opacity */}
                    <Box>
                      <Text mb={1} color="brand.textLight" fontWeight="medium">
                        Mockup opacity
                      </Text>
                      <Slider
                        aria-label="opacity"
                        min={0.3}
                        max={1}
                        step={0.05}
                        value={mockupOpacity}
                        onChange={setMockupOpacity}
                      >
                        <SliderTrack>
                          <SliderFilledTrack />
                        </SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>

                    <Divider borderColor="whiteAlpha.300" />
                    <Button
                      colorScheme={canProceed ? "yellow" : "gray"}
                      isDisabled={!canProceed}
                      onClick={makePrintReadyAndUpload}
                      width="full"
                    >
                      Add to cart / Checkout
                    </Button>
                    <Text fontSize="xs" color="whiteAlpha.700">
                      We export a true print file at 300 DPI sized to the selected placement.
                    </Text>
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
                              borderColor={
                                selectedDesignId === d._id ? "purple.400" : "transparent"
                              }
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
                      <Text color="brand.textLight" fontSize="sm">
                        No saved designs yet. Create one in “Generate”.
                      </Text>
                    )}
                  </VStack>
                </TabPanel>

                {/* Text */}
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
                        onChange={(v) => setTextSize(parseInt(v || "36", 10))}
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
          </>
        )}
      </Box>

      {/* Right: Canvas + layers mini-toolbar */}
      <Flex flex="1" direction="column" p={4}>
        <HStack mb={2} color="brand.textLight" justify="space-between">
          <HStack>
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
          </HStack>
          <HStack>
            <Tooltip label="Delete selected">
              <Button size="sm" onClick={del} colorScheme="red" variant="outline">
                <FaTrash />
              </Button>
            </Tooltip>
            <Tooltip label="Center horizontally">
              <Button size="sm" onClick={centerH} variant="outline">
                <FaArrowsAltH />
              </Button>
            </Tooltip>
          </HStack>
        </HStack>

        <Box
          ref={wrapRef}
          w="100%"
          paddingTop={`${100 / CANVAS_ASPECT}%`}
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
    </Flex>
  );
}
