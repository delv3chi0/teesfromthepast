// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Select,
  SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton as ChakraCloseButton,
  Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
// === NEW: Import useLocation and useSearchParams to read from URL ===
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaImage } from 'react-icons/fa';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const INFO_ALERT_DISMISSED_KEY = 'productStudioInfoAlertDismissed_v1';

export default function ProductStudio() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  // === NEW: Hook to read URL query parameters ===
  const location = useLocation();

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [designsError, setDesignsError] = useState('');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [availableProductTypes, setAvailableProductTypes] = useState([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);
  const [productsOfType, setProductsOfType] = useState([]);
  const [loadingProductsOfType, setLoadingProductsOfType] = useState(false);
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [availableColors, setAvailableColors] = useState([]);
  const [selectedProductColor, setSelectedProductColor] = useState('');
  const [availableSizes, setAvailableSizes] = useState([]);
  const [selectedProductSize, setSelectedProductSize] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showInfoAlert, setShowInfoAlert] = useState(false);
  const canvasEl = useRef(null);
  const fabricCanvas = useRef(null);

  // === NEW: useEffect to handle pre-selections from URL ===
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productId = params.get('productId');
    const sku = params.get('sku');

    if (productId && sku) {
      // Find the product and its details based on the SKU
      // This is a simplified approach; a more robust one might fetch the product directly
      // But for now, we assume the necessary data will be loaded via the dropdowns.
      // We will set the IDs, and the other useEffects will trigger to populate the dropdowns.
      const preselectProduct = async () => {
        try {
          // We need to find which type this product belongs to
          const res = await client.get(`/storefront/products/slim/${productId}`);
          const slimProduct = res.data;
          
          if (slimProduct && slimProduct.productType) {
            setSelectedProductTypeId(slimProduct.productType);
            // Once product type is set, another useEffect will fire to load products of that type
            // Then, we can set the product ID
            setSelectedProductId(productId);

            // We need to get the full product details to find the color/size from the sku
            const fullProductRes = await client.get(`/storefront/products/slug/${slimProduct.slug}`);
            const fullProduct = fullProductRes.data;

            for (const color of fullProduct.variants) {
              const size = color.sizes.find(s => s.sku === sku);
              if (size) {
                setSelectedProductColor(color.colorName);
                setSelectedProductSize(size.size);
                break;
              }
            }
          }
        } catch (e) {
          console.error("Failed to pre-select product", e);
          toast({ title: "Could not pre-load selected item.", status: 'warning' });
        }
      };
      preselectProduct();
    }
  }, [location.search, toast]);


  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') { setShowInfoAlert(true); }
  }, []);

  const fetchUserDesigns = useCallback(() => { /* Unchanged */ }, [user, toast, logout, navigate]);
  useEffect(() => { fetchUserDesigns(); }, [fetchUserDesigns]);
  useEffect(() => { setLoadingProductTypes(true); client.get('/storefront/product-types').then(res => setAvailableProductTypes(res.data || [])).catch(err => toast({ title: "Load Error", status: "error" })).finally(() => setLoadingProductTypes(false)); }, [toast]);
  useEffect(() => {
    if (!selectedProductTypeId) { setProductsOfType([]); setSelectedProductId(''); return; }
    setLoadingProductsOfType(true); setProductsOfType([]); setSelectedProductId('');
    client.get(`/storefront/products/type/${selectedProductTypeId}`).then(res => setProductsOfType(res.data || [])).catch(err => toast({ title: "Load Error", status: "error" })).finally(() => setLoadingProductsOfType(false));
  }, [selectedProductTypeId, toast]);
  useEffect(() => {
    if (!selectedProductId || productsOfType.length === 0) { setAvailableColors([]); setSelectedProductColor(''); return; }
    const currentProduct = productsOfType.find(p => p._id === selectedProductId);
    if (currentProduct?.variants) {
      const uniqueColors = currentProduct.variants.reduce((acc, v) => { if (!acc.find(c => c.value === v.colorName)) { acc.push({ value: v.colorName, label: v.colorName, hex: v.colorHex }); } return acc; }, []);
      setAvailableColors(uniqueColors);
      if (uniqueColors.length > 0 && !selectedProductColor) {
        setSelectedProductColor(uniqueColors[0].value);
      }
    } else {
      setAvailableColors([]); setSelectedProductColor('');
    }
  }, [selectedProductId, productsOfType, selectedProductColor]);
  useEffect(() => {
    if (!selectedProductColor) { setAvailableSizes([]); setSelectedProductSize(''); return; }
    const currentProduct = productsOfType.find(p => p._id === selectedProductId);
    let sizes = [];
    if (currentProduct?.variants?.length > 0) {
      const colorVariant = currentProduct.variants.find(v => v.colorName === selectedProductColor);
      if (colorVariant?.sizes) { sizes = colorVariant.sizes.map(s => s.size); }
    }
    setAvailableSizes(sizes.map(s => ({ value: s, label: s })));
    if (!selectedProductSize || !sizes.includes(selectedProductSize)) {
      setSelectedProductSize(sizes.length > 0 ? sizes[0] : '');
    }
  }, [selectedProductColor, selectedProductId, productsOfType, selectedProductSize]);
  useEffect(() => {
    if (selectedProductId && selectedProductColor && selectedProductSize) {
      const product = productsOfType.find(p => p._id === selectedProductId);
      const colorVariant = product?.variants.find(v => v.colorName === selectedProductColor);
      if (colorVariant) {
        const sizeVariant = colorVariant.sizes.find(s => s.size === selectedProductSize);
        if (sizeVariant) {
          const primaryImage = colorVariant.imageSet?.find(img => img.isPrimary) || (colorVariant.imageSet?.[0]) || { url: colorVariant.imageMockupFront };
          setSelectedVariant({ ...sizeVariant, colorName: colorVariant.colorName, colorHex: colorVariant.colorHex, imageMockupFront: primaryImage?.url });
        } else { setSelectedVariant(null); }
      } else { setSelectedVariant(null); }
    } else {
      setSelectedVariant(null);
    }
  }, [selectedProductId, selectedProductColor, selectedProductSize, productsOfType]);
  useEffect(() => {
    const setupCanvas = (fabricInstance) => {
      if (!fabricCanvas.current && canvasEl.current) { fabricCanvas.current = new fabricInstance.Canvas(canvasEl.current, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }); }
      const FCanvas = fabricCanvas.current;
      if (!FCanvas) return;
      FCanvas.clear();
      const mockupSrc = selectedVariant?.imageMockupFront;
      if (mockupSrc) {
        fabricInstance.Image.fromURL(mockupSrc, (mockupImg) => { if (!mockupImg) return; FCanvas.setBackgroundImage(mockupImg, FCanvas.renderAll.bind(FCanvas), { scaleX: CANVAS_WIDTH / mockupImg.width, scaleY: CANVAS_HEIGHT / mockupImg.height }); }, { crossOrigin: 'anonymous' });
      } else {
        FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
        FCanvas.setBackgroundColor('white', FCanvas.renderAll.bind(FCanvas));
      }
      if (selectedDesign?.imageDataUrl) {
        fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (designImg) => {
          if (!designImg) return;
          designImg.scaleToWidth(CANVAS_WIDTH * 0.33);
          const designLeft = (CANVAS_WIDTH - designImg.getScaledWidth()) / 2;
          const designTop = CANVAS_HEIGHT * 0.24;
          designImg.set({ top: designTop, left: designLeft });
          FCanvas.add(designImg);
          FCanvas.renderAll();
        }, { crossOrigin: 'anonymous' });
      }
    };
    const pollForFabric = () => { if (window.fabric) { setupCanvas(window.fabric); } else { setTimeout(pollForFabric, 100); } };
    if (canvasEl.current) pollForFabric();
  }, [selectedDesign, selectedVariant]);

  const handleProceedToCheckout = () => { /* Unchanged */ };
  const handleDismissInfoAlert = () => { setShowInfoAlert(false); localStorage.setItem(INFO_ALERT_DISMISSED_KEY, 'true'); };
  const handleProductTypeChange = (e) => { setSelectedProductTypeId(e.target.value); setSelectedProductId(''); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleProductChange = (e) => { setSelectedProductId(e.target.value); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleColorChange = (e) => { setSelectedProductColor(e.target.value); setSelectedProductSize(''); };
  const handleSizeChange = (e) => { setSelectedProductSize(e.target.value); };

  return ( <Box maxW="container.xl" mx="auto" p={4}>{/* ... JSX is unchanged ... */}</Box> );
}
