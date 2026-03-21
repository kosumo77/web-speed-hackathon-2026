import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 30;

interface ReturnValues<T> {
  data: Array<T>;
  error: Error | null;
  isLoading: boolean;
  fetchMore: () => void;
  hasMore: boolean;
}

export function useInfiniteFetch<T>(
  apiPath: string,
  fetcher: (apiPath: string) => Promise<T[]>,
): ReturnValues<T> {
  const internalRef = useRef({ isLoading: false, offset: 0, hasMore: true });

  const [result, setResult] = useState<Omit<ReturnValues<T>, "fetchMore">>({
    data: [],
    error: null,
    isLoading: true,
    hasMore: true,
  });

  const fetchMore = useCallback(() => {
    const { isLoading, offset, hasMore } = internalRef.current;
    if (isLoading || !hasMore) {
      return;
    }

    setResult((cur) => ({
      ...cur,
      isLoading: true,
    }));
    internalRef.current = {
      ...internalRef.current,
      isLoading: true,
    };

    // サーバーに limit と offset を伝えて必要な分だけ取得する
    const separator = apiPath.includes("?") ? "&" : "?";
    const paginatedPath = `${apiPath}${separator}limit=${LIMIT}&offset=${offset}`;

    void fetcher(paginatedPath).then(
      (newData) => {
        const nextHasMore = newData.length === LIMIT;
        setResult((cur) => ({
          ...cur,
          data: [...cur.data, ...newData], // クライアントでの slice は不要
          isLoading: false,
          hasMore: nextHasMore,
        }));
        internalRef.current = {
          isLoading: false,
          offset: offset + LIMIT,
          hasMore: nextHasMore,
        };
      },
      (error) => {
        setResult((cur) => ({
          ...cur,
          error,
          isLoading: false,
        }));
        internalRef.current = {
          ...internalRef.current,
          isLoading: false,
        };
      },
    );
  }, [apiPath, fetcher]);

  // 初回マウント時、または apiPath が変わった時にリセットしてフェッチ
  useEffect(() => {
    setResult({
      data: [],
      error: null,
      isLoading: true,
      hasMore: true,
    });
    internalRef.current = {
      isLoading: false,
      offset: 0,
      hasMore: true,
    };

    fetchMore();
  }, [fetchMore]);

  return {
    ...result,
    fetchMore,
  };
}

