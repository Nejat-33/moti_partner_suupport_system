import { Axios } from '../../../utils/axios'

export interface User {
  id: string
  fullName: string
  email: string
  role: string
}

export const AuthService = {
  me: async () => {
    return Axios.get<User>('/auth/me')
  },

  login: async (credentials: { email: string; password: string }) => {
    return Axios.post<{ accessToken: string; partyType: string }>(
      '/auth/login',
      credentials,
    )
  },

  logout: async () => {
    return Axios.post('/auth/logout')
  },

  verifyEmail: async (token: string) => {
    return Axios.post('/auth/verify-email', { token })
  },
}
