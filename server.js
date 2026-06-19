const express = require("express");

const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const port = process.env.PORT | 3000;

async function resizeToTargetFileSize(
  inputBuffer,
  targetBytes,
  percentage = 90,
  quality = 90,
) {
  const sharp = require("sharp");

  const image = sharp(inputBuffer);

  let outputBuffer = await image.jpeg({ quality }).toBuffer();

  if (outputBuffer.byteLength <= targetBytes) {
    return outputBuffer;
  }

  const metadata = await image.metadata();

  const targetWidth = Math.round(metadata.width * (percentage / 100));
  const targetHeight = Math.round(metadata.height * (percentage / 100));

  outputBuffer = await image
    .jpeg({ quality })
    .resize(targetWidth, targetHeight)
    .toBuffer();

  if (outputBuffer.byteLength <= targetBytes) {
    return outputBuffer;
  }

  return resizeToTargetFileSize(
    inputBuffer,
    targetBytes,
    percentage - 5,
    quality - 5,
  );
}

app.post("/compress", async (req, res) => {
  const { filename, image_url } = req.body;

  try {
    const response = await fetch(image_url);
    const fileBlob = await (await response.blob()).arrayBuffer();

    const halfMegabyte = 500 * 1024; //500kb

    const bufferOut = await resizeToTargetFileSize(fileBlob, halfMegabyte);

    res.json({
      success: true,
      data: bufferOut.toString("base64"),
    });
  } catch (err) {
    console.error(err);

    res.json({
      success: false,
      error: err,
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`);
});
