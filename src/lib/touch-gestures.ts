export interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export interface SwipeGesture {
  direction: "left" | "right" | "up" | "down";
  distance: number;
  velocity: number;
  duration: number;
}

export interface PinchGesture {
  scale: number;
  center: TouchPoint;
}

export interface GestureConfig {
  swipeThreshold: number;
  velocityThreshold: number;
  longPressThreshold: number;
  doubleTapThreshold: number;
  pinchThreshold: number;
}

const defaultConfig: GestureConfig = {
  swipeThreshold: 50,
  velocityThreshold: 0.3,
  longPressThreshold: 500,
  doubleTapThreshold: 300,
  pinchThreshold: 0.1,
};

export class TouchGestureHandler {
  private config: GestureConfig;
  private touchStart: TouchPoint | null = null;
  private lastTap: TouchPoint | null = null;
  private longPressTimer: NodeJS.Timeout | null = null;
  private initialPinchDistance: number | null = null;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchCenter(touch1: Touch, touch2: Touch): TouchPoint {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
      time: Date.now(),
    };
  }

  onTouchStart = (
    e: TouchEvent,
    callbacks: {
      onLongPress?: () => void;
      onPinchStart?: (gesture: PinchGesture) => void;
    } = {},
  ) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      if (callbacks.onLongPress) {
        this.longPressTimer = setTimeout(() => {
          callbacks.onLongPress!();
        }, this.config.longPressThreshold);
      }
    } else if (e.touches.length === 2 && callbacks.onPinchStart) {
      this.initialPinchDistance = this.getDistance(e.touches[0], e.touches[1]);
      const center = this.getTouchCenter(e.touches[0], e.touches[1]);
      callbacks.onPinchStart({
        scale: 1,
        center,
      });
    }

    this.clearLongPressTimer();
  };

  onTouchMove = (
    e: TouchEvent,
    callbacks: {
      onPinch?: (gesture: PinchGesture) => void;
    } = {},
  ) => {
    if (
      e.touches.length === 2 &&
      this.initialPinchDistance &&
      callbacks.onPinch
    ) {
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / this.initialPinchDistance;
      const center = this.getTouchCenter(e.touches[0], e.touches[1]);

      if (Math.abs(scale - 1) > this.config.pinchThreshold) {
        callbacks.onPinch({
          scale,
          center,
        });
      }
    }

    this.clearLongPressTimer();
  };

  onTouchEnd = (
    e: TouchEvent,
    callbacks: {
      onSwipe?: (gesture: SwipeGesture) => void;
      onTap?: () => void;
      onDoubleTap?: () => void;
      onPinchEnd?: () => void;
    } = {},
  ) => {
    this.clearLongPressTimer();

    if (e.touches.length === 0 && this.touchStart) {
      const touch = e.changedTouches[0];
      const endTime = Date.now();
      const deltaX = touch.clientX - this.touchStart.x;
      const deltaY = touch.clientY - this.touchStart.y;
      const duration = endTime - this.touchStart.time;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / duration;

      if (
        distance > this.config.swipeThreshold &&
        velocity > this.config.velocityThreshold
      ) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        let direction: SwipeGesture["direction"];

        if (absX > absY) {
          direction = deltaX > 0 ? "right" : "left";
        } else {
          direction = deltaY > 0 ? "down" : "up";
        }

        if (callbacks.onSwipe) {
          callbacks.onSwipe({
            direction,
            distance,
            velocity,
            duration,
          });
        }
      } else if (distance < 20 && duration < 200) {
        const now = Date.now();
        if (
          this.lastTap &&
          now - this.lastTap.time < this.config.doubleTapThreshold &&
          Math.abs(touch.clientX - this.lastTap.x) < 30 &&
          Math.abs(touch.clientY - this.lastTap.y) < 30
        ) {
          if (callbacks.onDoubleTap) {
            callbacks.onDoubleTap();
          }
          this.lastTap = null;
        } else {
          this.lastTap = {
            x: touch.clientX,
            y: touch.clientY,
            time: now,
          };
          if (callbacks.onTap) {
            setTimeout(() => {
              if (this.lastTap && this.lastTap.time === now) {
                callbacks.onTap!();
              }
            }, this.config.doubleTapThreshold);
          }
        }
      }

      this.touchStart = null;
    }

    if (e.touches.length === 0) {
      this.initialPinchDistance = null;
      if (callbacks.onPinchEnd) {
        callbacks.onPinchEnd();
      }
    }
  };

  private clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  destroy() {
    this.clearLongPressTimer();
  }
}

export const createTouchGestureHandler = (config?: Partial<GestureConfig>) => {
  return new TouchGestureHandler(config);
};
