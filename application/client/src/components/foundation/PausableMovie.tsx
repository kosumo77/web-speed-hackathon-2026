import classNames from "classnames";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMoviePath, getMoviePreviewPath } from "@web-speed-hackathon-2026/client/src/utils/get_path";

interface Props {
  movieId: string;
}

/**
 * 動画を MP4 最適化して表示します。
 * 画面内に入るとフル解像度版を裏でプリロードし、クリック時に即座に切り替えます。
 */
export const PausableMovie = ({ movieId }: Props) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const previewSrc = getMoviePreviewPath(movieId);
  const videoSrc = getMoviePath(movieId);

  // 画面内に入ったかどうかを監視
  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          // 一度見えたらプリロードを開始するので、監視を止めても良い（または継続）
          observer.unobserve(target);
        }
      },
      { rootMargin: "200px" } // 画面に入る少し前から準備開始
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFocused) {
      // プリロードが効いていれば、ここで setIsLoaded(false) にしても一瞬でロードが終わる
      setIsLoaded(false); 
      setIsFocused(true);
    }
  }, [isFocused]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-pointer overflow-hidden bg-cax-surface-subtle"
      onClick={handleClick}
      style={{ aspectRatio: "1 / 1" }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-cax-surface-subtle" />
      )}
      
      {/* プレビュー表示（低解像度 5秒 MP4） */}
      {!isFocused && (
        <video
          key={`preview-${movieId}`}
          autoPlay
          className={classNames("h-full w-full object-cover transition-all duration-500", {
            "opacity-0": !isLoaded,
            "opacity-100": isLoaded,
            "blur-[2px] scale-105": true,
          })}
          loop
          muted
          onLoadedData={handleLoad}
          playsInline
          src={previewSrc}
        />
      )}

      {/* フル解像度表示（MP4 動画） */}
      {isFocused && (
        <video
          key={`full-${movieId}`}
          autoPlay
          className={classNames("h-full w-full object-cover transition-opacity duration-500", {
            "opacity-0": !isLoaded,
            "opacity-100": isLoaded,
          })}
          loop
          muted
          onLoadedData={handleLoad}
          playsInline
          src={videoSrc}
        />
      )}

      {/* バックグラウンド・プリロード用の隠し要素 */}
      {/* 画面内に入っているが、まだクリックされていない時だけ裏で読み込む */}
      {isInView && !isFocused && (
        <video
          preload="auto"
          src={videoSrc}
          style={{ display: "none" }}
          muted
        />
      )}
    </div>
  );
};
