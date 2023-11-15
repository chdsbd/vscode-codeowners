# Images

## Converting videos to gifs

VSCode Marketplace doesn't support videos in README.md, so we need to convert to gifs.

[Gifski](https://github.com/ImageOptim/gifski) works well for converting videos to small gifs.

```bash
brew install gifski

ffmpeg -i video.mov frames/frame%04d.png
gifski -o anim.gif frames/frame*.png
```

## Embedding images in README.md

When embedding images, specify the height and width to be 1/2 the actual dimensions. This makes the images less blurry on high resolution displays.

If an image is 816 × 370, specify the height and width to be 408x185.
