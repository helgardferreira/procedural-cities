import { useViewer } from "./hooks";

function App() {
  const containerRef = useViewer();

  return <div ref={containerRef}></div>;
}

export default App;
