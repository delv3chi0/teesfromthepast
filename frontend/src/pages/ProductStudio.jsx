// frontend/src/pages/ProductStudio.jsx
import React, {
  useEffect, useMemo, useRef, useState, useCallback,
} from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, IconButton, Tooltip,
  Tabs, TabList, TabPanels, Tab, TabPanel, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  AspectRatio, Image, SimpleGrid, Badge, Input, Divider, useToast,
} from "@chakra-ui/react";
import {
  FaTshirt, FaHatCowboy, FaHockeyPuck, FaTrash, FaArrowsAltH, FaCompressAlt,
  FaUndo, FaRedo, FaSearchMinus, FaSearchPlus, FaEye, FaEyeSlash, FaLock, FaLockOpen,
  FaChevronUp, FaChevronDown, FaUpload,
} from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { client } from "../api/client";

import {
  getMockupCandidates, getPrimaryImage, listColors, resolveColor,
  getPlacement, getProductType,
} from "../data/mockupsRegistry";

const CANVAS_ASPECT = 3 / 4;

// Fixed export pixel sizes for print files.
// You can tweak per product/view later if needed.
function getExportPixelSize(slug, view, productType) {
  const v = String(view || "front").toLowerCase();
  if (v === "left" || v === "right") {
    return { width: 3600, height: 3600 };
  }
  // front/back default
  return { width: 4200, height: 4800 };
}

// UI mapping (same as ProductCard palette keys you use)
const COLOR_SWATCHES = {
  black: "#000000", white: "#FFFFFF", maroon: "#800000", red: "#D32F2F",
  royal: "#1E40AF", "royal blue": "#1E40AF", purple: "#6B21A8",
  charcoal: "#36454F", "military green": "#4B5320", "forest green": "#228B22",
  lime: "#9CCC65", "tropical blue": "#1CA3EC", navy: "#0B1F44",
  gold: "#D4AF37", orange: "#F57C00", azalea: "#FF77A9",
  "brown savanna": "#7B5E57", sand: "#E0CDA9", ash: "#B2BEB5",
  sport_grey: "#B5B8B1", grey: "#8E8E8E",
};

const norm = (s) => String(s || "").trim().toLowerCase();
const VIEWS = ["front", "back", "left", "right"];

function ProductTypeBadgeIcon({ type }) {
  const IconCmp =
    type === "hat"    ? FaHatCowboy :
    type === "beanie" ? FaHockeyPuck : FaTshirt;
  return <IconCmp color="var(--chakra-colors-yellow-400)" />;
}

async function directUpload(file, productSlug) {
  // 1. Get signature
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: `tees_from_the_past/print_files/${productSlug}` })
  });
  const signJson = await signRes.json();
  if (!signJson.ok) throw new Error("Failed to get Cloudinary signature");
  const { cloudName, apiKey, signature, timestamp, folder, preset } = signJson.data;

  // 2. multipart/form-data upload
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("folder", folder);
  if (preset) form.append("upload_preset", preset);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(`Cloudinary upload failed: ${uploadJson.error?.message || "Unknown"}`);
  }

  // 3. Finalize with backend (store metadata / unify API response)
  const finalizeRes = await fetch("/api/upload/printfile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productSlug,
      cloudinaryPublicId: uploadJson.public_id,
      mime: file.type
    })
  });
  const finalizeJson = await finalizeRes.json();
  if (!finalizeRes.ok || !finalizeJson.ok) {
    throw new Error(finalizeJson.error?.message || "Finalize failed");
  }
  return { ...finalizeJson, cloudinary: uploadJson };
}

export default function ProductStudio() {
  const toast = useToast();
  const navigate = useNavigate();
  const { slug: slugParamFromRoute } = useParams();
  const { search } = useLocation();
  const qs = useMemo(() => new URLSearchParams(search), [search]);

  const slugParam = qs.get("slug") || slugParamFromRoute || "classic-tee";
  const colorParam = qs.get("color") || "";
  const sizeParam  = qs.get("size") || "";

  const [product, setProduct] = useState(null);
  const productType = useMemo(() => getProductType(product?.slug || slugParam), [product, slugParam]);
  const [view, setView]   = useState("front");
  const [color, setColor] = useState(colorParam || "black");
  const [size, setSize]   = useState(sizeParam || "");
  const [zoom, setZoom]   = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [mockupVisible, setMockupVisible] = useState(true);
  const [mockupOpacity, setMockupOpacity] = useState(1);
  const [hasObjects, setHasObjects] = useState(false);
  const [layerTick, setLayerTick] = useState(0);
  const [uploading, setUploading] = useState(false);

  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const printRectRef = useRef(null);     // dashed rectangle
  const clipRef = useRef(null);          // clipPath rect (absolute)
  const bgImgInfoRef = useRef(null);     // {img, scale, left, top, width, height}
  const undoStack = useRef([]); const redoStack = useRef([]);
  const guideVRef = useRef(null); const guideHRef = useRef(null);
  const warnedRef = useRef(false);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const drawBackgroundRef = useRef(() => {});

  // ---------- data fetch ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugParam) return;
        const res = await client.get(`/storefront/product/${encodeURIComponent(slugParam)}`);
        if (cancelled) return;
        const p = res.data || {};
        setProduct(p);

        const regs = listColors(p.slug || slugParam);
        if (regs.length) {
          setColor(resolveColor(p.slug || slugParam, colorParam || "black"));
        }

        if (!sizeParam) {
          const sset = new Set();
          (p.variants || []).forEach(v => v.size && sset.add(v.size));
          const first = sset.values().next().value;
          if (first) setSize(first);
        }
      } catch {
        setProduct({ slug: slugParam, name: slugParam });
      }
    })();
    return () => { cancelled = true; };
  }, [slugParam, colorParam, sizeParam]);

  // ---------- init Fabric (run once) ----------
  useEffect(() => {
    if (!window.fabric || !wrapRef.current || !canvasRef.current) return;

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
        fc.getObjects().some(o => !["printArea","gridOverlay","guide"].includes(o.id))
      );
      setLayerTick((t) => t + 1);
    };
    fc.on("object:added", onChange);
    fc.on("object:removed", onChange);
    fc.on("object:modified", onChange);

    // Keybindings
    const onKey = (e) => {
      const active = fc.getActiveObject();
      const z = zoomRef.current;
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) { e.preventDefault(); setZoomSafe(z + 0.1); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") { e.preventDefault(); setZoomSafe(z - 0.1); return; }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "g") { setShowGrid((v)=>!v); drawBackgroundRef.current(); return; }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "m") { setMockupVisible((v)=>!v); applyMockupVisibility(); return; }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "f") { autoFit(); return; }
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
      fabricRef.current.setWidth(w); fabricRef.current.setHeight(h);
      drawBackgroundRef.current();
    });
    ro.observe(wrapRef.current);

    return () => {
      window.removeEventListener("keydown", onKey);
      ro.disconnect();
      fc.dispose();
      fabricRef.current = null;
    };
  }, []); // initialize once

  // ---------- utility: grid overlay ----------
  const makeGridDataUrl = useCallback((fc) => {
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

  // ---------- robust image loader with fallbacks ----------
  const loadImageFromCandidates = useCallback((candidates, onSuccess, onFail) => {
    const tryIndex = (i) => {
      if (i >= candidates.length) { onFail && onFail(); return; }
      const url = candidates[i];
      window.fabric.util.loadImage(
        url,
        (imgEl) => {
          if (!imgEl) { tryIndex(i + 1); return; }
          const img = new window.fabric.Image(imgEl, { crossOrigin: "anonymous" });
          onSuccess(img, url);
        },
        null,
        "anonymous"
      );
    };
    tryIndex(0);
  }, []);

  // ---------- draw background + print area ----------
  const drawBackground = useCallback(() => {
    const fc = fabricRef.current; if (!fc) return;

    // keep user objects
    const keep = fc.getObjects().filter(o => !["printArea","gridOverlay","guide"].includes(o.id));
    fc.clear(); keep.forEach(o => fc.add(o));

    const slug = norm(product?.slug || slugParam);
    const candidates = getMockupCandidates({ slug, color, view });

    loadImageFromCandidates(
      candidates,
      (img /* fabric.Image */, loadedUrl) => {
        const canvasW = fc.width, canvasH = fc.height;

        // scale mockup to full height
        const scale = canvasH / img.height;
        const imgW = img.width * scale;
        const imgH = img.height * scale;
        const imgLeft = (canvasW - imgW) / 2;
        const imgTop = 0;

        img.set({
          left: imgLeft,
          top: imgTop,
          originX: "left",
          originY: "top",
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          opacity: mockupVisible ? mockupOpacity : 0,
        });
        fc.setBackgroundImage(img, fc.renderAll.bind(fc));
        bgImgInfoRef.current = {
          url: loadedUrl, img, scale,
          left: imgLeft, top: imgTop, width: imgW, height: imgH,
        };

        // grid overlay
        const gridUrl = makeGridDataUrl(fc);
        window.fabric.Image.fromURL(gridUrl, (grid) => {
          grid.set({
            id: "gridOverlay", selectable: false, evented: false,
            top: 0, left: 0, originX: "left", originY: "top",
            opacity: showGrid ? 1 : 0,
          });
          fc.setOverlayImage(grid, fc.renderAll.bind(fc));
        });

        // print area from normalized fractions
        const { x, y, w, h } = getPlacement({ slug, view, productType });

        const rectLeft = bgImgInfoRef.current.left + x * bgImgInfoRef.current.width;
        const rectTop  = bgImgInfoRef.current.top  + y * bgImgInfoRef.current.height;
        const rectW    = w * bgImgInfoRef.current.width;
        const rectH    = h * bgImgInfoRef.current.height;

        const rect = new window.fabric.Rect({
          id: "printArea",
          left: rectLeft,
          top: rectTop,
          width: rectW,
          height: rectH,
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

        // absolute clipPath for all objects
        const clip = new window.fabric.Rect({
          left: rectLeft, top: rectTop, width: rectW, height: rectH,
          absolutePositioned: true, originX: "left", originY: "top",
        });
        clipRef.current = clip;
        fc.getObjects().forEach(o => {
          if (!["printArea","gridOverlay"].includes(o.id)) o.clipPath = clip;
        });

        fc.requestRenderAll();
      },
      () => {
        // all failed → blank background + placeholder box in center
        const canvasW = fc.width, canvasH = fc.height;
        const rectW = canvasW * 0.38, rectH = canvasH * 0.49;
        const rectLeft = (canvasW - rectW)/2;
        const rectTop  = (canvasH - rectH)/2;
        const rect = new window.fabric.Rect({
          id: "printArea", left: rectLeft, top: rectTop, width: rectW, height: rectH,
          originX: "left", originY: "top", fill: "", stroke: "#FFFFFF",
          strokeDashArray: [6,6], strokeWidth: 2, selectable:false, evented:false,
          excludeFromExport: true,
        });
        fc.add(rect);
        printRectRef.current = rect;
        clipRef.current = new window.fabric.Rect({
          left: rectLeft, top: rectTop, width: rectW, height: rectH,
          absolutePositioned: true, originX:"left", originY:"top",
        });
        fc.getObjects().forEach(o => { if (o.id!=="printArea") o.clipPath = clipRef.current; });
        fc.requestRenderAll();
      }
    );
  }, [product, slugParam, color, view, mockupOpacity, mockupVisible, showGrid, makeGridDataUrl, productType, loadImageFromCandidates]);

  drawBackgroundRef.current = drawBackground;
  useEffect(() => { drawBackground(); }, [drawBackground]);

  const applyMockupVisibility = useCallback(() => {
    const fc = fabricRef.current, info = bgImgInfoRef.current;
    if (!fc || !info || !info.img) return;
    info.img.opacity = mockupVisible ? mockupOpacity : 0;
    fc.requestRenderAll();
  }, [mockupVisible, mockupOpacity]);
  useEffect(() => { applyMockupVisibility(); }, [applyMockupVisibility]);

  // ---------- snap, clamp, guides ----------
  useEffect(() => {
    const fc = fabricRef.current; if (!fc) return;
    const SNAP = 8;

    const hideGuides = () => {
      [guideVRef.current, guideHRef.current].forEach((g) => g && fc.remove(g));
      guideVRef.current = null; guideHRef.current = null;
      fc.requestRenderAll();
    };
    const showGuide = (axis, x1, y1, x2, y2) => {
      const ln = new window.fabric.Line([x1, y1, x2, y2], {
        stroke: "#FFD54F", strokeWidth: 1, selectable: false, evented: false,
        strokeDashArray: [4,4], id: "guide", excludeFromExport: true,
      });
      if (axis === "v") { if (guideVRef.current) fc.remove(guideVRef.current); guideVRef.current = ln; }
      else { if (guideHRef.current) fc.remove(guideHRef.current); guideHRef.current = ln; }
      fc.add(ln);
    };

    const onTransform = () => {
      const area = printRectRef.current; if (!area) return;
      const a = area.getBoundingRect(true,true);
      const o = fc.getActiveObject();
      if (!o) { hideGuides(); return; }

      const bb = o.getBoundingRect(true,true);

      // center snap to print area
      const cx = a.left + a.width/2;
      const cy = a.top + a.height/2;
      const ocx = bb.left + bb.width/2;
      const ocy = bb.top + bb.height/2;

      let snapV=false, snapH=false;
      if (Math.abs(ocx - cx) < SNAP) { o.left += cx - ocx; snapV = true; }
      if (Math.abs(ocy - cy) < SNAP) { o.top  += cy - ocy; snapH = true; }

      // clamp inside print area
      const bb2 = o.getBoundingRect(true,true);
      if (bb2.left < a.left) o.left += a.left - bb2.left;
      if (bb2.top  < a.top)  o.top  += a.top  - bb2.top;
      if (bb2.left + bb2.width > a.left + a.width)
        o.left -= bb2.left + bb2.width - (a.left + a.width);
      if (bb2.top + bb2.height > a.top + a.height)
        o.top  -= bb2.top  + bb2.height - (a.top + a.height);

      o.setCoords();

      const overflow =
        bb2.left < a.left || bb2.top < a.top ||
        bb2.left + bb2.width > a.left + a.width ||
        bb2.top + bb2.height > a.top + a.height;

      if (overflow && !warnedRef.current) {
        warnedRef.current = true;
        toast({ title: "Part of your design is outside the print area", status: "warning", duration: 1400 });
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
    fc.on("mouse:up", () => { hideGuides(); });
    fc.on("selection:cleared", () => { hideGuides(); });

    return () => {
      fc.off("object:moving", onTransform);
      fc.off("object:scaling", onTransform);
      fc.off("object:rotating", onTransform);
      fc.off("mouse:up");
      fc.off("selection:cleared");
    };
  }, [toast]);

  // ---------- actions ----------
  const setZoomSafe = (z) => {
    const fc = fabricRef.current; if (!fc) return;
    const clamped = Math.max(0.75, Math.min(2, z));
    setZoom(clamped);

    // zoom to print area center
    const area = printRectRef.current;
    const cx = area ? area.left + area.width/2 : fc.width/2;
    const cy = area ? area.top  + area.height/2 : fc.height/2;
    fc.zoomToPoint(new window.fabric.Point(cx, cy), clamped);
    fc.requestRenderAll();
  };

  const pushHistory = () => {
    const fc = fabricRef.current; if (!fc) return;
    redoStack.current = [];
    undoStack.current.push(JSON.stringify(fc.toDatalessJSON(["id"])));
    if (undoStack.current.length > 60) undoStack.current.shift();
  };
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
    const fc = fabricRef.current; if (!fc) return;
    const textValue = prompt("Enter text"); if (!textValue) return;
    const t = new window.fabric.IText(textValue.trim(), {
      left: fc.width/2, top: fc.height/2, originX:"center", originY:"center",
      fill: "#ffffff", fontSize: 36,
    });
    t.clipPath = clipRef.current || null;
    pushHistory(); fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
  };

  const addDesignFromUrl = (url) => {
    const fc = fabricRef.current; if (!fc) return;
    if (!url) return;
    window.fabric.Image.fromURL(url, (img) => {
      fitInsidePrintArea(img, 0.90);
      pushHistory(); fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };

  const uploadLocal = (file) => {
    if (!file) return;
    const fc = fabricRef.current;

    if (/\.svg$/i.test(file.name)) {
      const r = new FileReader();
      r.onload = () => {
        const svgText = r.result;
        window.fabric.loadSVGFromString(svgText, (objects, options) => {
          const grp = window.fabric.util.groupSVGElements(objects, options);
          fitInsidePrintArea(grp, 0.90);
          pushHistory(); fc.add(grp); fc.setActiveObject(grp); fc.requestRenderAll();
        });
      };
      r.readAsText(file);
      return;
    }

    const r = new FileReader();
    r.onload = () => {
      window.fabric.Image.fromURL(r.result, (img) => {
        fitInsidePrintArea(img, 0.90);
        pushHistory(); fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
      });
    };
    r.readAsDataURL(file);
  };

  function fitInsidePrintArea(obj, fraction = 0.90) {
    const fc = fabricRef.current; if (!fc) return;
    const area = printRectRef.current; if (!area) return;

    const ab = { left: area.left, top: area.top, width: area.width, height: area.height };

    const ow = obj.getScaledWidth(), oh = obj.getScaledHeight();
    const maxW = ab.width * fraction, maxH = ab.height * fraction;
    const s = Math.min(maxW/ow, maxH/oh);
    obj.scaleX *= s; obj.scaleY *= s;

    const bb = obj.getBoundingRect(true,true);
    obj.set({
      left: obj.left + (ab.left + ab.width/2 - (bb.left + bb.width/2)),
      top:  obj.top  + (ab.top  + ab.height/2 - (bb.top  + bb.height/2)),
      originX: "left", originY: "top",
      clipPath: clipRef.current || null,
    });
    obj.setCoords();
  }

  const del = () => {
    const fc = fabricRef.current; if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || ["printArea","gridOverlay","guide"].includes(active.id)) return;
    pushHistory(); fc.remove(active); fc.discardActiveObject(); fc.requestRenderAll();
  };

  const centerX = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); const a = printRectRef.current; if (!o || !a) return;
    const ab = { left: a.left, top: a.top, width: a.width, height: a.height };
    const bb = o.getBoundingRect(true,true);
    o.left += ab.left + ab.width/2 - (bb.left + bb.width/2);
    o.setCoords(); fc.requestRenderAll();
  };

  const autoFit = () => {
    const fc = fabricRef.current; if (!fc) return;
    const o = fc.getActiveObject(); if (!o) return;
    fitInsidePrintArea(o, 0.90);
  };

  // ---- High-res export (cropped + scaled) ----
  function exportPrintPNG() {
    const fc = fabricRef.current; if (!fc) return null;
    const area = printRectRef.current; if (!area) return null;

    const left = area.left;
    const top = area.top;
    const width = area.width;
    const height = area.height;

    const { width: exportW } = getExportPixelSize(product?.slug || slugParam, view, productType);
    const multiplier = exportW / width;

    // Hide editor-only visuals
    const origBg = fc.backgroundImage;
    const origOverlay = fc.overlayImage;

    if (origBg) origBg.opacity = 0;
    if (origOverlay) fc.setOverlayImage(null, fc.renderAll.bind(fc));

    // Hide guide & printArea objects during export
    const hidden = [];
    fc.getObjects().forEach((o) => {
      if (o.id === "printArea" || o.id === "guide") {
        hidden.push([o, o.visible]);
        o.visible = false;
      }
    });
    fc.requestRenderAll();

    const png = fc.toDataURL({
      format: "png",
      left, top, width, height,
      multiplier,
      withoutTransform: true,
      enableRetinaScaling: false,
    });

    // Restore visuals
    hidden.forEach(([o, vis]) => { o.visible = vis; });
    if (origBg) origBg.opacity = (mockupVisible ? mockupOpacity : 0);
    if (origOverlay) fc.setOverlayImage(origOverlay, fc.renderAll.bind(fc));
    fc.requestRenderAll();

    return png;
  }

  const makePrintReadyAndUpload = async () => {
    const fc = fabricRef.current; if (!fc) return;
    const area = printRectRef.current; if (!area) { toast({ title:"No print area", status:"error"}); return; }

    const objs = fc.getObjects().filter(o => !["printArea","gridOverlay","guide"].includes(o.id));
    if (!objs.length) { toast({ title:"Nothing to print", status:"warning"}); return; }

    const png = exportPrintPNG();
    if (!png) { toast({ title: "Export failed", status: "error" }); return; }

    // Also keep a lower-res preview of the whole editor for cart/checkout thumbnails
    const savedOverlay = fc.overlayImage;
    if (savedOverlay) fc.setOverlayImage(null, fc.renderAll.bind(fc));
    const previewPNG = fc.toDataURL({ format: "png", quality: 0.92 });
    if (savedOverlay) fc.setOverlayImage(savedOverlay, fc.renderAll.bind(fc));

    setUploading(true);
    toast({ title: "Uploading print file…", status: "info", duration: 2000 });
    try {
      const upload = await client.post("/upload/printfile", {
        dataUrl: png,
        productSlug: product?.slug || slugParam,
        side: view,
        designName: `${product?.name || "Custom"} ${view}`,
      });

      const { publicUrl, thumbUrl, publicId } = upload.data || {};
      if (!publicUrl) throw new Error("Upload failed");

      // Prepare cart line item
      const unitPrice = product?.priceMin || product?.basePrice || 0;
      const slug = product?.slug || slugParam;
      const productImage = getPrimaryImage(slug);

      const item = {
        productId: product?.id || product?._id || "",
        slug,
        name: product?.name,
        color, size, view,
        preview: previewPNG,       // full-canvas preview for UI
        printFileUrl: publicUrl,   // MASTER print asset (send to Printify/Printful)
        printThumbUrl: thumbUrl,   // tiny preview (grids, order list)
        printPublicId: publicId,   // for later deletes if needed
        productImage,
        unitPrice,
      };
      localStorage.setItem("itemToCheckout", JSON.stringify(item));
      navigate("/checkout");
    } catch (e) {
      console.error(e);
      toast({ title: "Upload failed", status: "error" });
    } finally {
      setUploading(false);
    }
  };

  // ---------- derived ----------
  const registryColors = useMemo(() => listColors(product?.slug || slugParam), [product, slugParam]);
  const sizes = useMemo(() => {
    const set = new Set();
    (product?.variants || []).forEach(v => (!color || v.color) && v.size && set.add(v.size));
    return [...set];
  }, [product, color]);
  const canProceed = product && (!registryColors.length || color) && (!sizes.length || size) && hasObjects && !uploading;

  // ---------- UI ----------
  return (
    <Flex direction={{ base: "column", xl: "row" }} minH="100vh" bg="brand.primary">
      {/* LEFT PANEL */}
      <Box w={{ base: "100%", xl: "320px" }} p={4} borderRightWidth={{ xl: "1px" }} borderColor="whiteAlpha.200" bg="brand.paper">
        <VStack align="stretch" spacing={4}>
          <HStack>
            <ProductTypeBadgeIcon type={productType} />
            <Heading size="md" color="brand.textLight">{product?.name || "Product"}</Heading>
            <Badge variant="outline" colorScheme="yellow" opacity={0.8}>{productType.toUpperCase()}</Badge>
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
                    <Text mb={2} color="brand.textLight" fontWeight="medium">View</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {VIEWS.map((v) => (
                        <Button key={v} size="sm" variant={view===v?"solid":"outline"} onClick={() => setView(v)}>{v}</Button>
                      ))}
                    </HStack>
                  </Box>

                  {/* Color */}
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
                      ) : (<Badge>No colors in registry</Badge>)}
                    </HStack>
                  </Box>

                  {/* Size */}
                  <Box>
                    <Text mb={2} color="brand.textLight" fontWeight="medium">Size</Text>
                    <HStack wrap="wrap" spacing={2}>
                      {sizes.length ? sizes.map((s) => (
                        <Button key={s} size="sm" variant={size===s?"solid":"outline"} onClick={() => setSize(s)}>{s}</Button>
                      )) : (<Badge>No size options</Badge>)}
                    </HStack>
                  </Box>

                  {/* Zoom + toggles */}
                  <VStack align="stretch" spacing={3}>
                    <Text color="brand.textLight" fontWeight="medium">Zoom</Text>
                    <HStack>
                      <Tooltip label="Zoom out"><Button size="sm" onClick={() => setZoomSafe(zoom - 0.1)} leftIcon={<FaSearchMinus />}>Out</Button></Tooltip>
                      <Slider aria-label="zoom" value={zoom} min={0.75} max={2} step={0.1} onChange={setZoomSafe}>
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Tooltip label="Zoom in"><Button size="sm" onClick={() => setZoomSafe(zoom + 0.1)} leftIcon={<FaSearchPlus />}>In</Button></Tooltip>
                    </HStack>

                    <HStack>
                      <Tooltip label="Toggle grid">
                        <IconButton aria-label="grid" size="sm" variant="outline" onClick={() => { setShowGrid(v=>!v); drawBackground(); }} icon={<span>▦</span>} />
                      </Tooltip>
                      <Text color="brand.textLight">Show grid</Text>
                    </HStack>

                    <HStack>
                      <Tooltip label="Toggle mockup"><IconButton aria-label="mockup" size="sm" variant="outline" icon={mockupVisible ? <FaEye/> : <FaEyeSlash/>} onClick={() => setMockupVisible(v=>!v)} /></Tooltip>
                      <Text color="brand.textLight">Show mockup</Text>
                    </HStack>

                    <Box>
                      <Text color="brand.textLight" fontWeight="medium" mb={1}>Mockup opacity</Text>
                      <Slider aria-label="mockup-opacity" min={0.2} max={1} step={0.05} value={mockupOpacity} onChange={setMockupOpacity} onChangeEnd={() => applyMockupVisibility()}>
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                    </Box>
                  </VStack>

                  <Divider borderColor="whiteAlpha.300" />

                  <HStack>
                    <Button size="sm" onClick={centerX} leftIcon={<FaArrowsAltH />}>Center X</Button>
                    <Button size="sm" onClick={autoFit} leftIcon={<FaCompressAlt />}>Center & Fit</Button>
                  </HStack>

                  <Divider borderColor="whiteAlpha.300" />

                  <Button colorScheme={canProceed ? "yellow" : "gray"} isDisabled={!canProceed} onClick={makePrintReadyAndUpload} isLoading={uploading}>
                    Add to cart / Checkout
                  </Button>
                  <Text fontSize="xs" color="whiteAlpha.700">We export a true print file sized to the selected placement.</Text>

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
                    <FaUpload />
                  </HStack>

                  <SavedDesigns addDesignFromUrl={addDesignFromUrl} />
                </VStack>
              </TabPanel>

              {/* Text */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Button onClick={addText} size="sm" colorScheme="teal">Add Text</Button>
                  <Text fontSize="sm" color="whiteAlpha.800">Use Fabric controls on the canvas to edit.</Text>
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
          {(() => {
            const fc = fabricRef.current; if (!fc) return null;
            return fc.getObjects()
              .filter(o => !["printArea","gridOverlay","guide"].includes(o.id))
              .map((o, idx) => {
                const visible = o.visible !== false;
                const locked = !!o.lockMovementX || !!o.lockMovementY;
                const label =
                  o.type === "i-text" ? "TEXT" :
                  o.type === "image" ? "IMAGE" :
                  o.type === "group" ? "SVG" : (o.type || "OBJECT").toUpperCase();
                return (
                  <HStack key={idx} p={2} borderRadius="md" _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => { fabricRef.current.setActiveObject(o); fabricRef.current.requestRenderAll(); }}>
                    <Text color="whiteAlpha.900" fontSize="sm" noOfLines={1}>{label}</Text>
                    <HStack ml="auto" spacing={1}>
                      <IconButton aria-label="visible" size="xs" variant="ghost"
                        icon={visible ? <FaEye/> : <FaEyeSlash/>}
                        onClick={(e)=>{ e.stopPropagation(); o.visible = !visible; fabricRef.current.requestRenderAll(); setLayerTick(t=>t+1); }} />
                      <IconButton aria-label="lock" size="xs" variant="ghost"
                        icon={locked ? <FaLock/> : <FaLockOpen/>}
                        onClick={(e)=>{ e.stopPropagation(); const L=!locked; o.lockMovementX=L; o.lockMovementY=L; o.hasControls=!L; o.selectable=!L; fabricRef.current.requestRenderAll(); setLayerTick(t=>t+1); }} />
                      <IconButton aria-label="up" size="xs" variant="ghost"
                        icon={<FaChevronUp/>}
                        onClick={(e)=>{ e.stopPropagation(); fabricRef.current.bringForward(o); fabricRef.current.requestRenderAll(); setLayerTick(t=>t+1); }} />
                      <IconButton aria-label="down" size="xs" variant="ghost"
                        icon={<FaChevronDown/>}
                        onClick={(e)=>{ e.stopPropagation(); fabricRef.current.sendBackwards(o); fabricRef.current.requestRenderAll(); setLayerTick(t=>t+1); }} />
                    </HStack>
                  </HStack>
                );
              });
          })()}
          {!hasObjects && <Text color="whiteAlpha.700" fontSize="xs" px={2} py={3}>Add an image or text to get started.</Text>}
        </VStack>
      </Box>
    </Flex>
  );
}

// Simple saved designs grid (prefers thumb for speed; inserts publicUrl for quality)
function SavedDesigns({ addDesignFromUrl }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await client.get("/mydesigns");
        // Accept both {items:[]} or [] responses
        const arr = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        if (!cancel) setDesigns(arr);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);
  if (loading) return <Text color="whiteAlpha.800">Loading designs…</Text>;
  if (!designs.length) return <Text color="whiteAlpha.800" fontSize="sm">No saved designs yet. Upload above or create in “Generate”.</Text>;
  return (
    <SimpleGrid columns={{ base: 3 }} spacing={2}>
      {designs.map((d) => {
        // Thumbnail priority for grid speed
        const tileSrc   = d.thumbUrl || d.imageDataUrl || d.publicUrl;
        // High-quality source added to canvas
        const insertSrc = d.publicUrl || d.imageDataUrl || d.thumbUrl;
        return (
          <Tooltip key={d._id} label={d.prompt || "design"}>
            <Box
              borderWidth="2px"
              borderColor="transparent"
              rounded="md"
              overflow="hidden"
              cursor="pointer"
              _hover={{ borderColor: "purple.400" }}
              onClick={() => addDesignFromUrl(insertSrc)}
            >
              <AspectRatio ratio={1}>
                <Image src={tileSrc} alt={d.prompt} objectFit="cover" />
              </AspectRatio>
            </Box>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
