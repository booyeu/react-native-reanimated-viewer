import React, {
  forwardRef,
  useRef,
  useState,
  useImperativeHandle,
  useCallback,
  useMemo,
  RefObject,
  ReactElement,
} from 'react';
import {
  StyleSheet,
  Modal,
  ImageURISource,
  ActivityIndicator,
  Dimensions,
  Image,
  ImageResizeMode,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDecay,
  runOnUI,
  cancelAnimation,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStateRef } from 'react-hooks-extension';

export enum GestureEnum {
  TAP = 'TAP',
  MODAL = 'MODAL',
}
export type ImageViewerItemData = {
  key: string;
  source: ImageURISource;
};
export type ImageViewerProps = {
  data: ImageViewerItemData[];
  onLongPress?: (_: { item: ImageViewerItemData; index: number }) => void;
  renderCustomComponent?: (_: { item: ImageViewerItemData; index: number }) => ReactElement;
  imageResizeMode?: ImageResizeMode;
  onChange?: (currentIndex: number) => void;
  dragUpToCloseEnabled?: boolean;
  maxScale?: number;
  doubleTapScale?: number;
  shouldCloseViewer?: (props: {
    gesture: GestureEnum;
    index: number;
    imageData: ImageViewerItemData;
    loaded: boolean;
  }) => boolean;
  originalLayoutOffset?: {
    pageX?: number;
    pageY?: number;
  };
};
type LayoutData = { width: number; height: number; pageX: number; pageY: number };
export type ImageViewerRef = {
  show: (_: { index: number; source?: ImageURISource }) => void;
  init: (_: { index: number; itemRef: RefObject<View> }) => void;
};

const IMAGE_SPACE = 20;

const styles = StyleSheet.create({
  full: {
    flex: 1,
  },
  absolute: {
    position: 'absolute',
  },
  animatedContainer: {
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const ImageViewer = forwardRef<ImageViewerRef, ImageViewerProps>((props, ref) => {
  const screenDimensions = Dimensions.get('screen');

  const {
    data,
    renderCustomComponent,
    onLongPress,
    imageResizeMode = 'contain',
    onChange,
    dragUpToCloseEnabled,
    maxScale = 3,
    doubleTapScale = 2,
    shouldCloseViewer,
    originalLayoutOffset,
  } = props;
  const imageItemRef = useRef<RefObject<View>[]>([]);
  const imageMemoSizeRef = useRef<Record<string, { width: number; height: number }>>({});
  const initIndexRef = useRef(0);

  const [activeSource, setSourceData] = useState<ImageURISource>();
  const activeLayout = useSharedValue<LayoutData | undefined>(undefined);
  const [animatedOver, setAnimatedOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadedIndexListRef = useRef<number[]>([]);
  const [finishInit, setFinishInit] = useState(false);
  const [isScale, setIsScale] = useState(false);

  const originalImageSize = useSharedValue<{ width?: number; height?: number }>({});
  const imageSize = useSharedValue<Record<string, { width?: number; height?: number }>>({});
  const activeIndex = useSharedValue(0);
  const [activeIndexState, setActiveIndexState, activeIndexStateRef] = useStateRef<number>(0);
  const animatedRate = useSharedValue(0);
  const imageX = useSharedValue(0);
  const imageY = useSharedValue(0);
  const closeRate = useSharedValue(0);
  const imageScale = useSharedValue(1);
  const savedImageScale = useSharedValue(1);
  const savedImageX = useSharedValue(0);
  const savedImageY = useSharedValue(0);

  useAnimatedReaction(
    () => savedImageScale.value !== 1,
    (value) => runOnJS(setIsScale)(value),
  );

  const formatImageStyle = useCallback(
    (
      imagePosition: number,
      imageSizeValue: Record<string, { width?: number; height?: number }>,
      currentOriginalImageSize: { width?: number; height?: number },
      closeRateValue: number,
      imageXValue: number,
      imageYValue: number,
      activeLayoutValue: LayoutData | undefined,
      activeIndexValue: number,
      imageScaleValue: number,
    ) => {
      'worklet';
      const relativeActiveIndex = ((activeIndexValue % 3) + 3) % 3;
      const currentIndex =
        Math.floor(activeIndexValue / 3) * 3 +
        (relativeActiveIndex > imagePosition && activeIndexValue > 0 ? 3 : 0) +
        imagePosition -
        1;
      if (!data[currentIndex]?.key) {
        return {};
      }
      const currentImageSize = imageSizeValue[data[currentIndex].key];
      const imageWHRate = (currentImageSize?.width ?? 1) / (currentImageSize?.height ?? 1);
      const screenWHRate = screenDimensions.width / screenDimensions.height;
      const currentHeight =
        imageWHRate > screenWHRate ? screenDimensions.width / imageWHRate : screenDimensions.height;
      const currentWidth =
        imageWHRate > screenWHRate ? screenDimensions.width : screenDimensions.height * imageWHRate;
      const changeHeight =
        dragUpToCloseEnabled || imageYValue > 0
          ? (((currentOriginalImageSize?.height || 0) - screenDimensions.height) *
              (imageScaleValue === 1 ? -Math.abs(imageYValue) : 1)) /
            screenDimensions.height /
            3
          : 0;
      const manualWidth = Math.min(currentWidth, currentWidth + changeHeight * imageWHRate);
      const manualHeight = Math.min(currentHeight, currentHeight + changeHeight);
      const manualTop = (screenDimensions.height - manualHeight) / 2 + imageYValue;
      const manualLeft = imageXValue;
      const resultWidth =
        manualWidth + ((activeLayoutValue?.width || 0) - manualWidth) * closeRateValue;
      const resultHeight =
        manualHeight + ((activeLayoutValue?.height || 0) - manualHeight) * closeRateValue;
      return {
        width: resultWidth * imageScaleValue,
        height: resultHeight * imageScaleValue,
        transform: [
          {
            translateX:
              manualLeft -
              (screenDimensions.width + IMAGE_SPACE) * activeIndexValue +
              (resultWidth * (1 - imageScaleValue)) / 2 +
              ((screenDimensions.width - manualWidth) * (1 - closeRateValue)) / 2 +
              (((activeLayoutValue?.pageX || 0) - manualLeft) * closeRateValue) / imageScaleValue +
              (imagePosition -
                1 +
                Math.floor(activeIndexValue / 3) * 3 +
                (relativeActiveIndex > imagePosition && activeIndexValue > 0 ? 3 : 0)) *
                (screenDimensions.width + IMAGE_SPACE),
          },
          {
            translateY:
              manualTop +
              (resultHeight * (1 - imageScaleValue)) / 2 +
              (((activeLayoutValue?.pageY || 0) - manualTop) * closeRateValue) / imageScaleValue,
          },
        ],
        display: ((relativeActiveIndex + 1) % 3 !== imagePosition &&
        (imageYValue || imageScaleValue < 1)
          ? 'none'
          : 'flex') as 'none' | 'flex',
      };
    },
    [data, screenDimensions.width, screenDimensions.height, dragUpToCloseEnabled],
  );
  const imageStyle_0 = useAnimatedStyle(
    () =>
      formatImageStyle(
        0,
        imageSize.value,
        originalImageSize.value,
        closeRate.value,
        imageX.value,
        imageY.value,
        activeLayout.value,
        activeIndex.value,
        imageScale.value,
      ),
    [formatImageStyle],
  );
  const imageStyle_1 = useAnimatedStyle(
    () =>
      formatImageStyle(
        1,
        imageSize.value,
        originalImageSize.value,
        closeRate.value,
        imageX.value,
        imageY.value,
        activeLayout.value,
        activeIndex.value,
        imageScale.value,
      ),
    [formatImageStyle],
  );
  const imageStyle_2 = useAnimatedStyle(
    () =>
      formatImageStyle(
        2,
        imageSize.value,
        originalImageSize.value,
        closeRate.value,
        imageX.value,
        imageY.value,
        activeLayout.value,
        activeIndex.value,
        imageScale.value,
      ),
    [formatImageStyle],
  );
  const imageStyleList = [imageStyle_0, imageStyle_1, imageStyle_2];
  const originalImageStyle = useAnimatedStyle(() => {
    const currentLayout = activeLayout.value;
    if (!currentLayout) {
      return {};
    }
    const imageWHRate =
      (originalImageSize.value.width ?? 1) / (originalImageSize.value.height ?? 1);
    const screenWHRate = screenDimensions.width / screenDimensions.height;
    const currentHeight =
      currentLayout.height +
      ((imageWHRate > screenWHRate
        ? screenDimensions.width / imageWHRate
        : screenDimensions.height) -
        currentLayout.height) *
        animatedRate.value;
    const currentWidth =
      currentLayout.width +
      ((imageWHRate > screenWHRate
        ? screenDimensions.width
        : screenDimensions.height * imageWHRate) -
        currentLayout.width) *
        animatedRate.value;
    return {
      width: currentWidth,
      height: currentHeight,
      transform: [
        {
          translateX:
            currentLayout.pageX +
            (Math.max(0, (screenDimensions.width - currentWidth) / 2) - currentLayout.pageX) *
              animatedRate.value,
        },
        {
          translateY:
            currentLayout.pageY +
            (Math.max(0, (screenDimensions.height - currentHeight) / 2) - currentLayout.pageY) *
              animatedRate.value,
        },
      ],
    };
  }, [screenDimensions.width]);
  const imageContainerStyle = useAnimatedStyle(() => {
    let opacity =
      (imageScale.value === 1 && (dragUpToCloseEnabled || imageY.value > 0)) || closeRate.value > 0
        ? Math.round(
            0xff * (1 - Math.abs(imageY.value) / screenDimensions.height) * (1 - closeRate.value),
          ).toString(16)
        : 'ff';
    opacity.length === 1 && (opacity = `0${opacity}`);
    return {
      backgroundColor: `#000000${opacity}`,
    };
  }, [screenDimensions.height, dragUpToCloseEnabled]);

  const hideOriginalImage = useCallback(() => {
    imageItemRef.current[activeIndexStateRef.current || 0]?.current?.setNativeProps({
      style: { opacity: 0 },
    });
  }, [activeIndexStateRef]);
  const showOriginalImage = useCallback(() => {
    imageItemRef.current[activeIndexStateRef.current || 0]?.current?.setNativeProps({
      style: { alignSelf: 'flex-start', opacity: 1 },
    });
  }, [activeIndexStateRef]);
  const onCloseFinish = useCallback(
    (shouldCloseGesture?: GestureEnum) => {
      if (
        shouldCloseGesture &&
        shouldCloseViewer &&
        activeIndexStateRef.current !== undefined &&
        !shouldCloseViewer({
          gesture: shouldCloseGesture,
          index: activeIndexStateRef.current,
          imageData: data[activeIndexStateRef.current],
          loaded: false,
        })
      )
        return;
      setSourceData(undefined);
      setLoading(false);
      setFinishInit(false);
      setAnimatedOver(false);
      setTimeout(() => {
        animatedRate.value = 0;
        imageY.value = 0;
        imageX.value = 0;
        closeRate.value = 0;
        showOriginalImage();
      }, 0);
    },
    [
      shouldCloseViewer,
      activeIndexStateRef,
      data,
      animatedRate,
      imageY,
      imageX,
      closeRate,
      showOriginalImage,
    ],
  );
  const onCloseMeasure = useCallback(
    (_imageSize?: { width?: number; height?: number }, shouldCloseGesture?: GestureEnum) => {
      if (
        shouldCloseGesture &&
        shouldCloseViewer &&
        activeIndexStateRef.current !== undefined &&
        !shouldCloseViewer({
          gesture: shouldCloseGesture,
          index: activeIndexStateRef.current,
          imageData: data[activeIndexStateRef.current],
          loaded: true,
        })
      )
        return;
      const imageWHRate = (_imageSize?.width ?? 1) / (_imageSize?.height ?? 1);
      const screenWHRate = screenDimensions.width / screenDimensions.height;
      const currentWidth =
        imageWHRate > screenWHRate ? screenDimensions.width : screenDimensions.height * imageWHRate;
      const currentHeight =
        imageWHRate > screenWHRate ? screenDimensions.width / imageWHRate : screenDimensions.height;
      const layoutFinish = (
        width = currentWidth / 3,
        height = currentHeight / 3,
        pageX = (screenDimensions.width - currentWidth / 2) / 2,
        pageY = (initIndexRef.current > (activeIndexStateRef.current || 0) ? -1 : 1) *
          screenDimensions.height,
      ) => {
        activeLayout.value = { width, height, pageX, pageY };
        setTimeout(() => {
          animatedRate.value = withTiming(1, undefined, (finished) => {
            finished && runOnJS(setAnimatedOver)(true);
          });
          closeRate.value = withTiming(1, undefined, (finished) => {
            if (finished) {
              runOnJS(onCloseFinish)();
            }
          });
        }, 0);
      };
      if (imageItemRef.current[activeIndexStateRef.current ?? -1]?.current) {
        imageItemRef.current[activeIndexStateRef.current!].current?.measure(
          (_x, _y, width, height, pageX, pageY) => {
            layoutFinish(
              width,
              height,
              pageX + (originalLayoutOffset?.pageX || 0),
              pageY + (originalLayoutOffset?.pageY || 0),
            );
          },
        );
      } else {
        layoutFinish();
      }
    },
    [
      shouldCloseViewer,
      activeIndexStateRef,
      data,
      screenDimensions.width,
      screenDimensions.height,
      activeLayout,
      animatedRate,
      closeRate,
      onCloseFinish,
      originalLayoutOffset?.pageX,
      originalLayoutOffset?.pageY,
    ],
  );
  const onClose = useCallback(
    (shouldCloseGesture?: GestureEnum) => {
      'worklet';
      imageScale.value = withTiming(1);
      runOnJS(onCloseMeasure)(imageSize.value[data[activeIndex.value].key], shouldCloseGesture);
      savedImageScale.value = 1;
      savedImageX.value = 0;
      savedImageY.value = 0;
    },
    [
      activeIndex,
      data,
      imageScale,
      imageSize,
      onCloseMeasure,
      savedImageScale,
      savedImageX,
      savedImageY,
    ],
  );
  const onRequestClose = useCallback(() => {
    'worklet';
    onClose(GestureEnum.MODAL);
  }, [onClose]);

  const setImageSize = useCallback(
    (key: string, _source: { width?: number; height?: number }) => {
      'worklet';
      imageSize.value = Object.assign({}, imageSize.value, { [key]: _source });
    },
    [imageSize],
  );

  const dragLastTime = useSharedValue(0);
  const imageDragGestureY = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(dragUpToCloseEnabled ? [-20, 20] : 20)
        .onStart(() => {
          runOnJS(hideOriginalImage)();
          dragLastTime.value = Date.now().valueOf();
        })
        .onUpdate((event) => {
          imageX.value = event.translationX;
          imageY.value = event.translationY;
        })
        .onEnd((event) => {
          const translationY = dragUpToCloseEnabled
            ? Math.abs(event.translationY)
            : event.translationY;
          if (
            translationY < 100 &&
            (Date.now().valueOf() - dragLastTime.value > 500 ||
              (event.translationY <= 0 && !dragUpToCloseEnabled))
          ) {
            imageX.value = withTiming(0);
            imageY.value = withTiming(0);
            runOnJS(showOriginalImage)();
          } else {
            onClose();
          }
        }),
    [
      dragUpToCloseEnabled,
      hideOriginalImage,
      dragLastTime,
      imageX,
      imageY,
      showOriginalImage,
      onClose,
    ],
  );
  const _onChange = useCallback(
    (currentIndex: number) => {
      setActiveIndexState(currentIndex);
      onChange?.(currentIndex);
    },
    [onChange, setActiveIndexState],
  );
  const imageDragGestureX = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .onStart(() => {
          dragLastTime.value = Date.now().valueOf();
        })
        .onUpdate((event) => {
          imageX.value =
            event.translationX *
            ((event.translationX < 0 ? activeIndex.value < data.length - 1 : activeIndex.value > 0)
              ? 1
              : 0.4);
        })
        .onEnd((event) => {
          if (
            (event.translationX < 0
              ? activeIndex.value < data.length - 1
              : activeIndex.value > 0) &&
            (Date.now().valueOf() - dragLastTime.value < 500 ||
              Math.abs(event.translationX) > screenDimensions.width / 2)
          ) {
            imageX.value = withTiming(
              (screenDimensions.width + IMAGE_SPACE) * (event.translationX < 0 ? -1 : 1),
              { duration: 200 },
              () => {
                activeIndex.value += event.translationX < 0 ? 1 : -1;
                imageX.value = 0;
                runOnJS(_onChange)(activeIndex.value);
              },
            );
          } else {
            imageX.value = withTiming(0);
          }
          savedImageX.value = 0;
        }),
    [dragLastTime, imageX, activeIndex, savedImageX, screenDimensions.width, data, _onChange],
  );
  const imageDragGestureMove = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(5)
        .onStart(() => {
          cancelAnimation(imageX);
          cancelAnimation(imageY);
        })
        .onUpdate((event) => {
          imageX.value = savedImageX.value + event.translationX;
          imageY.value = savedImageY.value + event.translationY;
        })
        .onEnd((event) => {
          savedImageX.value = imageX.value;
          savedImageY.value = imageY.value;
          const currentImageSize = imageSize.value[data[activeIndex.value].key];
          const imageWHRate = (currentImageSize.width ?? 1) / (currentImageSize.height ?? 1);
          const screenWHRate = screenDimensions.width / screenDimensions.height;
          const currentImageHeight =
            imageWHRate > screenWHRate
              ? screenDimensions.width / imageWHRate
              : screenDimensions.height;
          const currentImageWidth =
            imageWHRate > screenWHRate
              ? screenDimensions.width
              : screenDimensions.height * imageWHRate;
          const currentWidthRange = (currentImageWidth * (savedImageScale.value - 1)) / 2;
          const currentImageX = Math.min(
            currentWidthRange,
            Math.max(-currentWidthRange, savedImageX.value),
          );
          if (currentImageX !== savedImageX.value) {
            imageX.value = withTiming(currentImageX);
            savedImageX.value = currentImageX;
          } else if (event?.velocityX) {
            const targetImageX = Math.min(
              currentWidthRange,
              Math.max(
                -currentWidthRange,
                savedImageX.value + (event.velocityX > 0 ? 100 : -100) * savedImageScale.value,
              ),
            );
            imageX.value = withDecay(
              {
                velocity: event.velocityX,
                clamp:
                  event.velocityX > 0
                    ? [savedImageX.value, targetImageX]
                    : [targetImageX, savedImageX.value],
              },
              () => {
                savedImageX.value = imageX.value;
              },
            );
          }
          const currentHeightRange = Math.abs(
            (currentImageHeight * savedImageScale.value - screenDimensions.height) / 2,
          );
          const currentImageY = Math.min(
            currentHeightRange,
            Math.max(-currentHeightRange, savedImageY.value),
          );
          if (currentImageY !== savedImageY.value) {
            imageY.value = withTiming(currentImageY);
            savedImageY.value = currentImageY;
          } else if (event?.velocityY) {
            const targetImageY = Math.min(
              currentHeightRange,
              Math.max(
                -currentHeightRange,
                savedImageY.value + (event.velocityY > 0 ? 100 : -100) * savedImageScale.value,
              ),
            );
            imageY.value = withDecay(
              {
                velocity: event.velocityY,
                clamp:
                  event.velocityY > 0
                    ? [savedImageY.value, targetImageY]
                    : [targetImageY, savedImageY.value],
              },
              () => {
                savedImageY.value = imageY.value;
              },
            );
          }
        }),
    [
      activeIndex,
      data,
      imageSize,
      imageX,
      imageY,
      savedImageScale,
      savedImageX,
      savedImageY,
      screenDimensions.height,
      screenDimensions.width,
    ],
  );
  const resetScale = useCallback(() => {
    'worklet';
    imageScale.value = withTiming(1);
    imageX.value = withTiming(0);
    imageY.value = withTiming(0);
    savedImageScale.value = 1;
    savedImageX.value = 0;
    savedImageY.value = 0;
  }, [imageScale, imageX, imageY, savedImageScale, savedImageX, savedImageY]);
  const imageOriginalTapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        runOnJS(onCloseFinish)(GestureEnum.TAP);
      }),
    [onCloseFinish],
  );
  const imageSingleTapGesture = useMemo(
    () =>
      Gesture.Tap().onStart(() => {
        if (imageScale.value === 1) {
          runOnJS(hideOriginalImage)();
        }
        onClose(GestureEnum.TAP);
      }),
    [onClose, hideOriginalImage, imageScale],
  );
  const imageDoubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onStart((event) => {
          if (imageScale.value !== 1) {
            resetScale();
          } else {
            imageScale.value = withTiming(doubleTapScale);
            savedImageScale.value = doubleTapScale;
            const currentX = (screenDimensions.width / 2 - event.x) * doubleTapScale;
            imageX.value = withTiming(currentX);
            savedImageX.value = currentX;
            const currentY = (screenDimensions.height / 2 - event.y) * doubleTapScale;
            imageY.value = withTiming(currentY);
            savedImageY.value = currentY;
          }
        }),
    [
      imageScale,
      resetScale,
      doubleTapScale,
      savedImageScale,
      screenDimensions.width,
      screenDimensions.height,
      imageX,
      savedImageX,
      imageY,
      savedImageY,
    ],
  );
  const imageTapGesture = useMemo(
    () => Gesture.Exclusive(imageDoubleTapGesture, imageSingleTapGesture),
    [imageDoubleTapGesture, imageSingleTapGesture],
  );
  const imagePinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          imageScale.value = savedImageScale.value * event.scale;
          imageX.value = savedImageX.value * event.scale;
          imageY.value = savedImageY.value * event.scale;
        })
        .onEnd(() => {
          const currentScale = Math.min(Math.max(1, imageScale.value), maxScale);
          if (currentScale === 1) {
            resetScale();
          } else {
            imageScale.value = withTiming(currentScale);
            const changedScale = currentScale / savedImageScale.value;
            savedImageScale.value = currentScale;
            const currentImageX = savedImageX.value * changedScale;
            const currentImageY = savedImageY.value * changedScale;
            imageX.value = withTiming(currentImageX);
            imageY.value = withTiming(currentImageY);
            savedImageX.value = currentImageX;
            savedImageY.value = currentImageY;
          }
        }),
    [imageScale, savedImageScale, imageX, imageY, savedImageX, savedImageY, maxScale, resetScale],
  );
  const imageLongPressGesture = useMemo(
    () =>
      Gesture.LongPress().onStart(() => {
        if (onLongPress) {
          runOnJS(onLongPress)({ index: activeIndex.value, item: data[activeIndex.value] });
        }
      }),
    [onLongPress, activeIndex, data],
  );
  const imageGesture = useMemo(
    () =>
      Gesture.Race(
        imageDragGestureY,
        imageDragGestureX,
        imageTapGesture,
        imagePinchGesture,
        imageLongPressGesture,
      ),
    [
      imageDragGestureY,
      imageDragGestureX,
      imageTapGesture,
      imagePinchGesture,
      imageLongPressGesture,
    ],
  );
  const imageGestureWithScale = useMemo(
    () =>
      Gesture.Race(imageDragGestureMove, imageTapGesture, imagePinchGesture, imageLongPressGesture),
    [imageDragGestureMove, imageTapGesture, imagePinchGesture, imageLongPressGesture],
  );

  useImperativeHandle(ref, () => ({
    init: ({ itemRef, index }) => {
      imageItemRef.current[index] = itemRef;
    },
    show: ({ index, source = data[index].source }) => {
      const _screenDimensions = Dimensions.get('screen');
      initIndexRef.current = index;
      activeIndex.value = index;
      setActiveIndexState(index);
      setSourceData(source);
      const startShow = () => {
        // 兼容没有imageWrapper的情况
        if (imageItemRef.current[index]?.current) {
          imageItemRef.current[index].current!.measure((_x, _y, width, height, pageX, pageY) => {
            activeLayout.value = {
              width,
              height,
              pageX: pageX + (originalLayoutOffset?.pageX || 0),
              pageY: pageY + (originalLayoutOffset?.pageY || 0),
            };
            setTimeout(() => {
              animatedRate.value = withTiming(1, undefined, (finished) => {
                finished && runOnJS(setAnimatedOver)(true);
              });
            }, 0);
          });
        } else {
          setTimeout(() => {
            animatedRate.value = withTiming(1, undefined, (finished) => {
              finished && runOnJS(setAnimatedOver)(true);
            });
          }, 0);
        }
      };
      if (source.width && source.height) {
        originalImageSize.value = { width: source.width, height: source.height };
        startShow();
      } else if (imageMemoSizeRef.current[source.uri || '']) {
        originalImageSize.value = imageMemoSizeRef.current[source.uri || ''];
        startShow();
      } else {
        (
          Image.getSize(
            source.uri || '',
            // 0.77.0 开始支持 后续可以移除
            (width, height) => {
              imageMemoSizeRef.current[source.uri || ''] = originalImageSize.value = {
                width,
                height,
              };
              startShow();
            },
            () => {
              originalImageSize.value = _screenDimensions;
              startShow();
            },
          ) as unknown as Promise<any>
        )
          ?.then?.(({ width, height }: { width: number; height: number }) => {
            // 兼容react-native 0.77.0
            imageMemoSizeRef.current[source.uri || ''] = originalImageSize.value = {
              width,
              height,
            };
            startShow();
          })
          .catch(() => {
            originalImageSize.value = _screenDimensions;
            startShow();
          });
      }
    },
  }));

  return (
    <Modal
      visible={!!activeSource}
      animationType="fade"
      transparent
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.full}>
        {activeSource ? (
          <GestureDetector
            gesture={
              !animatedOver || !finishInit
                ? imageOriginalTapGesture
                : isScale
                ? imageGestureWithScale
                : imageGesture
            }
          >
            <View>
              <Animated.View style={[styles.animatedContainer, imageContainerStyle]}>
                {Array.from(new Array(3)).map((_, index) => {
                  const relativeActiveIndex = ((activeIndexState! % 3) + 3) % 3;
                  const currentIndex =
                    Math.floor(activeIndexState! / 3) * 3 +
                    (relativeActiveIndex > index && activeIndexState! > 0 ? 3 : 0) +
                    index -
                    1;
                  if (currentIndex < 0 || currentIndex >= data.length) {
                    return null;
                  }
                  const currentData = data[currentIndex];
                  return (
                    <Animated.Image
                      key={`image-viewer-${currentIndex}`}
                      resizeMode="contain"
                      source={
                        typeof currentData.source === 'object'
                          ? { ...currentData.source }
                          : currentData.source
                      }
                      onLoadStart={() => {
                        if (
                          relativeActiveIndex === index - 1 &&
                          !loadedIndexListRef.current.includes(activeIndexState!)
                        ) {
                          setLoading(true);
                        }
                      }}
                      onLoad={({ nativeEvent: { source } }) => {
                        runOnUI(setImageSize)(currentData.key, source || currentData.source);
                        setFinishInit(true);
                        if (relativeActiveIndex === index - 1) {
                          setLoading(false);
                          if (!loadedIndexListRef.current.includes(activeIndexState!)) {
                            loadedIndexListRef.current.push(activeIndexState!);
                          }
                        }
                      }}
                      style={[styles.absolute, imageStyleList[index]]}
                    />
                  );
                })}
                {loading && animatedOver ? (
                  <ActivityIndicator
                    style={[StyleSheet.absoluteFill, styles.loading]}
                    color="#fff"
                  />
                ) : null}
              </Animated.View>
              {!animatedOver || !finishInit ? (
                <View style={[StyleSheet.absoluteFill, styles.animatedContainer]}>
                  <Animated.Image
                    source={typeof activeSource === 'object' ? { ...activeSource } : activeSource}
                    resizeMode={imageResizeMode}
                    style={[styles.absolute, originalImageStyle]}
                  />
                  {!finishInit && animatedOver ? (
                    <ActivityIndicator
                      style={[StyleSheet.absoluteFill, styles.loading]}
                      color="#fff"
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          </GestureDetector>
        ) : null}
        {renderCustomComponent?.({ item: data[activeIndexState!], index: activeIndexState! })}
      </GestureHandlerRootView>
    </Modal>
  );
});

export default React.memo(ImageViewer);
