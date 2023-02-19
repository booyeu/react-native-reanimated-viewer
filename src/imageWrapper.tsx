import React, { memo, MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity, ImageURISource, ViewStyle } from 'react-native';
import { ImageViewerRef } from './imageViewer';

export type ImageWrapperType = {
  viewerRef: MutableRefObject<ImageViewerRef>;
  index: number;
  source: ImageURISource;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
};

const ImageWrapper = (props: ImageWrapperType) => {
  const { viewerRef, index, children, source, style, onPress } = props;
  const containerRef = useRef<TouchableOpacity>(null);

  const _onPress = useCallback(() => {
    onPress?.();
    viewerRef.current.show({
      index,
      source,
    });
  }, [index, source, viewerRef, onPress]);

  useEffect(() => {
    viewerRef.current?.init({ itemRef: containerRef, index });
  }, [index, viewerRef]);

  return (
    <TouchableOpacity
      ref={containerRef}
      activeOpacity={1}
      onPress={_onPress}
      style={[{ alignSelf: 'flex-start' }, style]}
    >
      {children}
    </TouchableOpacity>
  );
};

export default memo(ImageWrapper);
