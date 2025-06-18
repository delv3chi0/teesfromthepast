// frontend/src/components/ProductStudioCanvas.jsx

import React, { useRef, useEffect, useCallback } from 'react';

const ProductStudioCanvas = ({ selectedDesign, finalVariant, onCanvasReady, currentMockupType }) => {
    const canvasEl = useRef(null);
    const fabricCanvas = useRef(null); // This will hold the Fabric.js canvas instance

    // Canvas Initialization (runs once on mount)
    useEffect(() => {
        // Ensure Fabric.js is loaded and canvas is not yet initialized
        const initializeCanvas = () => {
            if (canvasEl.current && !fabricCanvas.current && window.fabric) {
                const canvasWidth = 600; // Consistent internal canvas resolution
                const canvasHeight = 600;

                fabricCanvas.current = new window.fabric.Canvas(canvasEl.current, {
                    width: canvasWidth,
                    height: canvasHeight,
                    backgroundColor: 'rgba(0,0,0,0)', // Transparent canvas background
                    selection: true, // Enable canvas selection
                });
                
                // Emit the canvas instance to the parent component
                if (onCanvasReady) {
                    onCanvasReady(fabricCanvas.current);
                }

                // Fabric.js event listeners for selection tracking (optional, can be moved to parent if needed)
                // For simplicity, we'll let the parent manage activeObjectRef.
            } else if (!window.fabric) {
                setTimeout(initializeCanvas, 50); // Poll for Fabric.js if not ready
            }
        };

        initializeCanvas(); // Start initialization

        // Cleanup function for Fabric.js
        return () => {
            if (fabricCanvas.current) {
                fabricCanvas.current.dispose(); // Dispose to prevent memory leaks
                fabricCanvas.current = null;
            }
        };
    }, [onCanvasReady]); // Dependency on onCanvasReady to re-init if it changes (though usually stable)


    // Canvas Content Update (Mockup and Design)
    useEffect(() => {
        const FCanvas = fabricCanvas.current;
        if (!FCanvas || !window.fabric) return; // Ensure canvas is initialized and Fabric.js is ready

        // Determine the mockup source
        let mockupSrc = '';
        const imageSet = finalVariant?.imageSet;

        const teeMockupImage = imageSet ? imageSet.find(img => img.url.includes('tee_') && !img.url.includes('man_')) : null;
        const primaryImageFound = imageSet ? imageSet.find(img => img.isPrimary === true) : null;
        const manMockupImage = imageSet ? imageSet.find(img => img.url.includes('man_')) : null;
        const firstAvailableImage = imageSet ? imageSet[0] : null;

        if (currentMockupType === 'tee' && teeMockupImage) {
            mockupSrc = teeMockupImage.url;
        } else if (primaryImageFound) {
            mockupSrc = primaryImageFound.url;
        } else if (manMockupImage) {
            mockupSrc = manMockupImage.url;
        } else if (firstAvailableImage) {
            mockupSrc = firstAvailableImage.url;
        }
        
        // Set Background Image
        if (mockupSrc) {
            window.fabric.Image.fromURL(mockupSrc, (img) => {
                FCanvas.setBackgroundImage(img, FCanvas.renderAll.bind(FCanvas), {
                    scaleX: FCanvas.width / img.width,
                    scaleY: FCanvas.height / img.height,
                    crossOrigin: 'anonymous',
                    selectable: false,
                    evented: false,
                    alignX: 'center',
                    alignY: 'center',
                    meetOrSlice: 'meet'
                });
            }, { crossOrigin: 'anonymous' });
        } else {
            FCanvas.setBackgroundImage(null, FCanvas.renderAll.bind(FCanvas));
        }

        // Handle selected design (add or update)
        // Remove previous design images to ensure only current selected design is present
        FCanvas.getObjects('image').filter(obj => obj.id?.startsWith('design-') || (obj.src && obj.src.startsWith('data:image'))).forEach(obj => FCanvas.remove(obj));
        
        if (selectedDesign?.imageDataUrl) {
            const existingDesignObject = FCanvas.getObjects().find(obj => obj.id === `design-${selectedDesign._id}`);
            if (!existingDesignObject) {
                window.fabric.Image.fromURL(selectedDesign.imageDataUrl, (img) => {
                    if (!img) return;
                    img.id = `design-${selectedDesign._id}`;
                    img.scaleToWidth(FCanvas.width * 0.33);
                    img.set({
                        top: FCanvas.height * 0.24,
                        left: (FCanvas.width - img.getScaledWidth()) / 2,
                        hasControls: true, hasBorders: true, borderColor: 'brand.accentYellow',
                        cornerColor: 'brand.accentYellow', cornerSize: 8, transparentCorners: false,
                        lockMovementX: false, lockMovementY: false, lockRotation: false,
                        lockScalingX: false, lockScalingY: false, lockSkewingX: false, lockSkewingY: false,
                        selectable: true,
                    });
                    FCanvas.add(img);
                    img.sendToBack(); // Ensure design image is behind text objects
                    FCanvas.renderAll();
                    FCanvas.setActiveObject(img);
                }, { crossOrigin: 'anonymous' });
            } else {
                FCanvas.setActiveObject(existingDesignObject);
                existingDesignObject.sendToBack(); // Ensure it's sent to back if already there
                FCanvas.renderAll();
            }
        } else {
            FCanvas.renderAll();
        }

    }, [finalVariant, selectedDesign, currentMockupType]); // Dependencies for this effect

    return (
        <canvas ref={canvasEl} style={{ width: '100%', height: '100%' }} />
    );
};

export default ProductStudioCanvas;
