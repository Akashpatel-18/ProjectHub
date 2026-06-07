import React, { useRef } from 'react';
import { Paperclip, Plus, Loader2, FileText, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadAttachmentMutation, useDeleteAttachmentMutation } from '@/services/task/task.queries';

interface TaskAttachmentsProps {
  taskId: string;
  slug: string;
  attachments: any[];
  canEditTasks?: boolean;
}

export function TaskAttachments({ taskId, slug, attachments, canEditTasks = true }: TaskAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadAttachmentMutation(slug, taskId);
  const deleteAttachmentMutation = useDeleteAttachmentMutation(slug, taskId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Paperclip className="w-4 h-4 text-primary" /> Attachments
        </h4>
        {canEditTasks && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            className="h-7 text-[10px] font-semibold tracking-wider uppercase bg-secondary/30 border-border/40 hover:bg-secondary"
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Plus className="w-3 h-3 mr-1" />
            )}
            Upload
          </Button>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {attachments && attachments.length > 0 ? (
          attachments.map((att: any) => (
            <div 
              key={att.id} 
              className="flex items-center justify-between p-2 rounded-xl border border-border/30 bg-card/20 hover:border-border transition-all duration-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate text-foreground">{att.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(att.size / 1024)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground">
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </Button>
                {canEditTasks && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteAttachmentMutation.mutate(att.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="sm:col-span-2 py-6 text-center border border-dashed border-border/50 rounded-xl bg-card/5 text-muted-foreground text-xs font-medium">
            No attachments uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}
