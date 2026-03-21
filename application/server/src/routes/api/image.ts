import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import { fileTypeFromBuffer } from "file-type";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// 変換した画像の拡張子
const EXTENSION = "jpg";

export const imageRouter = Router();

imageRouter.post("/images", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  const type = await fileTypeFromBuffer(req.body);
  if (type === undefined || type.ext !== EXTENSION) {
    throw new httpErrors.BadRequest("Invalid file type");
  }

  const imageId = uuidv4();

  const filePath = path.resolve(UPLOAD_PATH, `./images/${imageId}.${EXTENSION}`);
  await fs.mkdir(path.resolve(UPLOAD_PATH, "images"), { recursive: true });

  // sharp を使用してリサイズと圧縮
  // withMetadata() を呼ぶことで EXIF 情報（ALT説明など）を保持する
  const resizedBuffer = await sharp(req.body)
    .resize({
      fit: "inside",
      width: 1080,
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .withMetadata()
    .toBuffer();

  await fs.writeFile(filePath, resizedBuffer);

  return res.status(200).type("application/json").send({ id: imageId });
});
