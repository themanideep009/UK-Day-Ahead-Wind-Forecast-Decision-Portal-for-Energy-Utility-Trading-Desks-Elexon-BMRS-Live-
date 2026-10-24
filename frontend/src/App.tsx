import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Overview } from './pages/Overview'
import { DecisionDesk } from './pages/DecisionDesk'
import { ForecastAccuracy } from './pages/ForecastAccuracy'
import { Methodology } from './pages/Methodology'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 10, // 10 minutes cache
    },
  },
})

const MainApp: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Default values
  const defaultDate = '2026-01-02'
  const defaultCutoff = '09:20'
  const minDate = '2026-01-02'
  const maxDate = '2026-02-01'

  const deliveryDate = searchParams.get('delivery_date') || defaultDate
  const cutoff = searchParams.get('cutoff') || defaultCutoff

  const setDeliveryDate = (newDate: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('delivery_date', newDate)
    setSearchParams(params)
  }

  const setCutoff = (newCutoff: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('cutoff', newCutoff)
    setSearchParams(params)
  }

  // Ensure initial search params exist for clean shareable URLs
  useEffect(() => {
    if (!searchParams.get('delivery_date') || !searchParams.get('cutoff')) {
      const params = new URLSearchParams(searchParams)
      if (!params.get('delivery_date')) params.set('delivery_date', defaultDate)
      if (!params.get('cutoff')) params.set('cutoff', defaultCutoff)
      setSearchParams(params, { replace: true })
    }
  }, [searchParams, setSearchParams])

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100">
      <Navbar
        cutoff={cutoff}
        setCutoff={setCutoff}
        deliveryDate={deliveryDate}
        setDeliveryDate={setDeliveryDate}
        minDate={minDate}
        maxDate={maxDate}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route
            path="/"
            element={
              <Overview
                deliveryDate={deliveryDate}
                cutoff={cutoff}
                setCutoff={setCutoff}
              />
            }
          />
          <Route
            path="/decision"
            element={
              <DecisionDesk
                deliveryDate={deliveryDate}
                cutoff={cutoff}
                setCutoff={setCutoff}
              />
            }
          />
          <Route
            path="/accuracy"
            element={<ForecastAccuracy cutoff={cutoff} setCutoff={setCutoff} />}
          />
          <Route path="/methodology" element={<Methodology />} />
          <Route
            path="*"
            element={
              <Overview
                deliveryDate={deliveryDate}
                cutoff={cutoff}
                setCutoff={setCutoff}
              />
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
