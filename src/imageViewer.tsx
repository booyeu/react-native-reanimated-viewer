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
  View,
  Image,
  TouchableOpacity,
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
} from 'react-native-gesture-handler';
import { useStateRef } from 'react-hooks-extension';

export type ImageViewerItemData = {
  url: string;
};
export type ImageViewerProps = {
  data: ImageViewerItemData[];
  onLongPress?: (_: { item: ImageViewerItemData; index: number }) => void;
  renderCustomComponent?: (_: { item: ImageViewerItemData; index: number }) => ReactElement;
};
type LayoutData = { width: number; height: number; pageX: number; pageY: number };
export type ImageViewerRef = {
  show: (_: { index: number; source: ImageURISource }) => void;
  init: (_: { index: number; itemRef: RefObject<TouchableOpacity> }) => void;
};

const IMAGE_SPACE = 20;

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
  animatedContainer: {
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
  },
});

const ImageViewer = forwardRef<ImageViewerRef, ImageViewerProps>((props, ref) => {
  const screenDimensions = Dimensions.get('screen');

  const { data, renderCustomComponent, onLongPress } = props;
  const imageItemRef = useRef<RefObject<TouchableOpacity>[]>([]);
  const originalImageSize = useRef<{ width?: number; height?: number }>();

  const [activeSource, setSourceData] = useState<ImageURISource>();
  const activeLayout = useSharedValue<LayoutData | undefined>(undefined);
  const [animatedOver, setAnimatedOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [finishInit, setFinishInit] = useState(false);

  const onFinishImage = useCallback(() => {
    setFinishInit(true);
    setLoading(false);
  }, []);

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
      if (!data[currentIndex]?.url) {
        return {};
      }
      const currentImageSize = imageSizeValue[data[currentIndex].url];
      const currentHeight =
        ((currentImageSize?.height || 1) * screenDimensions.width) / (currentImageSize?.width || 1);
      const changeHeight =
        (((currentOriginalImageSize?.height || 0) - screenDimensions.height) *
          (imageScaleValue === 1 ? imageYValue : 1)) /
        imageScaleValue /
        screenDimensions.height;
      const manualWidth = Math.min(
        screenDimensions.width,
        screenDimensions.width +
          (changeHeight * (currentImageSize?.width || 1)) / (currentImageSize?.height || 1),
      );
      const manualHeight = Math.min(currentHeight, currentHeight + changeHeight);
      const manualTop =
        (screenDimensions.height - currentHeight) / 2 + imageYValue / imageScaleValue;
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
              ((activeLayoutValue?.pageX || 0) - manualLeft) * closeRateValue +
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
            translateY: manualTop + ((activeLayoutValue?.pageY || 0) - manualTop) * closeRateValue,
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
        originalImageSize.current,
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
        originalImageSize.current,
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
        originalImageSize.current,
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
      ((screenDimensions.width * (originalImageSize.current?.height || 1)) /
        (originalImageSize.current?.width || 1) -
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
    (lastFinishInit: boolean) => {
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
          }, 0);
        },
      );
    },
    [activeLayout, animatedRate],
  );
  const onClose = useWorkletCallback(() => {
    runOnJS(onCloseMeasure)(activeIndex.value);
    imageScale.value = 1;
    savedImageScale.value = 1;
    closeRate.value = withTiming(1, undefined, (finished) => {
      if (finished) {
        runOnJS(onCloseFinish)(!!imageSize.value[data[activeIndex.value].url]);
        animatedRate.value = 0;
      }
    });
  }, [data]);

  const onEndScalePanInnerX = useWorkletCallback(() => {
    const currentWidthRange = (screenDimensions.width * (imageScale.value - 1)) / 2;
    const currentImageX = Math.min(currentWidthRange, Math.max(-currentWidthRange, imageX.value));
    if (currentImageX !== imageX.value) {
      imageX.value = withTiming(currentImageX);
    }
    savedImageX.value = currentImageX;
  }, []);
  const onEndScalePanInnerY = useWorkletCallback(() => {
    const currentImageSize = imageSize.value[data[activeIndex.value].url];
    const currentImageHeight =
      (screenDimensions.width * (currentImageSize.height || 1)) / (currentImageSize.width || 1);
    const initY = (currentImageHeight - screenDimensions.height) / 2;
    const extraHeight = screenDimensions.height - currentImageHeight * imageScale.value + initY;
    const currentImageY = Math.min(
      extraHeight,
      Math.max(Math.min(initY, extraHeight), imageY.value),
    );
    if (currentImageY !== imageY.value) {
      imageY.value = withTiming(currentImageY);
    }
    savedImageY.value = currentImageY;
  }, []);
  const onEndScalePan = useWorkletCallback(
    (event?: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      if (event) {
        imageX.value = withDecay(
          {
            velocity: event.velocityX,
            clamp: [imageX.value, imageX.value + (event.velocityX > 0 ? 30 : -30)],
          },
          onEndScalePanInnerX,
        );
        imageY.value = withDecay(
          {
            velocity: event.velocityY,
            clamp: [imageY.value, imageY.value + (event.velocityY > 0 ? 30 : -30)],
          },
          onEndScalePanInnerY,
        );
      } else {
        onEndScalePanInnerX();
        onEndScalePanInnerY();
      }
    },
    [screenDimensions.width, data],
  );

  const dragLastTime = useSharedValue(0);
  const imageDragGestureY = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(1)
        .onStart(() => {
          if (imageScale.value === 1) {
            runOnJS(hideOriginalImage)();
          }
          dragLastTime.value = Date.now().valueOf();
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
  const imageDragGestureX = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-1, 1])
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
                runOnJS(setActiveIndexState)(activeIndex.value);
              },
            );
          } else {
            imageX.value = withTiming(0);
          }
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
      setActiveIndexState,
    ],
  );
  const imageTapGesture = useMemo(
    () =>
      Gesture.Tap().onStart(() => {
        if (imageScale.value === 1) {
          runOnJS(hideOriginalImage)();
        }
        onClose();
      }),
    [onClose, hideOriginalImage, imageScale],
  );
  const imagePinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          imageScale.value = savedImageScale.value * event.scale;
        })
        .onEnd(() => {
          imageScale.value = withTiming(Math.max(1, imageScale.value), undefined, () => {
            savedImageScale.value = imageScale.value;
            if (imageScale.value === 1) {
              imageX.value = 0;
              imageY.value = 0;
              savedImageX.value = 0;
              savedImageY.value = 0;
            } else {
              onEndScalePan();
            }
          });
        }),
    [imageScale, savedImageScale, imageX, imageY, savedImageY, savedImageX, onEndScalePan],
  );
  const imagePinchPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enableTrackpadTwoFingerGesture(true)
        .minPointers(2)
        .onUpdate((event) => {
          imageX.value = savedImageX.value + event.translationX;
          imageY.value = savedImageY.value + event.translationY;
        })
        .onEnd(() => {
          savedImageX.value = imageX.value;
          savedImageY.value = imageY.value;
        }),
    [imageX, imageY, savedImageX, savedImageY],
  );
  const imagePinchComposedGesture = Gesture.Simultaneous(imagePinchGesture, imagePinchPanGesture);
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
        imagePinchComposedGesture,
        imageLongPressGesture,
      ),
    [
      imageDragGestureY,
      imageDragGestureX,
      imageTapGesture,
      imagePinchComposedGesture,
      imageLongPressGesture,
    ],
  );

  useEffect(() => {
    const currentUrl = data[activeIndexState!].url;
    if (imageSize.value[currentUrl]) {
      return;
    }
    setLoading(true);
    Image.getSize(currentUrl, (width, height) => {
      imageSize.value = { ...imageSize.value, [currentUrl]: { width, height } };
    });
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
      originalImageSize.current = _screenDimensions;
      if (source.width && source.height) {
        originalImageSize.current = source;
        startShow();
      } else {
        Image.getSize(
          source.uri || '',
          (width, height) => {
            originalImageSize.current = { width, height };
            startShow();
          },
          startShow,
        );
      }
    },
  }));

  return (
    <Modal visible={!!activeSource} animationType="fade" transparent onRequestClose={onClose}>
      {activeSource ? (
        <>
          <GestureDetector gesture={imageGesture}>
            <Animated.View
              style={[
                styles.animatedContainer,
                { opacity: animatedOver && finishInit ? 1 : 0 },
                imageContainerStyle,
              ]}
            >
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
                return (
                  <Animated.Image
                    key={`image-viewer-${currentIndex}`}
                    source={{
                      uri: data[currentIndex]?.url,
                    }}
                    onLoadEnd={onFinishImage}
                    style={[styles.absolute, imageStyleList[index]]}
                  />
                );
              })}
            </Animated.View>
          </GestureDetector>
          {!animatedOver || !finishInit ? (
            <View style={[StyleSheet.absoluteFill, styles.animatedContainer]}>
              <Animated.Image source={activeSource} style={[styles.absolute, originalImageStyle]} />
            </View>
          ) : null}
          {loading ? <ActivityIndicator color="#fff" /> : null}
        </>
      ) : null}
      {renderCustomComponent?.({ item: data[activeIndexState!], index: activeIndexState! })}
    </Modal>
  );
});

export default memo(ImageViewer);
