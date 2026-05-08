import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './features/home/Home';
import Editor from './features/editor/Editor';
import Play from './features/play/Play';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:boardId" element={<Editor />} />
        <Route path="/play/:boardId/:roomId" element={<Play />} />
        <Route path="/play/:roomId" element={<Play />} />
      </Routes>
    </Router>
  );
}

export default App;
