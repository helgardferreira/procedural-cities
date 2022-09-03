import { useEffect, useRef } from "react";
import viewer from "../three/Viewer";

export const useViewer = () => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.appendChild(viewer.canvas);
    }

    return () => {
      divRef.current?.removeChild(viewer.canvas);
    };
  });

  return divRef;
};
