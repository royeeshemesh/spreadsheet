import './App.css';
import Sheet from './components/Sheet';
import { SheetProvider } from './context/context';

function App() {

  return (
    <SheetProvider>
      <Sheet />
    </SheetProvider>
  );
}

export default App;
