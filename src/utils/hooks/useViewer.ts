import { useEffect, useRef } from "react";
import viewer from "../../three/Viewer";

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

// TODO: hack does not work with multiple imports... find a better way...
// HMR hack to get rid of annoying dat.gui element spam
/* if (import.meta.hot) {
  import.meta.hot.accept("../../three/Viewer", (data) => {
    if (data) {
      // document.body.removeChild(data.default.guiElement);
      data.default.dispose();
    }
  });
} */
