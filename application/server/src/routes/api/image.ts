import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import { fileTypeFromBuffer } from "file-type";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// サーバー側で保存・配信する標準の拡張子
const TARGET_EXTENSION = "webp";

export const imageRouter = Router();

imageRouter.get("/images/:id/thumbnail", async (req, res) => {
  const { id } = req.params;
  const originalFileName = `./images/${id}.${TARGET_EXTENSION}`;
  const thumbFileName = `./thumbnails/${id}.webp`;
  const uploadPath = path.resolve(UPLOAD_PATH, originalFileName);
  const publicPath = path.resolve(PUBLIC_PATH, originalFileName);
  const cachePath = path.resolve(UPLOAD_PATH, thumbFileName);

  try {
    // 1. キャッシュ確認
    try {
      await fs.access(cachePath);
      return res.type("image/webp").sendFile(cachePath);
    } catch {}

    // 2. オリジナル確認
    let filePath: string;
    try {
      await fs.access(uploadPath);
      filePath = uploadPath;
    } catch {
      await fs.access(publicPath);
      filePath = publicPath;
    }

    // 3. サムネイル生成
    const buffer = await fs.readFile(filePath);
    const thumbnail = await sharp(buffer)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    // 4. キャッシュ保存
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, thumbnail);

    res.type("image/webp").send(thumbnail);
  } catch (error) {
    throw new httpErrors.NotFound();
  }
});

imageRouter.post("/images", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  const type = await fileTypeFromBuffer(req.body);
  // jpg, png, webp など画像であれば受け入れる
  if (type === undefined || !type.mime.startsWith("image/")) {
    throw new httpErrors.BadRequest("Invalid file type. Only images are allowed.");
  }

  const imageId = uuidv4();

  const filePath = path.resolve(UPLOAD_PATH, `./images/${imageId}.${TARGET_EXTENSION}`);
  await fs.mkdir(path.resolve(UPLOAD_PATH, "images"), { recursive: true });

  // sharp を使用してリサイズと WebP 変換
  const resizedBuffer = await sharp(req.body)
    .resize({
      fit: "inside",
      width: 1080,
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .withMetadata()
    .toBuffer();

  await fs.writeFile(filePath, resizedBuffer);

  return res.status(200).type("application/json").send({ id: imageId });
});
