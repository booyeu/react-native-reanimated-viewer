import React, {
  forwardRef,
  memo,
  useRef,
  useState,
  useImperativeHandle,
  useCallback,
  useMemo,
  useEffect,
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
  TouchableOpacity,
  ImageResizeMode,
  StatusBar,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDecay,
  useWorkletCallback,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureStateChangeEvent,
  PanGestureHandlerEventPayload,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useStateRef } from 'react-hooks-extension';

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
};
type LayoutData = { width: number; height: number; pageX: number; pageY: number };
export type ImageViewerRef = {
  show: (_: { index: number; source: ImageURISource }) => void;
  init: (_: { index: number; itemRef: RefObject<TouchableOpacity> }) => void;
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

  const { data, renderCustomComponent, onLongPress, imageResizeMode, onChange } = props;
  const imageItemRef = useRef<RefObject<TouchableOpacity>[]>([]);

  const [activeSource, setSourceData] = useState<ImageURISource>();
  const activeLayout = useSharedValue<LayoutData | undefined>(undefined);
  const [animatedOver, setAnimatedOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finishInit, setFinishInit] = useState(false);

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

  const formatImageStyle = useWorkletCallback(
    (
      imagePosition: number,
      imageSizeValue,
      currentOriginalImageSize,
      closeRateValue,
      imageXValue,
      imageYValue,
      activeLayoutValue,
      activeIndexValue,
      imageScaleValue,
    ) => {
      const relativeActiveIndex = ((activeIndexValue % 3) + 3) % 3;
      const currentIndex =
        Math.floor(imagePosition / 3) * 3 +
        (relativeActiveIndex > imagePosition && activeIndexValue > 0
          ? 3
          : relativeActiveIndex <= imagePosition && activeIndexValue < 0
          ? -3
          : 0) +
        imagePosition -
        1;
      if (!data[currentIndex]?.key) {
        return {};
      }
      const currentImageSize = imageSizeValue[data[currentIndex].key];
      const currentHeight =
        ((currentImageSize?.height || 1) * screenDimensions.width) / (currentImageSize?.width || 1);
      const changeHeight =
        (((currentOriginalImageSize?.height || 0) - screenDimensions.height) *
          (imageScaleValue === 1 ? imageYValue : 1)) /
        screenDimensions.height;
      const manualWidth = Math.min(
        screenDimensions.width,
        screenDimensions.width +
          (changeHeight * (currentImageSize?.width || 1)) / (currentImageSize?.height || 1),
      );
      const manualHeight = Math.min(currentHeight, currentHeight + changeHeight);
      const manualTop =
        ((screenDimensions.height - currentHeight) / 2 + imageYValue) / imageScaleValue;
      const manualLeft = imageXValue / imageScaleValue;
      return {
        width: manualWidth + ((activeLayoutValue?.width || 0) - manualWidth) * closeRateValue,
        height: manualHeight + ((activeLayoutValue?.height || 0) - manualHeight) * closeRateValue,
        transform: [
          { scale: imageScaleValue },
          {
            translateX:
              manualLeft -
              (screenDimensions.width + IMAGE_SPACE) * activeIndexValue +
              (((activeLayoutValue?.pageX || 0) - manualLeft) * closeRateValue) / imageScaleValue +
              (imagePosition -
                1 +
                Math.floor(activeIndexValue / 3) * 3 +
                (relativeActiveIndex > imagePosition && activeIndexValue > 0
                  ? 3
                  : relativeActiveIndex <= imagePosition && activeIndexValue < 0
                  ? -3
                  : 0)) *
                (screenDimensions.width + IMAGE_SPACE),
          },
          {
            translateY:
              manualTop +
              (((activeLayoutValue?.pageY || 0) - manualTop) * closeRateValue) / imageScaleValue,
          },
        ],
        display: ((relativeActiveIndex + 1) % 3 !== imagePosition &&
        (imageYValue || imageScaleValue < 1)
          ? 'none'
          : 'flex') as 'none' | 'flex',
      };
    },
    [screenDimensions.width, data],
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
  const imageStyleList = useMemo(
    () => [imageStyle_0, imageStyle_1, imageStyle_2],
    [imageStyle_0, imageStyle_1, imageStyle_2],
  );
  const originalImageStyle = useAnimatedStyle(() => {
    const currentLayout = activeLayout.value;
    if (!currentLayout) {
      return {};
    }
    const currentHeight =
      currentLayout.height +
      ((screenDimensions.width * (originalImageSize.value.height || 1)) /
        (originalImageSize.value.width || 1) -
        currentLayout.height) *
        animatedRate.value;
    return {
      width:
        currentLayout.width + (screenDimensions.width - currentLayout.width) * animatedRate.value,
      height: currentHeight,
      transform: [
        {
          translateX: currentLayout.pageX * (1 - animatedRate.value),
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
      imageScale.value === 1
        ? Math.round(
            0xff * (1 - Math.abs(imageY.value) / screenDimensions.height) * (1 - closeRate.value),
          ).toString(16)
        : 'ff';
    opacity.length === 1 && (opacity = `0${opacity}`);
    return {
      backgroundColor: `#000000${opacity}`,
    };
  }, [screenDimensions.height]);

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
    (lastFinishInit = false) => {
      setSourceData(undefined);
      setLoading(false);
      setFinishInit(lastFinishInit);
      setAnimatedOver(false);
      showOriginalImage();
    },
    [showOriginalImage],
  );
  const onCloseMeasure = useCallback(
    (activeIndexValue: number) => {
      imageItemRef.current[activeIndexValue].current?.measure(
        (_x, _y, width, height, pageX, pageY) => {
          activeLayout.value = { width, height, pageX, pageY };
          setTimeout(() => {
            animatedRate.value = withTiming(1, undefined, (finished) => {
              finished && runOnJS(setAnimatedOver)(true);
            });
            closeRate.value = withTiming(1, undefined, (finished) => {
              if (finished) {
                runOnJS(onCloseFinish)(!!imageSize.value[data[activeIndex.value].key]);
                animatedRate.value = 0;
              }
            });
          }, 0);
        },
      );
    },
    [activeLayout, animatedRate],
  );
  const onClose = useWorkletCallback(() => {
    imageScale.value = withTiming(1);
    runOnJS(onCloseMeasure)(activeIndex.value);
    savedImageScale.value = 1;
    savedImageX.value = 0;
    savedImageY.value = 0;
  }, [data]);

  const onEndScalePan = useWorkletCallback(
    (event?: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      const currentWidthRange = (screenDimensions.width * (imageScale.value - 1)) / 2;
      const currentImageX = Math.min(currentWidthRange, Math.max(-currentWidthRange, imageX.value));
      if (currentImageX !== imageX.value) {
        imageX.value = withTiming(currentImageX);
        savedImageX.value = currentImageX;
      } else if (event?.velocityX) {
        const targetImageX = Math.min(
          currentWidthRange,
          Math.max(-currentWidthRange, imageX.value + (event.velocityX > 0 ? 30 : -30)),
        );
        savedImageX.value = targetImageX;
        imageX.value = withDecay({
          velocity: event.velocityX,
          clamp: [imageX.value, targetImageX],
        });
      }
      const currentImageSize = imageSize.value[data[activeIndex.value].key];
      const currentImageHeight =
        (screenDimensions.width * (currentImageSize.height || 1)) / (currentImageSize.width || 1);
      const currentHeightRange = Math.abs(
        (currentImageHeight * imageScale.value - screenDimensions.height) / 2,
      );
      const currentImageY = Math.min(
        currentHeightRange,
        Math.max(-currentHeightRange, imageY.value),
      );
      if (currentImageY !== imageY.value) {
        imageY.value = withTiming(currentImageY);
        savedImageY.value = currentImageY;
      } else if (event?.velocityY) {
        const targetImageY = Math.min(
          currentHeightRange,
          Math.max(-currentHeightRange, imageY.value + (event.velocityY > 0 ? 30 : -30)),
        );
        savedImageY.value = targetImageY;
        imageY.value = withDecay({
          velocity: event.velocityY,
          clamp: [imageY.value, targetImageY],
        });
      }
    },
    [screenDimensions.width, data],
  );

  const dragLastTime = useSharedValue(0);
  const imageDragGestureY = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(20)
        .onStart(() => {
          if (imageScale.value === 1) {
            runOnJS(hideOriginalImage)();
            dragLastTime.value = Date.now().valueOf();
          }
        })
        .onUpdate((event) => {
          if (imageScale.value !== 1) {
            imageX.value = savedImageX.value + event.translationX;
            imageY.value = savedImageY.value + event.translationY;
            return;
          }
          imageX.value = event.translationX;
          imageY.value = event.translationY;
        })
        .onEnd((event) => {
          if (imageScale.value !== 1) {
            onEndScalePan(event);
            return;
          }
          if (
            event.translationY < 100 &&
            (Date.now().valueOf() - dragLastTime.value > 500 || event.translationY <= 0)
          ) {
            imageX.value = withTiming(0);
            imageY.value = withTiming(0);
            showOriginalImage();
          } else {
            onClose();
          }
        }),
    [
      dragLastTime,
      imageScale,
      imageX,
      imageY,
      savedImageX,
      savedImageY,
      onEndScalePan,
      onClose,
      hideOriginalImage,
      showOriginalImage,
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
          if (imageScale.value !== 1) {
            imageX.value = savedImageX.value + event.translationX;
            imageY.value = savedImageY.value + event.translationY;
            return;
          }
          imageX.value =
            event.translationX *
            ((event.translationX < 0 ? activeIndex.value < data.length - 1 : activeIndex.value > 0)
              ? 1
              : 0.4);
        })
        .onEnd((event) => {
          if (imageScale.value !== 1) {
            onEndScalePan(event);
            return;
          }
          if (
            (event.translationX < 0
              ? activeIndex.value < data.length - 1
              : activeIndex.value > 0) &&
            (Date.now().valueOf() - dragLastTime.value < 500 ||
              Math.abs(event.translationX) > screenDimensions.width / 2)
          ) {
            imageX.value = withTiming(
              (screenDimensions.width + IMAGE_SPACE) * (event.translationX < 0 ? -1 : 1),
              undefined,
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
    [
      dragLastTime,
      imageScale,
      imageX,
      activeIndex,
      data.length,
      savedImageX,
      imageY,
      savedImageY,
      screenDimensions.width,
      onEndScalePan,
      _onChange,
    ],
  );
  const resetScale = useWorkletCallback(() => {
    imageScale.value = withTiming(1);
    imageX.value = withTiming(0);
    imageY.value = withTiming(0);
    savedImageScale.value = 1;
    savedImageX.value = 0;
    savedImageY.value = 0;
  }, []);
  const imageSingleTapGesture = useMemo(
    () =>
      Gesture.Tap().onStart(() => {
        if (imageScale.value === 1) {
          runOnJS(hideOriginalImage)();
        }
        onClose();
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
            imageScale.value = withTiming(3);
            savedImageScale.value = 3;
            const currentX = (screenDimensions.width / 2 - event.x) * 3;
            imageX.value = withTiming(currentX);
            savedImageX.value = currentX;
            const currentY = (screenDimensions.height / 2 - event.y) * 3;
            imageY.value = withTiming(currentY);
            savedImageY.value = currentY;
          }
        }),
    [resetScale, imageScale],
  );
  const imageTapGesture = useMemo(
    () => Gesture.Exclusive(imageDoubleTapGesture, imageSingleTapGesture),
    [imageDoubleTapGesture, imageSingleTapGesture],
  );
  const pinchPosition = useSharedValue({ x: 0, y: 0 });
  const imagePinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((event) => {
          pinchPosition.value = { x: event.focalX, y: event.focalY };
        })
        .onUpdate((event) => {
          imageScale.value = savedImageScale.value * event.scale;
          imageX.value =
            (screenDimensions.width / 2 - pinchPosition.value.x) *
              (imageScale.value - savedImageScale.value) +
            savedImageX.value * event.scale;
          imageY.value =
            (screenDimensions.height / 2 - pinchPosition.value.y) *
              (imageScale.value - savedImageScale.value) +
            savedImageY.value * event.scale;
        })
        .onEnd(() => {
          const currentScale = Math.max(1, imageScale.value);
          if (currentScale === 1) {
            resetScale();
          } else {
            imageScale.value = withTiming(currentScale);
            savedImageScale.value = currentScale;
            savedImageY.value = imageY.value;
            savedImageX.value = imageX.value;
          }
        }),
    [imageScale, savedImageScale, imageX, imageY, savedImageY, savedImageX, resetScale],
  );
  const imageLongPressGesture = useMemo(
    () =>
      Gesture.LongPress().onStart(() => {
        if (onLongPress) {
          runOnJS(onLongPress)({ index: activeIndex.value, item: data[activeIndex.value] });
        }
      }),
    [onLongPress, data],
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

  useEffect(() => {
    const currentData = data[activeIndexState!];
    const currentKey = currentData?.key;
    const currentUri = currentData?.source?.uri;
    if (!currentKey || imageSize.value[currentKey] || !currentUri) {
      return;
    }
    setLoading(true);
  }, [activeIndexState, imageSize, data]);

  useImperativeHandle(ref, () => ({
    init: ({ itemRef, index }) => {
      imageItemRef.current[index] = itemRef;
    },
    show: ({ index, source }) => {
      const _screenDimensions = Dimensions.get('screen');
      imageY.value = 0;
      imageX.value = 0;
      closeRate.value = 0;
      activeIndex.value = index;
      setActiveIndexState(index);
      setSourceData(source);
      const startShow = () => {
        imageItemRef.current[index].current?.measure((_x, _y, width, height, pageX, pageY) => {
          activeLayout.value = { width, height, pageX, pageY };
          setTimeout(() => {
            animatedRate.value = withTiming(1, undefined, (finished) => {
              finished && runOnJS(setAnimatedOver)(true);
            });
          }, 0);
        });
      };
      Image.getSize(
        source.uri || '',
        (width, height) => {
          originalImageSize.value = { width, height };
          startShow();
        },
        () => {
          originalImageSize.value = _screenDimensions;
          startShow();
        },
      );
    },
  }));

  return (
    <Modal visible={!!activeSource} animationType="fade" transparent onRequestClose={onClose}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <GestureHandlerRootView style={styles.full}>
        {activeSource ? (
          <>
            <GestureDetector gesture={imageGesture}>
              <Animated.View style={[styles.animatedContainer, imageContainerStyle]}>
                {Array.from(new Array(3)).map((_, index) => {
                  if (!animatedOver && !activeIndexState) {
                    return null;
                  }
                  const relativeActiveIndex = ((activeIndexState! % 3) + 3) % 3;
                  const currentIndex =
                    Math.floor(activeIndexState! / 3) * 3 +
                    (relativeActiveIndex > index && activeIndexState! > 0
                      ? 3
                      : relativeActiveIndex <= index && activeIndexState! < 0
                      ? -3
                      : 0) +
                    index -
                    1;
                  if (currentIndex < 0 || currentIndex >= data.length) {
                    return null;
                  }
                  const currentData = data[currentIndex];
                  return (
                    <Animated.Image
                      key={`image-viewer-${currentIndex}`}
                      resizeMode={imageResizeMode}
                      source={
                        typeof currentData.source === 'object'
                          ? { ...currentData.source }
                          : currentData.source
                      }
                      onLoad={({ nativeEvent: { source } }) => {
                        imageSize.value = { ...imageSize.value, [currentData.key]: source };
                        setLoading(false);
                        setFinishInit(true);
                      }}
                      style={[styles.absolute, imageStyleList[index]]}
                    />
                  );
                })}
                {loading ? (
                  <ActivityIndicator
                    style={[StyleSheet.absoluteFill, styles.loading]}
                    color="#fff"
                  />
                ) : null}
              </Animated.View>
            </GestureDetector>
            {!animatedOver || !finishInit ? (
              <TouchableOpacity
                style={[StyleSheet.absoluteFill, styles.animatedContainer]}
                onPress={() => onCloseFinish()}
              >
                <Animated.Image
                  source={typeof activeSource === 'object' ? { ...activeSource } : activeSource}
                  resizeMode="contain"
                  style={[styles.absolute, originalImageStyle]}
                />
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
        {renderCustomComponent?.({ item: data[activeIndexState!], index: activeIndexState! })}
      </GestureHandlerRootView>
    </Modal>
  );
});

export default memo(ImageViewer);
