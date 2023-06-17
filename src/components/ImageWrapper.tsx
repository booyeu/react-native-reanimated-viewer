import React, { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity, ImageURISource, ViewStyle, ViewProps } from 'react-native';
import { ImageViewerRef } from './ImageViewer';

export type ImageWrapperType = {
  viewerRef: MutableRefObject<ImageViewerRef | null>;
  index: number;
  source: ImageURISource;
  onPress?: () => boolean | void;
  viewProps?: ViewProps;
  children?: React.ReactNode;
  style?: ViewStyle;
};

const ImageWrapper = (props: ImageWrapperType) => {
  const { viewerRef, index, children, source, style, onPress, viewProps } = props;
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
      {...viewProps}
      ref={containerRef}
      onPress={_onPress}
      style={[{ alignSelf: 'flex-start' }, style]}
    >
      {children}
    </TouchableOpacity>
  );
};

export default React.memo(ImageWrapper);
