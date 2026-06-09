import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface ImageUploadProps {
  onUploadSuccess: (urls: string[]) => void;
  maxFiles?: number;
}

export default function ImageUpload({ onUploadSuccess, maxFiles = 5 }: ImageUploadProps) {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newFiles = [...files, ...selectedFiles].slice(0, maxFiles);
    setFiles(newFiles);

    // Generate previews
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();

      if (files.length === 1) {
        formData.append('image', files[0]);
        const response = await fetch('http://localhost:3000/api/upload/image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await response.json();
        onUploadSuccess([data.data.url]);
      } else {
        files.forEach((file) => {
          formData.append('images', file);
        });

        const response = await fetch('http://localhost:3000/api/upload/images', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data: { data: { files: Array<{ url: string }> } } = await response.json();
        onUploadSuccess(data.data.files.map((file) => file.url));
      }

      // Clear after success
      setFiles([]);
      setPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(t('upload.failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="ff-secondary-action flex cursor-pointer items-center justify-center gap-2 px-4 text-[14px]"
        >
          <ImagePlus size={18} />
          {t('upload.choose', { current: files.length, max: maxFiles })}
        </label>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <div key={preview} className="relative aspect-square overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border-soft)' }}>
              <img src={preview} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full border bg-black/70 text-white"
                aria-label={t('upload.remove')}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="ff-action w-full px-4 text-[14px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? t('upload.uploading') : t('upload.upload', { count: files.length })}
        </button>
      )}
    </div>
  );
}
