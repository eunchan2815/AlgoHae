import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { GlobalStyle } from './styles/global'
import Landing from './components/Landing'
import Playground from './components/Playground'

function LandingRoute() {
  const navigate = useNavigate()
  return <Landing onStart={() => navigate('/playground')} />
}

function AppRoutes() {
  const location = useLocation()
  return (
    <>
      {/* 랜딩(/)은 라이트, 앱(/playground)은 다크 — 오버스크롤 배경도 함께 전환 */}
      <GlobalStyle $light={location.pathname === '/'} />
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
