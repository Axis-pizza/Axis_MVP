/**
 * ImageUpload - Drag and drop image upload component
 * Client-side compression and R2 upload
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface ImageUploadProps {
  walletAddress: string;
  type: 'strategy' | 'profile';
  onUploadComplete: (url: string) => void;
  currentImage?: string;
  className?: string;
}

export const ImageUpload = ({
  walletAddress,
  type,
  onUploadComplete,
  currentImage,
  className = '',
}: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Max dimensions
        const MAX_SIZE = 1024;
        let { width, height } = img;
        
        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/webp',
          0.85 // Quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFile = useCallback(async (file: File) => {
    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate initial size (10MB limit for processing)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large. Maximum 10MB.');
      return;
    }

    setError(null);
    
    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      setUploading(true);
      
      // Compress image
      const compressed = await compressImage(file);
      
      // Check compressed size
      if (compressed.size > 2 * 1024 * 1024) {
        setError('Compressed image still too large. Try a smaller image.');
        setUploading(false);
        return;
      }

      // Upload
      const result = await api.uploadImage(compressed, walletAddress, type);
      
      if (result.success && result.url) {
        onUploadComplete(result.url);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      setError(message);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [walletAddress, type, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearImage = () => {
    setPreview(null);
    onUploadComplete('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        id={`image-upload-${type}`}
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden border border-white/10"
          >
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            )}
            {!uploading && (
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/80 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.label
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            htmlFor={`image-upload-${type}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
              dragOver
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-white/10 hover:border-white/30 bg-white/5'
            }`}
          >
            {dragOver ? (
              <ImageIcon className="w-10 h-10 text-orange-500 mb-3" />
            ) : (
              <Upload className="w-10 h-10 text-white/30 mb-3" />
            )}
            <p className="text-sm text-white/50">
              {dragOver ? 'Drop image here' : 'Click or drag to upload'}
            </p>
            <p className="text-xs text-white/30 mt-1">
              PNG, JPG, WebP • Max 2MB
            </p>
          </motion.label>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 mt-2"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};
