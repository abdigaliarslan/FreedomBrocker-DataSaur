import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './ProfilePage.css'

interface UserProfile {
  id: number
  email: string
  full_name: string
  role: 'job_seeker' | 'employer'
  is_active: boolean
  created_at: string
}

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const API_BASE_URL = 'http://localhost:8000'

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchProfile()
  }, [user, navigate])

  const fetchProfile = async () => {
    try {
      const response = await axios.get<UserProfile>(`${API_BASE_URL}/users/me`)
      setProfile(response.data)
      setFormData({
        full_name: response.data.full_name,
        email: response.data.email
      })
    } catch (error) {
      setError('Ошибка при загрузке профиля')
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setError('')
    setSuccess('')
  }

  const handleCancel = () => {
    setEditing(false)
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        email: profile.email
      })
    }
    setError('')
    setSuccess('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await axios.put(`${API_BASE_URL}/users/me`, formData)
      setProfile(response.data)
      setEditing(false)
      setSuccess('Профиль успешно обновлен')
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка при обновлении профиля')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRoleText = (role: string) => {
    return role === 'job_seeker' ? 'Соискатель' : 'Работодатель'
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading">Загрузка профиля...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="error-message">Профиль не найден</div>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-content">
          <div className="profile-header">
            <h1>Мой профиль</h1>
            <p className="text-muted">Управление личной информацией</p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="profile-card">
            <div className="card-header">
              <h2>Личная информация</h2>
              {!editing && (
                <button className="btn btn-outline" onClick={handleEdit}>
                  Редактировать
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="profile-form">
                <div className="form-group">
                  <label htmlFor="full_name" className="form-label">
                    Полное имя
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    className="form-input"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
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
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Сохранить
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCancel}>
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Полное имя:</span>
                    <span className="info-value">{profile.full_name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{profile.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Тип аккаунта:</span>
                    <span className="info-value">{getRoleText(profile.role)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Статус:</span>
                    <span className={`status ${profile.is_active ? 'active' : 'inactive'}`}>
                      {profile.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Дата регистрации:</span>
                    <span className="info-value">{formatDate(profile.created_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="profile-actions">
            <div className="actions-grid">
              {profile.role === 'job_seeker' ? (
                <>
                  <button 
                    className="btn btn-primary action-btn"
                    onClick={() => navigate('/resume')}
                  >
                    📄 Мое резюме
                  </button>
                  <button 
                    className="btn btn-outline action-btn"
                    onClick={() => navigate('/jobs')}
                  >
                    🔍 Поиск вакансий
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn btn-primary action-btn"
                    onClick={() => navigate('/company')}
                  >
                    🏢 Моя компания
                  </button>
                  <button 
                    className="btn btn-outline action-btn"
                    onClick={() => navigate('/company')}
                  >
                    📝 Управление вакансиями
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="danger-zone">
            <h3>Опасная зона</h3>
            <p className="text-muted">
              Действия в этой зоне необратимы. Будьте осторожны.
            </p>
            <button 
              className="btn btn-danger"
              onClick={() => {
                if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                  logout()
                  navigate('/')
                }
              }}
            >
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage