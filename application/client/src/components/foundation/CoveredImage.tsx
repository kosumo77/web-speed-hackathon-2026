import classNames from "classnames";
import { Buffer } from "buffer";
import { load, ImageIFD } from "piexifjs";
import { MouseEvent, useCallback, useId, useMemo, useState } from "react";

import { Button } from "@web-speed-hackathon-2026/client/src/components/foundation/Button";
import { Modal } from "@web-speed-hackathon-2026/client/src/components/modal/Modal";
import { useFetch } from "@web-speed-hackathon-2026/client/src/hooks/use_fetch";

interface Props {
  src: string;
  alt?: string;
  isLcpElement?: boolean;
}

/**
 * 最初の 64KB だけをフェッチして EXIF 情報を取得するためのフェッチャー
 */
async function fetchPartialBinary(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      Range: "bytes=0-65535",
    },
  });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  return await response.arrayBuffer();
}

/**
 * アスペクト比を維持したまま、要素のコンテンツボックス全体を埋めるように画像を拡大縮小します
 */
export const CoveredImage = ({ src, alt: propsAlt = "", isLcpElement = false }: Props) => {
  const dialogId = useId();
  const [isLoaded, setIsLoaded] = useState(false);

  // propsAlt が空の場合、EXIF から alt を取得するために部分フェッチを行う
  // ただし LCP 要素の場合は画像本体のロードを最優先するため、EXIF 取得をスキップする
  const shouldFetchExif = !propsAlt && !isLcpElement;
  const { data: partialData } = useFetch(shouldFetchExif ? src : "", fetchPartialBinary);

  const exifAlt = useMemo(() => {
    if (!partialData) return "";
    try {
      const exif = load(Buffer.from(partialData).toString("binary"));
      const raw = exif?.["0th"]?.[ImageIFD.ImageDescription];
      return raw != null ? new TextDecoder().decode(Buffer.from(raw, "binary")) : "";
    } catch (e) {
      console.error("Failed to parse EXIF", e);
      return "";
    }
  }, [partialData]);

  const finalAlt = propsAlt || exifAlt;

  // ダイアログの背景をクリックしたときに投稿詳細ページに遷移しないようにする
  const handleDialogClick = useCallback((ev: MouseEvent<HTMLDialogElement>) => {
    ev.stopPropagation();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-cax-surface-subtle">
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-cax-surface-subtle" />
      )}
      <img
        alt={finalAlt}
        className={classNames("h-full w-full object-cover transition-opacity duration-300", {
          "opacity-0": !isLoaded,
          "opacity-100": isLoaded,
        })}
        loading={isLcpElement ? "eager" : "lazy"}
        onLoad={handleLoad}
        src={src}
      />

      {finalAlt && (
        <button
          className="border-cax-border bg-cax-surface-raised/90 text-cax-text-muted hover:bg-cax-surface absolute right-1 bottom-1 rounded-full border px-2 py-1 text-center text-xs"
          type="button"
          command="show-modal"
          commandfor={dialogId}
        >
          ALT を表示する
        </button>
      )}

      <Modal id={dialogId} closedby="any" onClick={handleDialogClick}>
        <div className="grid gap-y-6">
          <h1 className="text-center text-2xl font-bold">画像の説明</h1>

          <p className="text-sm">{finalAlt}</p>

          <Button variant="secondary" command="close" commandfor={dialogId}>
            閉じる
          </Button>
        </div>
      </Modal>
    </div>
  );
};
