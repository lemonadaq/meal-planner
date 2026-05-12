import { useState } from 'react'
import Dania from './pages/Dania'
import DanieDetail from './pages/DanieDetail'

function App() {
  const [wybraneD, setWybraneD] = useState(null)

  if (wybraneD) {
    return <DanieDetail nazwa={wybraneD} onBack={() => setWybraneD(null)} />
  }

  return <Dania onSelect={setWybraneD} />
}

export default App