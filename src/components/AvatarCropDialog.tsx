import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface AvatarCropDialogProps {
  open: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function AvatarCropDialog({ open, onClose, imageFile, onCropComplete }: AvatarCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);
  const size = 280;

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    setScale(1);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => { imgRef.current = img; drawCanvas(img, 1, { x: 0, y: 0 }); };
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const drawCanvas = useCallback((img: HTMLImageElement, s: number, off: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Fill background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);

    // Calculate aspect fit then apply scale
    const aspect = img.width / img.height;
    let drawW, drawH;
    if (aspect > 1) {
      drawH = size * s;
      drawW = drawH * aspect;
    } else {
      drawW = size * s;
      drawH = drawW / aspect;
    }

    const x = (size - drawW) / 2 + off.x;
    const y = (size - drawH) / 2 + off.y;

    ctx.drawImage(img, x, y, drawW, drawH);

    // Draw circular mask overlay
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  useEffect(() => {
    if (imgRef.current) drawCanvas(imgRef.current, scale, offset);
  }, [scale, offset, drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setDragging(true);
    const pos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    setDragStart({ x: pos.x - offset.x, y: pos.y - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging) return;
    const pos = 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    setOffset({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create output canvas at higher res
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 400;
    outCanvas.height = 400;
    const ctx = outCanvas.getContext('2d');
    if (!ctx || !imgRef.current) return;

    const img = imgRef.current;
    const aspect = img.width / img.height;
    const outSize = 400;
    let drawW, drawH;
    if (aspect > 1) {
      drawH = outSize * scale;
      drawW = drawH * aspect;
    } else {
      drawW = outSize * scale;
      drawH = drawW / aspect;
    }

    const ratio = outSize / size;
    const x = (outSize - drawW) / 2 + offset.x * ratio;
    const y = (outSize - drawH) / 2 + offset.y * ratio;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
    ctx.fill();

    outCanvas.toBlob((blob) => {
      if (blob) onCropComplete(blob);
    }, 'image/png');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Preview */}
          <div
            className="relative rounded-full overflow-hidden border-2 border-border cursor-grab active:cursor-grabbing"
            style={{ width: size, height: size }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas ref={canvasRef} width={size} height={size} className="w-full h-full" />
          </div>

          {/* Zoom control */}
          <div className="flex items-center gap-3 w-full px-4">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              min={0.5}
              max={3}
              step={0.05}
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleCrop} className="flex-1">Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
