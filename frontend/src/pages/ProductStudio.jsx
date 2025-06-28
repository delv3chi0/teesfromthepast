import React, { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, Button, Center, Flex, Heading, Input, Select, Text } from "@chakra-ui/react";

const CANVAS_WIDTH = 768;
const CANVAS_HEIGHT = 1024;
const PRINT_WIDTH = 2400;
const PRINT_HEIGHT = 3200;
const THUMB_WIDTH = 300;
const THUMB_HEIGHT = 400;
const MULTIPLIER = PRINT_WIDTH / CANVAS_WIDTH;

const ProductStudio = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [text, setText] = useState("");
  const [selectedColor, setSelectedColor] = useState("black");

  const productId = searchParams.get("productId") || "";
  const color = searchParams.get("color") || "black";
  const size = searchParams.get("size") || "M";

  useEffect(() => {
    const initCanvas = new fabric.Canvas("canvas", {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#f0f0f0",
    });

    setCanvas(initCanvas);
    return () => initCanvas.dispose();
  }, []);

  useEffect(() => {
    if (!canvas) return;

    fabric.Image.fromURL(`/mockups/tee_${color}.png`, (img) => {
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        scaleX: CANVAS_WIDTH / img.width,
        scaleY: CANVAS_HEIGHT / img.height,
      });
    });
  }, [canvas, color]);

  const handleAddText = () => {
    if (!canvas || !text.trim()) return;

    const textObj = new fabric.Textbox(text.trim(), {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      fill: selectedColor,
      fontSize: 30,
      textAlign: "center",
      originX: "center",
      originY: "center",
    });

    canvas.add(textObj).setActiveObject(textObj);
    canvas.renderAll();
  };

  const exportVersion = async (width, height, multiplier) => {
    const exportCanvas = new fabric.Canvas(null, { width, height });
    const objects = canvas.getObjects();

    for (const obj of objects) {
      const clone = await new Promise((resolve) => obj.clone(resolve));
      clone.set({
        left: obj.left * multiplier,
        top: obj.top * multiplier,
        scaleX: obj.scaleX * multiplier,
        scaleY: obj.scaleY * multiplier,
      });
      exportCanvas.add(clone);
    }

    exportCanvas.renderAll();
    return exportCanvas.toDataURL({ format: "png" });
  };

  const handleUpload = async () => {
    if (!canvas || !user) return;

    try {
      const fullSizeData = await exportVersion(PRINT_WIDTH, PRINT_HEIGHT, MULTIPLIER);
      const thumbData = await exportVersion(THUMB_WIDTH, THUMB_HEIGHT, THUMB_WIDTH / CANVAS_WIDTH);

      await axios.post("/api/upload", {
        fullImage: fullSizeData,
        thumbnail: thumbData,
        productId,
        size,
        color,
        userId: user._id,
      });

      alert("Upload successful!");
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  return (
    <Flex direction="column" align="center" py={4}>
      <Heading mb={4}>Product Studio</Heading>
      <Box border="1px solid #ccc" width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
        <canvas id="canvas" ref={canvasRef} />
      </Box>
      <Flex mt={4} gap={2} wrap="wrap">
        <Input placeholder="Enter text" value={text} onChange={(e) => setText(e.target.value)} />
        <Input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} />
        <Button onClick={handleAddText}>Add Text</Button>
        <Button onClick={handleUpload} colorScheme="teal">
          Upload to Cloudinary
        </Button>
      </Flex>
    </Flex>
  );
};

export default ProductStudio;

