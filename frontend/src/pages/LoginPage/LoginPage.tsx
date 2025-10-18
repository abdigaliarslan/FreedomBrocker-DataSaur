import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './LoginPage.css'

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Обработка ошибок валидации от FastAPI
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Если detail - это массив ошибок валидации
          const errorMessages = error.response.data.detail.map((err: any) => {
            if (typeof err === 'object' && err.msg) {
              return `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`
            }
            return String(err)
          }).join(', ')
          setError(errorMessages)
        } else {
          // Если detail - это строка
          setError(error.response.data.detail)
        }
      } else {
        setError('Ошибка входа в систему. Попробуйте еще раз.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="container-sm">
        <div className="login-card">
          <div className="card-header text-center">
            <h1 className="card-title">Вход в систему</h1>
            <p className="text-muted">Войдите в свой аккаунт MyLink.kz</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Введите ваш email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Введите ваш пароль"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Нет аккаунта?{' '}
              <Link to="/register" className="link">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage