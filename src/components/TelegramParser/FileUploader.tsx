import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';

interface FileUploaderProps {
  uploading: boolean;
  uploadProgress: number;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

const FileUploader: React.FC<FileUploaderProps> = ({ uploading, uploadProgress, onFileUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <div className="flex items-center gap-2 ml-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onFileUpload}
          className="hidden"
          id="json-upload"
        />
        <label htmlFor="json-upload">
          <Button 
            variant="outline" 
            disabled={uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              <Icon name={uploading ? "Loader2" : "Upload"} size={16} className={uploading ? "mr-2 animate-spin" : "mr-2"} />
              {uploading ? 'Обработка...' : 'Загрузить JSON'}
            </span>
          </Button>
        </label>
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {uploadProgress < 30 && 'Читаем файл...'}
            {uploadProgress >= 30 && uploadProgress < 70 && 'Анализируем участников с помощью AI...'}
            {uploadProgress >= 70 && uploadProgress < 100 && 'Сохраняем в базу данных...'}
            {uploadProgress === 100 && 'Готово!'}
          </p>
        </div>
      )}
    </>
  );
};

export default FileUploader;