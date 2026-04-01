"use client"

import { createContext, useContext, useState, useEffect } from "react"

type GroupContextType = {
  currentGroupId: string | null
  setCurrentGroupId: (id: string | null) => void
}

const GroupContext = createContext<GroupContextType>({
  currentGroupId: null,
  setCurrentGroupId: () => {},
})

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [currentGroupId, setCurrentGroupIdState] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("current_group_id")
      if (saved) setCurrentGroupIdState(saved)
    } catch {}
  }, [])

  function setCurrentGroupId(id: string | null) {
    setCurrentGroupIdState(id)
    try {
      if (id) localStorage.setItem("current_group_id", id)
      else localStorage.removeItem("current_group_id")
    } catch {}
  }

  return (
    <GroupContext.Provider value={{ currentGroupId, setCurrentGroupId }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useGroupContext() {
  return useContext(GroupContext)
}
