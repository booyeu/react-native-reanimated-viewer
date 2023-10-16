import React, { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  ImageURISource,
  ViewStyle,
  TouchableOpacityProps,
  StyleProp,
} from 'react-native';
import { ImageViewerRef } from './ImageViewer';

export type ImageWrapperType = {
  viewerRef: MutableRefObject<ImageViewerRef | null>;
  index: number;
  source?: ImageURISource;
  onPress?: () => boolean | void;
  wrapperProps?: TouchableOpacityProps;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const ImageWrapper = (props: ImageWrapperType) => {
  const { viewerRef, index, children, source, style, onPress, wrapperProps } = props;
  const containerRef = useRef<TouchableOpacity>(null);

  const _onPress = useCallback(() => {
    if (onPress?.() === false) {
      return;
    }
    viewerRef.current?.show({
      index,
      source,
    });
  }, [index, source, viewerRef, onPress]);

  useEffect(() => {
    viewerRef.current?.init({ itemRef: containerRef, index });
  }, [index, viewerRef]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={_onPress}
      {...wrapperProps}
      ref={containerRef}
      style={[{ alignSelf: 'flex-start' }, style]}
    >
      {children}
    </TouchableOpacity>
  );
};

export default React.memo(ImageWrapper);
