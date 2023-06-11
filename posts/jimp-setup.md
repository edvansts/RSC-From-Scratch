# Here is who we get started with Jimp package

```js
  import Jimp from "jimp";

  ...

  const readedImage = await Jimp.read(props.src);
  const imageBase64 = await readedImage.getBase64Async(Jimp.MIME_PNG);
```

!["JIMP logo"](./assets/JIMP_logo.png "Jimp logo")
