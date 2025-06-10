// frontend/src/pages/ProductStudio.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Heading, Text, VStack, Select,
  SimpleGrid, Image, Spinner, Alert, AlertIcon, CloseButton as ChakraCloseButton,
  Link as ChakraLink, Divider, useToast, Icon, Button
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { client } from '../api/client';
import { useAuth } from '../context/AuthProvider';
import { FaShoppingCart, FaImage } from 'react-icons/fa';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const INFO_ALERT_DISMISSED_KEY = 'productStudioInfoAlertDismissed_v1';

export default function ProductStudio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();

  const [designs, setDesigns] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState(null);

  const [availableProductTypes, setAvailableProductTypes] = useState([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(true);
  
  const [productsOfType, setProductsOfType] = useState([]);
  const [loadingProductsOfType, setLoadingProductsOfType] = useState(false);
  
  const [selectedProductTypeId, setSelectedProductTypeId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductColor, setSelectedProductColor] = useState('');
  const [selectedProductSize, setSelectedProductSize] = useState('');
  
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showInfoAlert, setShowInfoAlert] = useState(false);
  const canvasEl = useRef(null);
  const fabricCanvas = useRef(null);

  // === THE FIX: Replaced old pre-loading logic with a simpler version ===
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productTypeId = params.get('productTypeId');
    const productId = params.get('productId');
    const color = params.get('color');
    const size = params.get('size');
    
    // If these params exist, set the state directly. The other useEffects will handle the rest.
    if (productTypeId && productId && color && size) {
        setSelectedProductTypeId(productTypeId);
        setSelectedProductId(productId);
        setSelectedProductColor(color);
        setSelectedProductSize(size);
    }
  }, [location.search]);


  useEffect(() => {
    const dismissed = localStorage.getItem(INFO_ALERT_DISMISSED_KEY);
    if (dismissed !== 'true') { setShowInfoAlert(true); }
  }, []);

  useEffect(() => {
    if(user) {
        client.get('/mydesigns').then(res => setDesigns(res.data)).finally(() => setLoadingDesigns(false));
    }
  },[user]);

  useEffect(() => {
    client.get('/storefront/product-types').then(res => setAvailableProductTypes(res.data || [])).finally(() => setLoadingProductTypes(false));
  }, []);

  useEffect(() => {
    if (!selectedProductTypeId) { setProductsOfType([]); return; }
    setLoadingProductsOfType(true);
    client.get(`/storefront/products/type/${selectedProductTypeId}`)
      .then(res => setProductsOfType(res.data || []))
      .finally(() => setLoadingProductsOfType(false));
  }, [selectedProductTypeId]);

  useEffect(() => {
    if (!selectedProductId) { setAvailableColors([]); return; }
    const product = productsOfType.find(p => p._id === selectedProductId);
    const colors = product?.variants.map(v => ({ value: v.colorName, label: v.colorName })) || [];
    setAvailableColors(colors);
  }, [selectedProductId, productsOfType]);

  useEffect(() => {
    if (!selectedProductColor) { setAvailableSizes([]); return; }
    const product = productsOfType.find(p => p._id === selectedProductId);
    const colorVariant = product?.variants.find(v => v.colorName === selectedProductColor);
    const sizes = colorVariant?.sizes.map(s => s.size) || [];
    setAvailableSizes(sizes.map(s => ({ value: s, label: s })));
  }, [selectedProductColor, selectedProductId, productsOfType]);

  useEffect(() => {
    if (selectedProductId && selectedProductColor && selectedProductSize) {
      const product = productsOfType.find(p => p._id === selectedProductId);
      const colorVariant = product?.variants.find(v => v.colorName === selectedProductColor);
      const sizeVariant = colorVariant?.sizes.find(s => s.size === selectedProductSize);
      if (sizeVariant) {
        const primaryImage = colorVariant.imageSet?.find(img => img.isPrimary) || colorVariant.imageSet?.[0];
        setSelectedVariant({ ...sizeVariant, colorName: colorVariant.colorName, imageMockupFront: primaryImage?.url });
      }
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
            fabricInstance.Image.fromURL(mockupSrc, (img) => { FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), { scaleX: FCanvas.width / img.width, scaleY: FCanvas.height / img.height }); }, { crossOrigin: 'anonymous' });
        } else {
            FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
        }
        if (selectedDesign?.imageDataUrl) {
            fabricInstance.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                img.scaleToWidth(CANVAS_WIDTH * 0.33);
                img.set({ top: CANVAS_HEIGHT * 0.24, left: (CANVAS_WIDTH - img.getScaledWidth()) / 2 });
                FCanvas.add(img);
            }, { crossOrigin: 'anonymous' });
        }
    };
    const pollForFabric = () => { if(window.fabric) setupCanvas(window.fabric); else setTimeout(pollForFabric, 100); };
    pollForFabric();
  }, [selectedDesign, selectedVariant]);
  
  const handleProceedToCheckout = () => { /* Unchanged */ };
  const handleDismissInfoAlert = () => { /* Unchanged */ };
  const handleProductTypeChange = (e) => { setSelectedProductTypeId(e.target.value); setSelectedProductId(''); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleProductChange = (e) => { setSelectedProductId(e.target.value); setSelectedProductColor(''); setSelectedProductSize(''); };
  const handleColorChange = (e) => { setSelectedProductColor(e.target.value); setSelectedProductSize(''); };
  const handleSizeChange = (e) => { setSelectedProductSize(e.target.value); };

  return ( <Box maxW="container.xl" mx="auto" p={4}>{/* ... JSX is unchanged ... */}</Box> );
}
