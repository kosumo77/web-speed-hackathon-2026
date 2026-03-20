import { dump, insert, ImageIFD } from "piexifjs";

interface Options {
  extension: any;
}

export async function convertImage(file: File, options: Options): Promise<Blob> {
  // 動的インポート
  const [
    { initializeImageMagick, ImageMagick },
    { default: magickWasmURL }
  ] = await Promise.all([
    import("@imagemagick/magick-wasm"),
    import("@imagemagick/magick-wasm/magick.wasm?binary")
  ]);

  // WASMファイルを直接fetchして、レスポンスから初期化（メモリ消費を抑える）
  const response = await fetch(magickWasmURL);
  const wasmBytes = new Uint8Array(await response.arrayBuffer());
  await initializeImageMagick(wasmBytes);

  const byteArray = new Uint8Array(await file.arrayBuffer());

  return new Promise((resolve) => {
    ImageMagick.read(byteArray, (img) => {
      img.format = options.extension;

      const comment = img.comment;

      img.write((output) => {
        if (comment == null) {
          resolve(new Blob([output as Uint8Array<ArrayBuffer>]));
          return;
        }

        // ImageMagick では EXIF の ImageDescription フィールドに保存されている データが
        // 非標準の Comment フィールドに移されてしまうため
        // piexifjs を使って ImageDescription フィールドに書き込む
        const binary = Array.from(output as Uint8Array<ArrayBuffer>)
          .map((b) => String.fromCharCode(b))
          .join("");
        const descriptionBinary = Array.from(new TextEncoder().encode(comment))
          .map((b) => String.fromCharCode(b))
          .join("");
        const exifStr = dump({ "0th": { [ImageIFD.ImageDescription]: descriptionBinary } });
        const outputWithExif = insert(exifStr, binary);
        const bytes = Uint8Array.from(outputWithExif.split("").map((c) => c.charCodeAt(0)));
        resolve(new Blob([bytes]));
      });
    });
  });
}
