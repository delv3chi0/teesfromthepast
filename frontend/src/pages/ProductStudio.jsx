import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Box, Flex, VStack, HStack, Heading, Text, Button, Icon, SimpleGrid, AspectRatio, Image,
  Tooltip, useToast, Skeleton, NumberInput, NumberInputField, NumberInputStepper,
  NumberIncrementStepper, NumberDecrementStepper, Input, Tabs, TabList, TabPanels, Tab, TabPanel,
  Divider, Badge, Slider, SliderTrack, SliderFilledTrack, SliderThumb, IconButton, Select,
  Switch, FormControl, FormLabel, Spacer
} from "@chakra-ui/react";
import { useLocation, useNavigate } from "react-router-dom";
import { client } from "../api/client";
import {
  FaTrash, FaArrowsAltH, FaUndo, FaRedo, FaSearchMinus, FaSearchPlus, FaCopy,
  FaLayerGroup, FaUpload, FaTextHeight, FaEye, FaEyeSlash, FaLock, FaLockOpen,
  FaChevronLeft, FaChevronRight, FaCloudUploadAlt, FaAlignLeft, FaAlignCenter,
  FaAlignRight, FaGripLines, FaAngleUp, FaAngleDown
} from "react-icons/fa";

/** ————— constants ————— */
const DPI = 300;
const ASPECT = 2 / 3; // canvas aspect ratio
const Placeholder = "https://placehold.co/800x1000/1a202c/a0aec0?text=No+Image";

// coarse default print areas; can be replaced by real per-variant data later
const PRINT_AREAS = {
  front:  { widthInches: 12, heightInches: 16 },
  back:   { widthInches: 12, heightInches: 16 },
  sleeve: { widthInches: 3.5, heightInches: 3.5 },
};

/** ————— helpers ————— */
function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Try to pick a sensible mockup URL from product data
function getMockupUrl(product, view, color) {
  if (!product) return null;

  const pickFromVariant = () => {
    const v = (product.variants || []).find((x) => !color || x.color === color) || product.variants?.[0];
    if (!v) return null;

    // favorites: imageSet.url -> files.preview_url/url/thumbnail_url -> image
    if (v.imageSet?.[0]?.url) return v.imageSet[0].url;
    if (v.files?.length) {
      const f = v.files.find((f) => f.preview_url) || v.files.find((f) => f.url) || v.files.find((f) => f.thumbnail_url);
      if (f) return f.preview_url || f.url || f.thumbnail_url;
    }
    return v.image || null;
  };

  return (
    pickFromVariant() ||
    product.image ||
    product.images?.[0]?.url ||
    (Array.isArray(product.images) ? product.images[0] : null) ||
    Placeholder
  );
}

// collect unique colors/sizes from variants
const collectColors = (product) => {
  const set = new Set();
  (product?.colors || []).forEach((c) => set.add(c));
  (product?.variants || []).forEach((v) => v?.color && set.add(v.color));
  return Array.from(set);
};
const collectSizes = (product, color) => {
  const set = new Set();
  (product?.sizes || []).forEach((s) => set.add(s));
  (product?.variants || []).forEach((v) => {
    if (!color || v?.color === color) v?.size && set.add(v.size);
  });
  return Array.from(set);
};

/** ————— main component ————— */
export default function ProductStudio() {
  const toast = useToast();
  const navigate = useNavigate();
  const query = useQuery();

  const slugFromQuery  = query.get("slug")  || "";
  const colorFromQuery = query.get("color") || "";
  const sizeFromQuery  = query.get("size")  || "";

  // product & variant UI state
  const [product, setProduct] = useState(null);
  const [view, setView] = useState("front");           // 'front' | 'back' | 'sleeve'
  const [color, setColor] = useState(colorFromQuery);
  const [size, setSize]   = useState(sizeFromQuery);

  // designs
  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);

  // canvases (one per view) so objects/positions are view-specific
  const canvasRefs = useRef({ front: null, back: null, sleeve: null });
  const canvasElRefs = { front: useRef(null), back: useRef(null), sleeve: useRef(null) };
  const wrapRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  // history per view
  const historyRef = useRef({ front: {undo:[], redo:[]}, back:{undo:[],redo:[]}, sleeve:{undo:[],redo:[]} });

  // toolbar state
  const [textValue, setTextValue] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize]   = useState(36);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [showPrintArea, setShowPrintArea] = useState(true);

  // 1) fetch product by slug
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!slugFromQuery) return;
        const res = await client.get(`/storefront/product/${slugFromQuery}`);
        if (cancelled) return;
        const p = res.data;
        setProduct(p);
        if (!colorFromQuery) {
          const colors = collectColors(p);
          setColor(colors[0] || "");
        }
        if (!sizeFromQuery) {
          const sizes = collectSizes(p, colorFromQuery || collectColors(p)[0]);
          setSize(sizes[0] || "");
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Could not load product", status: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [slugFromQuery, colorFromQuery, sizeFromQuery, toast]);

  // 2) fetch user's saved designs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDesigns(true);
        const res = await client.get("/mydesigns");
        if (!cancelled) setDesigns(res.data || []);
      } catch (e) {
        // non-fatal
      } finally {
        if (!cancelled) setLoadingDesigns(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 3) init Fabric.js canvas for each view on demand
  const ensureCanvas = useCallback((which) => {
    if (!which) which = view;
    if (canvasRefs.current[which]) return canvasRefs.current[which];
    if (!window.fabric || !wrapRef.current || !canvasElRefs[which].current) return null;

    const parentW = wrapRef.current.clientWidth;
    const parentH = parentW / ASPECT;

    const fc = new window.fabric.Canvas(canvasElRefs[which].current, {
      width: parentW,
      height: parentH,
      preserveObjectStacking: true,
      selection: true,
    });

    // Add selection overlay to feel snappier
    fc.selectionColor = "rgba(255,255,255,0.06)";
    fc.selectionBorderColor = "rgba(255,255,255,0.25)";

    // track objects for history
    const onChange = () => pushHistory(which, false); // soft mark; we coalesce
    fc.on("object:added", onChange);
    fc.on("object:removed", onChange);
    fc.on("object:modified", onChange);

    canvasRefs.current[which] = fc;
    return fc;
  }, [view]);

  // Resize observer to keep canvas responsive
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      ["front","back","sleeve"].forEach((w) => {
        const fc = canvasRefs.current[w];
        if (!fc || !wrapRef.current) return;
        const newW = wrapRef.current.clientWidth;
        const newH = newW / ASPECT;
        fc.setWidth(newW);
        fc.setHeight(newH);
        fc.requestRenderAll();
      });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // helpers: history
  const pushHistory = (which = view, hard = true) => {
    const fc = canvasRefs.current[which];
    if (!fc) return;
    const stack = historyRef.current[which];
    if (hard) stack.redo = [];
    const snap = JSON.stringify(fc.toDatalessJSON(["id", "locked"]));
    if (stack.undo.length && stack.undo[stack.undo.length-1] === snap) return;
    stack.undo.push(snap);
    if (stack.undo.length > 50) stack.undo.shift();
  };
  const loadJSON = (which, json) => {
    const fc = canvasRefs.current[which];
    if (!fc) return;
    fc.loadFromJSON(json, () => fc.renderAll());
  };
  const undo = () => {
    const which = view;
    const st = historyRef.current[which];
    const fc = canvasRefs.current[which];
    if (!fc || st.undo.length < 2) return;
    const curr = st.undo.pop();
    st.redo.push(curr);
    const prev = st.undo[st.undo.length-1];
    loadJSON(which, prev);
  };
  const redo = () => {
    const which = view;
    const st = historyRef.current[which];
    const fc = canvasRefs.current[which];
    if (!fc || st.redo.length === 0) return;
    const nxt = st.redo.pop();
    st.undo.push(nxt);
    loadJSON(which, nxt);
  };

  // draw background + print area for current view
  const refreshBackground = useCallback((which = view) => {
    const fc = ensureCanvas(which);
    if (!fc) return;

    const imgUrl = getMockupUrl(product, which, color) || Placeholder;

    // keep user objects
    const keep = fc.getObjects().filter((o) => o.id !== "printArea");
    fc.clear();
    keep.forEach((o) => fc.add(o));

    window.fabric.Image.fromURL(imgUrl, (img) => {
      const scale = Math.min(fc.width / img.width, fc.height / img.height);
      fc.setBackgroundImage(img, fc.renderAll.bind(fc), {
        scaleX: scale, scaleY: scale, top: fc.height / 2, left: fc.width / 2, originX: "center", originY: "center"
      });

      if (showPrintArea) {
        const area = PRINT_AREAS[which] || PRINT_AREAS.front;
        // preview scale fudge so area isn't gigantic
        const pxW = area.widthInches * DPI * (scale / 3);
        const pxH = area.heightInches * DPI * (scale / 3);

        const rect = new window.fabric.Rect({
          id: "printArea",
          left: fc.width / 2,
          top: fc.height / 2,
          originX: "center",
          originY: "center",
          width: pxW,
          height: pxH,
          fill: "",
          stroke: "white",
          strokeDashArray: [6, 6],
          strokeWidth: 2,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
        });
        fc.add(rect);
      }

      fc.requestRenderAll();
      pushHistory(which); // hard snapshot after full refresh
    }, { crossOrigin: "anonymous" });
  }, [product, color, showPrintArea, ensureCanvas]);

  // refresh background when product/color/view changes
  useEffect(() => { if (product) refreshBackground(view); }, [product, color, view, refreshBackground]);

  /** ——— object helpers ——— */
  const active = () => canvasRefs.current[view]?.getActiveObject() || null;
  const allObjects = () => (canvasRefs.current[view]?.getObjects() || []).filter(o=>o.id!=="printArea");
  const selectByIndex = (idx) => {
    const fc = canvasRefs.current[view]; if (!fc) return;
    const objs = allObjects(); const obj = objs[idx]; if (!obj) return;
    fc.setActiveObject(obj); fc.requestRenderAll();
  };

  // snapping inside print area
  useEffect(() => {
    const fc = canvasRefs.current[view];
    if (!fc) return;

    const clampInside = () => {
      if (!snapToGuides) return;
      const area = fc.getObjects().find((o) => o.id === "printArea");
      if (!area) return;
      const objs = allObjects();
      objs.forEach((o) => {
        const bb = o.getBoundingRect(true, true);
        const a = area.getBoundingRect(true, true);
        // constraints
        if (bb.left < a.left) o.left += (a.left - bb.left);
        if (bb.top < a.top) o.top += (a.top - bb.top);
        if (bb.left + bb.width > a.left + a.width) o.left -= (bb.left + bb.width - (a.left + a.width));
        if (bb.top + bb.height > a.top + a.height) o.top -= (bb.top + bb.height - (a.top + a.height));
        o.setCoords();
      });
      fc.requestRenderAll();
    };

    fc.on("object:moving", clampInside);
    fc.on("object:scaling", clampInside);
    fc.on("object:rotating", clampInside);
    return () => {
      fc.off("object:moving", clampInside);
      fc.off("object:scaling", clampInside);
      fc.off("object:rotating", clampInside);
    };
  }, [view, snapToGuides]);

  /** ——— tools ——— */
  const addText = () => {
    const fc = ensureCanvas(); if (!fc || !textValue.trim()) return;
    const t = new window.fabric.IText(textValue, {
      left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center",
      fill: textColor, fontSize: textSize
    });
    pushHistory();
    fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
    setTextValue("");
  };

  const addDesign = (design) => {
    const fc = ensureCanvas(); if (!fc || !design?.imageDataUrl) return;
    window.fabric.Image.fromURL(design.imageDataUrl, (img) => {
      img.set({ left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };

  const uploadLocal = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const fc = ensureCanvas(); if (!fc) return;
    window.fabric.Image.fromURL(url, (img) => {
      img.set({ left: fc.width / 2, top: fc.height / 2, originX: "center", originY: "center", scaleX: 0.5, scaleY: 0.5 });
      pushHistory();
      fc.add(img); fc.setActiveObject(img); fc.requestRenderAll();
    });
  };

  const del = () => {
    const fc = canvasRefs.current[view]; if (!fc) return;
    const obj = active();
    if (!obj || obj.id === "printArea") return;
    pushHistory();
    fc.remove(obj); fc.discardActiveObject(); fc.requestRenderAll();
  };

  const centerH = () => {
    const fc = canvasRefs.current[view]; if (!fc) return;
    const o = active(); if (!o || o.id === "printArea") return;
    o.centerH(); fc.requestRenderAll();
  };

  const duplicate = () => {
    const fc = canvasRefs.current[view]; if (!fc) return;
    const o = active(); if (!o || o.id === "printArea") return;
    o.clone((clone) => {
      clone.set({ left: (o.left || 0) + 20, top: (o.top || 0) + 20 });
      pushHistory();
      fc.add(clone); fc.setActiveObject(clone); fc.requestRenderAll();
    });
  };

  const bringForward = () => {
    const o = active(); if (!o) return;
    o.bringForward(); canvasRefs.current[view].requestRenderAll(); pushHistory();
  };
  const sendBackwards = () => {
    const o = active(); if (!o) return;
    o.sendBackwards(); canvasRefs.current[view].requestRenderAll(); pushHistory();
  };

  const toggleVisibility = () => {
    const o = active(); if (!o) return;
    o.visible = !o.visible; canvasRefs.current[view].requestRenderAll(); pushHistory();
  };

  const toggleLock = () => {
    const o = active(); if (!o) return;
    o.locked = !o.locked;
    o.selectable = !o.locked;
    o.evented = !o.locked;
    canvasRefs.current[view].requestRenderAll(); pushHistory();
  };

  const alignLeft = () => {
    const fc = canvasRefs.current[view]; const area = fc?.getObjects().find(o=>o.id==="printArea"); const o = active();
    if (!fc || !o || !area) return;
    const a = area.getBoundingRect(true,true);
    o.left = a.left + (o.getBoundingRect(true,true).width/2);
    o.originX = "center"; fc.requestRenderAll(); pushHistory();
  };
  const alignCenter = () => { const fc=canvasRefs.current[view]; const o=active(); if(!fc||!o) return; o.centerH(); fc.requestRenderAll(); pushHistory(); };
  const alignRight = () => {
    const fc = canvasRefs.current[view]; const area = fc?.getObjects().find(o=>o.id==="printArea"); const o = active();
    if (!fc || !o || !area) return;
    const a = area.getBoundingRect(true,true);
    o.left = a.left + a.width - (o.getBoundingRect(true,true).width/2);
    o.originX="center"; fc.requestRenderAll(); pushHistory();
  };

  const setZoomSafe = (z) => {
    const fc = canvasRefs.current[view]; if (!fc) return;
    const clamped = Math.max(0.5, Math.min(2, z));
    setZoom(clamped);
    fc.setZoom(clamped);
    fc.requestRenderAll();
  };

  /** ——— export (print-ready + upload) ——— */
  const makePrintReadyAndUpload = async () => {
    const fc = canvasRefs.current[view]; if (!fc) return;
    const area = fc.getObjects().find((o) => o.id === "printArea");
    const objs = allObjects();
    if (!area || !objs.length) return toast({ title: "Nothing to print", status: "warning" });

    const areaW = PRINT_AREAS[view]?.widthInches || 12;
    const areaH = PRINT_AREAS[view]?.heightInches || 16;
    const outW = Math.round(areaW * DPI);
    const outH = Math.round(areaH * DPI);

    const tmp = new window.fabric.Canvas(null, { width: outW, height: outH });
    const aBB = area.getBoundingRect(true, true);
    const scaleFactor = outW / aBB.width;

    objs.forEach((o) => {
      const clone = window.fabric.util.object.clone(o);
      const bb = o.getBoundingRect(true, true);
      const relX = bb.left - aBB.left + bb.width / 2;
      const relY = bb.top - aBB.top + bb.height / 2;

      clone.originX = "center"; clone.originY = "center";
      clone.left = relX * scaleFactor;
      clone.top  = relY * scaleFactor;
      clone.scaleX = o.scaleX * scaleFactor;
      clone.scaleY = o.scaleY * scaleFactor;
      if (clone.type === "i-text") clone.fontSize = (o.fontSize || 36) * scaleFactor;

      tmp.add(clone);
    });
    tmp.requestRenderAll();

    const png = tmp.toDataURL({ format: "png", quality: 1, multiplier: 1 });
    tmp.dispose();

    const previewPNG = fc.toDataURL({ format: "png", quality: 0.92 });

    toast({ title: "Uploading design…", status: "info", duration: 3000 });
    const upload = await client.post("/upload-print-file", {
      imageData: png,
      designName: `${product?.name || "Custom"} ${view}`,
    });
    const fileUrl = upload.data?.publicUrl;
    if (!fileUrl) return toast({ title: "Upload failed", status: "error" });

    const checkoutItem = {
      productId: product?.id || product?._id || "",
      slug: product?.slug || "",
      color, size, view,
      preview: previewPNG,
      printFileUrl: fileUrl,
      name: product?.name,
      unitPrice: product?.priceMin || product?.basePrice || 0
    };
    localStorage.setItem("itemToCheckout", JSON.stringify(checkoutItem));
    navigate("/checkout");
  };

  /** ——— derived UI ——— */
  const colors = useMemo(() => collectColors(product), [product]);
  const sizes  = useMemo(() => collectSizes(product, color), [product, color]);
  const canProceed = product && (!colors.length || color) && (!sizes.length || size);

  /** ——— UI ——— */
  return (
    <Flex minH="100vh" bg="brand.primary">
      {/* Left sidebar — tools */}
      <Box w={{ base: "100%", lg: "320px" }} borderRightWidth={{ lg: "1px" }} borderColor="whiteAlpha.200" bg="brand.paper" p={3}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md" color="brand.textLight">{product?.name || "Customize"}</Heading>
          <Text color="brand.textLight" fontSize="sm">Choose a view and build your design from images & text. Use Layers to manage order/visibility/locks.</Text>

          {/* View switcher */}
          <HStack>
            <Button size="sm" variant={view==="front" ? "solid" : "outline"} onClick={()=>setView("front")}>Front</Button>
            <Button size="sm" variant={view==="back"  ? "solid" : "outline"} onClick={()=>setView("back")}>Back</Button>
            <Button size="sm" variant={view==="sleeve"? "solid" : "outline"} onClick={()=>setView("sleeve")}>Sleeve</Button>
          </HStack>

          {/* Color/Size quick picks */}
          <HStack>
            <Select size="sm" placeholder="Color" value={color} onChange={(e)=>setColor(e.target.value)}>
              {colors.map((c)=>(<option key={c} value={c}>{c}</option>))}
            </Select>
            <Select size="sm" placeholder="Size" value={size} onChange={(e)=>setSize(e.target.value)}>
              {sizes.map((s)=>(<option key={s} value={s}>{s}</option>))}
            </Select>
          </HStack>

          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab><Icon as={FaLayerGroup} mr={2}/>Designs</Tab>
              <Tab><Icon as={FaUpload} mr={2}/>Uploads</Tab>
              <Tab><Icon as={FaTextHeight} mr={2}/>Text</Tab>
              <Tab><Icon as={FaLayerGroup} mr={2}/>Layers</Tab>
              <Tab>Settings</Tab>
            </TabList>
            <TabPanels>
              {/* My Designs */}
              <TabPanel px={1} pt={4}>
                {loadingDesigns ? (
                  <VStack p={2}><Skeleton h="24px" w="80%"/><Skeleton h="24px" w="60%"/></VStack>
                ) : designs.length ? (
                  <SimpleGrid columns={{ base: 3 }} spacing={2}>
                    {designs.map((d)=>(
                      <Tooltip key={d._id} label={d.prompt || "design"}>
                        <Box
                          borderWidth="2px"
                          borderColor="transparent"
                          rounded="md"
                          overflow="hidden"
                          cursor="pointer"
                          _hover={{ borderColor: "purple.400" }}
                          onClick={()=>addDesign(d)}
                        >
                          <AspectRatio ratio={1}><Image src={d.imageDataUrl} alt={d.prompt} objectFit="cover"/></AspectRatio>
                        </Box>
                      </Tooltip>
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text color="brand.textLight" fontSize="sm">No saved designs yet.</Text>
                )}
              </TabPanel>

              {/* Uploads */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <Button as="label" leftIcon={<FaCloudUploadAlt/>} colorScheme="purple" cursor="pointer">
                    Upload image
                    <input type="file" accept="image/*" hidden onChange={uploadLocal}/>
                  </Button>
                  <Text color="brand.textLight" fontSize="sm">Add your own PNG/JPEG and place it inside the dotted print area.</Text>
                </VStack>
              </TabPanel>

              {/* Text */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <HStack>
                    <Input value={textValue} onChange={(e)=>setTextValue(e.target.value)} placeholder="Your text"/>
                    <Button onClick={addText}>Add</Button>
                  </HStack>
                  <HStack>
                    <Input type="color" value={textColor} onChange={(e)=>setTextColor(e.target.value)} w="52px" p={0}/>
                    <NumberInput value={textSize} min={8} max={200} onChange={(v)=>setTextSize(parseInt(v||"36",10))}>
                      <NumberInputField/>
                      <NumberInputStepper><NumberIncrementStepper/><NumberDecrementStepper/></NumberInputStepper>
                    </NumberInput>
                  </HStack>
                </VStack>
              </TabPanel>

              {/* Layers */}
              <TabPanel>
                <VStack align="stretch" spacing={2}>
                  {allObjects().length === 0 && (
                    <Text color="brand.textLight" fontSize="sm">No layers yet—add text or an image.</Text>
                  )}
                  {allObjects().map((o, idx) => (
                    <HStack key={idx} p={2} rounded="md" borderWidth="1px" borderColor="whiteAlpha.300">
                      <Text flex="1" isTruncated title={o.type}>{o.type}</Text>
                      <IconButton aria-label="Up" size="xs" icon={<FaAngleUp/>} onClick={()=>{canvasRefs.current[view].bringForward(o); canvasRefs.current[view].requestRenderAll();}}/>
                      <IconButton aria-label="Down" size="xs" icon={<FaAngleDown/>} onClick={()=>{canvasRefs.current[view].sendBackwards(o); canvasRefs.current[view].requestRenderAll();}}/>
                      <IconButton aria-label="Lock" size="xs" icon={o.locked? <FaLock/>:<FaLockOpen/>} onClick={()=>{o.locked=!o.locked;o.selectable=!o.locked;o.evented=!o.locked;canvasRefs.current[view].requestRenderAll();}}/>
                      <IconButton aria-label="Hide" size="xs" icon={o.visible===false? <FaEyeSlash/>:<FaEye/>} onClick={()=>{o.visible = o.visible===false ? true : false; canvasRefs.current[view].requestRenderAll();}}/>
                      <IconButton aria-label="Select" size="xs" icon={<FaChevronRight/>} onClick={()=>selectByIndex(idx)}/>
                    </HStack>
                  ))}
                </VStack>
              </TabPanel>

              {/* Settings */}
              <TabPanel>
                <VStack align="stretch" spacing={3}>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0" color="brand.textLight">Snap inside print area</FormLabel>
                    <Switch isChecked={snapToGuides} onChange={(e)=>setSnapToGuides(e.target.checked)}/>
                  </FormControl>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb="0" color="brand.textLight">Show print area box</FormLabel>
                    <Switch isChecked={showPrintArea} onChange={(e)=>{setShowPrintArea(e.target.checked); refreshBackground();}}/>
                  </FormControl>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider borderColor="whiteAlpha.300"/>

          {/* Actions */}
          <VStack align="stretch" spacing={2}>
            <HStack>
              <Tooltip label="Undo"><Button size="sm" onClick={undo} leftIcon={<Icon as={FaUndo}/>}>Undo</Button></Tooltip>
              <Tooltip label="Redo"><Button size="sm" onClick={redo} leftIcon={<Icon as={FaRedo}/>}>Redo</Button></Tooltip>
              <Tooltip label="Duplicate"><Button size="sm" onClick={duplicate} leftIcon={<Icon as={FaCopy}/>}>Duplicate</Button></Tooltip>
            </HStack>
            <HStack>
              <Tooltip label="Delete selected"><Button size="sm" onClick={del} leftIcon={<Icon as={FaTrash}/>} colorScheme="red" variant="outline">Delete</Button></Tooltip>
              <Tooltip label="Center horizontally"><Button size="sm" onClick={centerH} leftIcon={<Icon as={FaArrowsAltH}/>} variant="outline">Center</Button></Tooltip>
            </HStack>
            <HStack>
              <Tooltip label="Align left"><IconButton aria-label="Align left" icon={<FaAlignLeft/>} onClick={alignLeft}/></Tooltip>
              <Tooltip label="Align center"><IconButton aria-label="Align center" icon={<FaAlignCenter/>} onClick={alignCenter}/></Tooltip>
              <Tooltip label="Align right"><IconButton aria-label="Align right" icon={<FaAlignRight/>} onClick={alignRight}/></Tooltip>
            </HStack>
          </VStack>

          <Divider borderColor="whiteAlpha.300"/>

          <VStack align="stretch" spacing={3}>
            <HStack>
              <Tooltip label="Zoom out"><IconButton aria-label="Zoom out" icon={<FaSearchMinus/>} onClick={()=>setZoomSafe(zoom-0.1)}/></Tooltip>
              <Slider aria-label="zoom" value={zoom} min={0.5} max={2} step={0.1} onChange={setZoomSafe}>
                <SliderTrack><SliderFilledTrack/></SliderTrack><SliderThumb/></Slider>
              </Slider>
              <Tooltip label="Zoom in"><IconButton aria-label="Zoom in" icon={<FaSearchPlus/>} onClick={()=>setZoomSafe(zoom+0.1)}/></Tooltip>
            </HStack>
          </VStack>

          <Divider borderColor="whiteAlpha.300"/>

          <VStack spacing={3} align="stretch">
            <Text color="brand.textLight" fontSize="sm" opacity={0.8}>
              We’ll generate a high-resolution 300-DPI PNG for Printful and a preview for your cart.
            </Text>
            <Button
              colorScheme={canProceed && allObjects().length ? "purple" : "gray"}
              isDisabled={!canProceed || !allObjects().length}
              onClick={makePrintReadyAndUpload}
            >
              Add to cart / Checkout
            </Button>
          </VStack>
        </VStack>
      </Box>

      {/* Main canvas area */}
      <Flex flex="1" direction="column" p={4}>
        <HStack mb={2} color="brand.textLight">
          <Text>View:</Text>
          <Badge>{view}</Badge>
          <Spacer/>
          <Text>{product?.name}</Text>
        </HStack>

        <Box ref={wrapRef} w="100%" paddingTop={`${100 / ASPECT}%`} bg="brand.secondary" rounded="md" borderWidth="1px" borderColor="whiteAlpha.300" position="relative" overflow="hidden">
          {/* Only render the current view's canvas node; others are offscreen but retained */}
          <canvas ref={canvasElRefs.front}  style={{ position: view==="front"  ? "absolute":"absolute", inset: 0, display: view==="front" ? "block" : "none" }}/>
          <canvas ref={canvasElRefs.back}   style={{ position: view==="back"   ? "absolute":"absolute", inset: 0, display: view==="back"  ? "block" : "none" }}/>
          <canvas ref={canvasElRefs.sleeve} style={{ position: view==="sleeve" ? "absolute":"absolute", inset: 0, display: view==="sleeve"? "block" : "none" }}/>
        </Box>
      </Flex>
    </Flex>
  );
}
