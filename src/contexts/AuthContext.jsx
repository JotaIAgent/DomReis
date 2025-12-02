import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('Initial session check:', session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserRole(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('Auth state changed:', _event, session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserRole(session.user.id)
            } else {
                setRole(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserRole = async (userId) => {
        console.log('Fetching role for user:', userId)
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .single()

            console.log('Role fetch result:', { data, error })
            if (error) throw error
            setRole(data?.role || null)
            console.log('Role set to:', data?.role)
        } catch (error) {
            console.error('Error fetching user role:', error)
            setRole(null)
        } finally {
            setLoading(false)
        }
    }

    const value = {
        user,
        role,
        loading,
        isAdmin: role === 'admin' || role === 'barbeiro',
        signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
        signOut: () => supabase.auth.signOut(),
    }

    console.log('AuthContext value:', { user: !!user, role, loading, isAdmin: value.isAdmin })

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
