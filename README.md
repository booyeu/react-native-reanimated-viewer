# react-native-reanimated-viewer [![Monthly download](https://img.shields.io/npm/dm/react-native-reanimated-viewer.svg)](https://img.shields.io/npm/dm/react-native-reanimated-viewer.svg) [![Total downloads](https://img.shields.io/npm/dt/react-native-reanimated-viewer.svg)](https://img.shields.io/npm/dt/react-native-reanimated-viewer.svg)

## Install
```bash
npm install react-native-reanimated-viewer react-native-reanimated react-native-gesture-handler --save
cd ios & pod install
```
Then you need follow the extra steps to finish the installation: [react-native-reanimated](https://github.com/software-mansion/react-native-reanimated) & [react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler).

## Example
![example](https://github.com/BooYeu/react-native-reanimated-viewer/blob/main/example/example.gif?raw=true)
```javascript
import React, {memo, useRef, useMemo} from 'react';
import {View, Image} from 'react-native';
import {ImageWrapper, ImageViewer} from 'react-native-reanimated-viewer';
const ImageViewerPage = () => {
  const imageRef = useRef(null);
  const mockData = useMemo(
    () => [
      {
        smallUrl:
          'https://img2.baidu.com/it/u=1835117106,152654887&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=556',
        url: 'https://img2.baidu.com/it/u=1835117106,152654887&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=556',
      },
      {
        smallUrl: 'https://img1.baidu.com/it/u=139191814,3489949748&fm=253&fmt=auto&app=138&f=JPEG?w=491&h=491',
        url: 'https://img1.baidu.com/it/u=139191814,3489949748&fm=253&fmt=auto&app=138&f=JPEG?w=491&h=491',
      },
      {
        smallUrl: 'https://img0.baidu.com/it/u=2926715223,1445444764&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500',
        url: 'https://img0.baidu.com/it/u=2926715223,1445444764&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500',
      },
    ],
    [],
  );
  return (
    <>
      <ImageViewer
        ref={imageRef}
        data={mockData.map(el => ({ url: el.url }))}
      />
      <View style={{flexDirection: 'row'}}>
        {mockData.map((el, index) => (
          <ImageWrapper
            key={el.smallUrl}
            viewerRef={imageRef}
            index={index}
            source={{
              uri: el.smallUrl,
            }}>
            <Image
              source={{
                uri: el.smallUrl,
              }}
              style={{width: 100, height: 100}}
            />
          </ImageWrapper>
        ))}
      </View>
    </>
  )
}
export default memo(ImageViewerPage);
```

## Notice
You need to wrap your image components used by ImageWrapper in this package.

## Props
### ImageViewer
| name                  | required | type                                                             | default   | description                       | Example                                                  |
|-----------------------|----------|------------------------------------------------------------------|-----------|-----------------------------------|----------------------------------------------------------|
| data                  | true     | ```{url: string}[]```                                            | undefined | The original url of image         | ```[{url:'http://***.***/***.png'}]```                   |
| renderCustomComponent | false    | ```(_: {item: {url: string}; index: number;}) => ReactElement``` | undefined | The custom Element in ImageViewer | ```({index}) => <Text>current index is {index}</Text>``` |
### ImageWrapper
| name      | required | type                                   | default   | description                       | Example                                                  |
|-----------|----------|----------------------------------------|-----------|-----------------------------------|----------------------------------------------------------|
| viewerRef | true     | ```MutableRefObject<ImageViewerRef>``` | undefined | The ref of imageViewer            | ```[{url:'http://***.***/***.png'}]```                   |
| index     | true     | ```number```                           | undefined | The index of current ImageWrapper | ```({index}) => <Text>current index is {index}</Text>``` |
| source    | true     | ```ImageURISource```                   | undefined | The inner component image's url   | ```{uri: 'https://***.***/***.png'}```                   |
| style     | false    | ```ViewStyle```                        | undefined | The style of image wrapper        | ```{margin: 10}```                                       |
