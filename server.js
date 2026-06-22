import "dotenv/config";

import express from "express";
import sharp from "sharp";
import beeQueue from "bee-queue";

const app = express();

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const queue = new beeQueue("default");

const port = process.env.PORT | 3000;

async function resizeToTargetFileSize(
  inputBuffer,
  targetBytes,
  percentage = 90,
  quality = 90,
) {
  const image = sharp(inputBuffer).rotate();

  let outputBuffer = await image.jpeg({ quality }).toBuffer();

  if (outputBuffer.byteLength <= targetBytes) {
    return outputBuffer;
  }

  const metadata = await sharp(outputBuffer).metadata();

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

async function uploadAttachment(appUrl, tableId, appId, appKey, imageBuffer) {
  const form = new FormData();
  form.append("file", new Blob([imageBuffer]), "Foto.jpg");

  const optionsForUpload = {
    method: "POST",
    headers: {
      "x-budibase-app-id": appId,
      "x-budibase-api-key": appKey,
    },
    body: form,
  };

  return await (
    await fetch(`${appUrl}/api/attachments/${tableId}/upload`, {
      ...optionsForUpload,
    })
  ).json();
}

async function updateRecord(
  appUrl,
  tableId,
  appId,
  appKey,
  recordId,
  uploadedFile,
) {
  const optionsForUpdateRow = {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-budibase-app-id": appId,
      "x-budibase-api-key": appKey,
    },
    body: JSON.stringify({
      _id: recordId,
      tableId: tableId,
      type: "row",
      Foto: uploadedFile[0],
    }),
  };

  var updatedRow = await (
    await fetch(`${appUrl}/api/public/v1/tables/${tableId}/rows/${recordId}`, {
      ...optionsForUpdateRow,
    })
  ).json();

  return updatedRow;
}

app.post("/compress", async (req, res) => {
  const { appKey, recordId, imageUrl } = req.body;

  try {
    const job = queue.createJob({
      appKey,
      recordId,
      imageUrl,
    });

    await job.save();

    console.log(`(${job.id}) Trabalho enfileirado.`);

    res.json({
      success: true,
      jobId: job.id,
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

queue.process(async function (job, done) {
  console.log(`(${job.id}) Comprimindo a imagem...`);

  try {
    const appUrl = new URL(job.data.imageUrl).origin;
    let appId = job.data.imageUrl.split("/")[6];
    const tableId = `ta_${job.data.recordId.split("_")[2]}`;

    if (process.env.DEVELOPMENT) {
      appId = appId.replace("_", "_dev_");
    }

    const response = await fetch(job.data.imageUrl);
    const fileBlob = await (await response.blob()).arrayBuffer();

    const halfMegabyte = 500 * 1024; //500kb

    const bufferOut = await resizeToTargetFileSize(fileBlob, halfMegabyte);

    console.log(`(${job.id}) Upload do anexo...`);

    var uploadedFile = await uploadAttachment(
      appUrl,
      tableId,
      appId,
      job.data.appKey,
      bufferOut,
    );

    console.log(`(${job.id}) Atualizando o registro...`);

    await updateRecord(
      appUrl,
      tableId,
      appId,
      job.data.appKey,
      job.data.recordId,
      uploadedFile,
    );

    console.log(`(${job.id}) Imagem comprimida com sucesso!`);
  } catch (err) {
    console.error(
      `(${job.id}) Erro ao processar trabalho: `,
      JSON.stringify(err),
    );
  }

  return done();
});
