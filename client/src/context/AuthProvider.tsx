import { loginApi } from '@/api/axiosClient'
import React, { createContext, useContext, useState } from 'react'
import { toast } from 'sonner'

export type LoginResponse = {
    message: string
    isAuthenticated: boolean
}

export type AuthContextType = {
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<LoginResponse>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return localStorage.getItem('is_authenticated') === 'true'
    })
    const [isLoading, setIsLoading] = useState<boolean>(false)

    /**
     * Authenticates user and sets session state
     */
    const login = async (email: string, password: string): Promise<LoginResponse> => {
        setIsLoading(true)
        try {
            const data: LoginResponse = await loginApi({ email, password })

            if (data.isAuthenticated) {
                setIsAuthenticated(true)
                localStorage.setItem('is_authenticated', 'true')
                toast.success(data.message || 'Login successful!')
            } else {
                setIsAuthenticated(false)
                localStorage.removeItem('is_authenticated')
                toast.error(data.message || 'Login failed. Please check your credentials.')
            }

            return data
        } catch (error) {
            console.error('[Auth Context] Exception during login pipeline:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        setIsAuthenticated(false)
        localStorage.removeItem('is_authenticated')
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be consumed exclusively inside an <AuthProvider /> wrapper.')
    }
    return context
}
