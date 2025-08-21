import { useEffect, useState } from 'react'
import './App.scss'
import AppRoute from './route/route'

const App: React.FC = () => {

  const checkSupport = () => {
    return 'File' in window && 'FileReader' in window && 'FileList' in window && 'Blob' in window && 'WebSocket' in window && 'RTCDataChannel' in window && 'RTCPeerConnection' in window;
  }


  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    if (!checkSupport()) {
      setIsSupported(false)
    }
  }, [])

  return (
    <div className='app-container'>
      {isSupported ? <AppRoute /> :
        <div className='unsupported'>
          <h1>Your browser does not support this application</h1>
        </div>
      }
    </div>
  )
}

export default App
