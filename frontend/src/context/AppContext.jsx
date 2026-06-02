import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [snapshotData, setSnapshotData] = useState(null)
  const [aiResult, setAiResult]         = useState(null)

  return (
    <AppContext.Provider value={{ snapshotData, setSnapshotData, aiResult, setAiResult }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppData() {
  return useContext(AppContext)
}