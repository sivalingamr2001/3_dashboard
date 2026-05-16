import { useState } from "react"

type UseDashboardReturn = {
  inclIntraSales: boolean
  handleToggleIntraSales: () => void
}

export const useDashboard = (): UseDashboardReturn => {
  const [inclIntraSales, setInclIntraSales] = useState(false)

  const handleToggleIntraSales = () => {
    setInclIntraSales((prev) => !prev)
  }

  return { inclIntraSales, handleToggleIntraSales }
}
