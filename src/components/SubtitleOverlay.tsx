import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SubtitleCue, SubtitleStyle, SubtitleOverlayState } from '@/types';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  style: SubtitleStyle;
  isVisible: boolean;
  dualMode: boolean;
  translatedCues?: SubtitleCue[];
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  cues,
  style,
  isVisible,
  dualMode,
  translatedCues = [],
  onPositionChange,
  onSizeChange
}) => {
  const [overlayState, setOverlayState] = useState<SubtitleOverlayState>({
    isVisible: true,
    position: { x: 0, y: 0 },
    size: { width: 80, height: 200 },
    isDragging: false,
    isResizing: false
  });

  const [isHovered, setIsHovered] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number }>({
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0
  });

  // Calculate position based on style settings
  const getPositionClasses = useCallback(() => {
    switch (style.position) {
      case 'top':
        return 'top-8 left-1/2 transform -translate-x-1/2';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-8 left-1/2 transform -translate-x-1/2';
    }
  }, [style.position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isControlsVisible) return;
    
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: overlayState.position.x,
      startPosY: overlayState.position.y
    };
    
    setOverlayState(prev => ({ ...prev, isDragging: true }));
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;
      
      const newPosition = {
        x: dragRef.current.startPosX + deltaX,
        y: dragRef.current.startPosY + deltaY
      };
      
      setOverlayState(prev => ({ ...prev, position: newPosition }));
      onPositionChange?.(newPosition);
    };
    
    const handleMouseUp = () => {
      setOverlayState(prev => ({ ...prev, isDragging: false }));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isControlsVisible, overlayState.position, onPositionChange]);

  const handleResize = useCallback((direction: string) => {
    const startWidth = overlayState.size.width;
    const startHeight = typeof overlayState.size.height === 'number' ? overlayState.size.height : 200;
    const startX = overlayState.position.x;
    const startY = overlayState.position.y;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startX;
      let newY = startY;

      if (direction.includes('right')) {
        newWidth = Math.max(30, startWidth + deltaX);
      }
      if (direction.includes('left')) {
        newWidth = Math.max(30, startWidth - deltaX);
        newX = startX + deltaX;
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(50, startHeight + deltaY);
      }
      if (direction.includes('top')) {
        newHeight = Math.max(50, startHeight - deltaY);
        newY = startY + deltaY;
      }

      const newSize = { width: newWidth, height: newHeight };
      const newPosition = { x: newX, y: newY };
      
      setOverlayState(prev => ({ 
        ...prev, 
        size: newSize, 
        position: newPosition,
        isResizing: false
      }));
      
      onSizeChange?.(newSize);
      onPositionChange?.(newPosition);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [overlayState.size, overlayState.position, onSizeChange, onPositionChange]);

  useEffect(() => {
    setOverlayState(prev => ({ ...prev, isVisible }));
  }, [isVisible]);

  const renderSubtitleText = (cue: SubtitleCue, isTranslated = false) => {
    const text = isTranslated ? cue.translatedText || cue.text : cue.text;
    const lines = text.split('\n');
    
    return (
      <motion.div
        key={`${cue.id}-${isTranslated ? 'translated' : 'original'}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`text-center ${isTranslated ? 'mt-2 text-sm opacity-90' : ''}`}
        style={{
          fontSize: isTranslated ? `${style.fontSize * 0.9}px` : `${style.fontSize}px`,
          fontFamily: style.fontFamily,
          color: style.color,
          textShadow: style.textShadow,
          lineHeight: style.lineHeight,
        }}
      >
        {lines.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </motion.div>
    );
  };

  if (!isVisible || cues.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {overlayState.isVisible && (
        <motion.div
          ref={overlayRef}
          className={`fixed z-[999999] pointer-events-none ${getPositionClasses()}`}
          style={{
            width: `${overlayState.size.width}%`,
            transform: `translate(calc(-50% + ${overlayState.position.x}px), ${overlayState.position.y}px)`,
            opacity: style.opacity,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setTimeout(() => setIsControlsVisible(false), 2000);
          }}
        >
          {/* Subtitle Container */}
          <div
            className="relative pointer-events-auto"
            style={{
              backgroundColor: style.backgroundColor,
              backdropFilter: `blur(${style.backdropBlur}px)`,
              borderRadius: '12px',
              padding: '12px 16px',
              maxWidth: `${style.maxWidth}%`,
              margin: '0 auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Original Subtitles */}
            <AnimatePresence mode="wait">
              {cues.map(cue => renderSubtitleText(cue, false))}
            </AnimatePresence>

            {/* Translated Subtitles (Dual Mode) */}
            {dualMode && translatedCues.length > 0 && (
              <div className="border-t border-white/20 mt-2 pt-2">
                <AnimatePresence mode="wait">
                  {translatedCues.map(cue => renderSubtitleText(cue, true))}
                </AnimatePresence>
              </div>
            )}

            {/* Hover Controls */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -top-8 right-0 flex gap-1"
                >
                  <button
                    className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                    onClick={() => setIsControlsVisible(!isControlsVisible)}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resize Handles */}
            <AnimatePresence>
              {isControlsVisible && (
                <>
                  {/* Corner resize handles */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" />
                  
                  {/* Edge resize handles */}
                  <div className="absolute top-1/2 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-ew-resize transform -translate-y-1/2" />
                  <div className="absolute top-1/2 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ew-resize transform -translate-y-1/2" />
                  <div className="absolute -top-1 left-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-ns-resize transform -translate-x-1/2" />
                  <div className="absolute -bottom-1 left-1/2 w-3 h-3 bg-blue-500 rounded-full cursor-ns-resize transform -translate-x-1/2" />
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Drag Indicator */}
          {overlayState.isDragging && (
            <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
