import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Entrepreneur } from '@/types/entrepreneur';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ParticipantModalProps {
  participant: Entrepreneur | null;
  isOpen: boolean;
  onClose: () => void;
}

const ParticipantModal: React.FC<ParticipantModalProps> = ({ participant, isOpen, onClose }) => {
  if (!participant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-4xl">{participant.avatar}</span>
            <span>{participant.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">О предпринимателе</h3>
            <p className="text-base">{participant.description}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Теги и навыки</h3>
            <div className="flex flex-wrap gap-2">
              {participant.tags.map((tag, index) => (
                <Badge 
                  key={tag} 
                  variant={index < 3 ? "default" : "secondary"}
                  className="text-sm"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Кластер</h3>
            <Badge variant="outline" className="text-sm">
              {participant.cluster}
            </Badge>
          </div>
          
          {participant.goal && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Цель</h3>
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-base italic">{participant.goal}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParticipantModal;