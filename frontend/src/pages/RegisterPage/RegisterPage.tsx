import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './RegisterPage.css'

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'job_seeker' as 'job_seeker' | 'employer'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      return
    }

    setLoading(true)

    try {
      await register(formData.email, formData.password, formData.fullName, formData.role)
      navigate('/')
    } catch (error: any) {
      console.error('Registration error:', error)
      
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
        setError('Ошибка регистрации. Попробуйте еще раз.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="container-sm">
        <div className="register-card">
          <div className="card-header text-center">
            <h1 className="card-title">Регистрация</h1>
            <p className="text-muted">Создайте аккаунт на MyLink.kz</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">
                Полное имя
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className="form-input"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Введите ваше полное имя"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Введите ваш email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role" className="form-label">
                Тип аккаунта
              </label>
              <select
                id="role"
                name="role"
                className="form-input"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="job_seeker">Соискатель</option>
                <option value="employer">Работодатель</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Введите пароль (минимум 6 символов)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                Подтвердите пароль
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Повторите пароль"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary register-btn"
              disabled={loading}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="register-footer">
            <p>
              Уже есть аккаунт?{' '}
              <Link to="/login" className="link">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage