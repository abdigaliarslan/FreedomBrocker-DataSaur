import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import './JobDetailPage.css'

interface Job {
  id: number
  title: string
  description: string
  location: string
  employment_type: string
  experience_level: string
  salary_min?: number
  salary_max?: number
  is_remote: boolean
  views: number
  created_at: string
  company: {
    id: number
    name: string
    description?: string
  }
}

const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  const API_BASE_URL = 'http://localhost:8000'

  useEffect(() => {
    if (id) {
      fetchJob()
    }
  }, [id])

  const fetchJob = async () => {
    try {
      const response = await axios.get<Job>(`${API_BASE_URL}/jobs/${id}`)
      setJob(response.data)
    } catch (error) {
      setError('Вакансия не найдена')
      console.error('Error fetching job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.role !== 'job_seeker') {
      alert('Только соискатели могут откликаться на вакансии')
      return
    }

    setApplying(true)
    try {
      await axios.post(`${API_BASE_URL}/resumes/apply/${id}`)
      setApplied(true)
      alert('Ваш отклик успешно отправлен!')
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert('Вы уже откликнулись на эту вакансию')
      } else {
        alert('Ошибка при отправке отклика')
      }
      console.error('Error applying for job:', error)
    } finally {
      setApplying(false)
    }
  }

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Зарплата не указана'
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ₸`
    if (min) return `от ${min.toLocaleString()} ₸`
    if (max) return `до ${max.toLocaleString()} ₸`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getEmploymentTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      'full_time': 'Полная занятость',
      'part_time': 'Частичная занятость',
      'contract': 'Контракт',
      'internship': 'Стажировка'
    }
    return types[type] || type
  }

  const getExperienceLevelText = (level: string) => {
    const levels: { [key: string]: string } = {
      'no_experience': 'Без опыта',
      '1_3_years': '1-3 года',
      '3_6_years': '3-6 лет',
      '6_plus_years': '6+ лет'
    }
    return levels[level] || level
  }

  if (loading) {
    return (
      <div className="job-detail-page">
        <div className="container">
          <div className="loading">Загрузка вакансии...</div>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="job-detail-page">
        <div className="container">
          <div className="error-message">{error}</div>
          <button className="btn btn-primary" onClick={() => navigate('/jobs')}>
            Вернуться к поиску
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="job-detail-page">
      <div className="container">
        <div className="job-detail-content">
          <div className="job-main">
            <div className="job-header">
              <h1 className="job-title">{job.title}</h1>
              <div className="job-company">
                <h2>{job.company.name}</h2>
                {job.company.description && (
                  <p className="company-description">{job.company.description}</p>
                )}
              </div>
            </div>

            <div className="job-info">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Местоположение:</span>
                  <span className="info-value">📍 {job.location}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Зарплата:</span>
                  <span className="info-value">💰 {formatSalary(job.salary_min, job.salary_max)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Тип занятости:</span>
                  <span className="info-value">💼 {getEmploymentTypeText(job.employment_type)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Опыт работы:</span>
                  <span className="info-value">🎯 {getExperienceLevelText(job.experience_level)}</span>
                </div>
                {job.is_remote && (
                  <div className="info-item">
                    <span className="info-label">Формат работы:</span>
                    <span className="info-value">🏠 Удаленная работа</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Опубликовано:</span>
                  <span className="info-value">📅 {formatDate(job.created_at)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Просмотры:</span>
                  <span className="info-value">👁 {job.views}</span>
                </div>
              </div>
            </div>

            <div className="job-description">
              <h3>Описание вакансии</h3>
              <div className="description-content">
                {job.description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="job-sidebar">
            <div className="apply-section">
              {user && user.role === 'job_seeker' ? (
                <button
                  className={`btn ${applied ? 'btn-success' : 'btn-primary'} apply-btn`}
                  onClick={handleApply}
                  disabled={applying || applied}
                >
                  {applying ? 'Отправка...' : applied ? 'Отклик отправлен' : 'Откликнуться'}
                </button>
              ) : user && user.role === 'employer' ? (
                <div className="employer-note">
                  <p>Вы вошли как работодатель. Только соискатели могут откликаться на вакансии.</p>
                </div>
              ) : (
                <div className="auth-required">
                  <p>Для отклика на вакансию необходимо войти в систему</p>
                  <button className="btn btn-primary" onClick={() => navigate('/login')}>
                    Войти
                  </button>
                  <button className="btn btn-outline" onClick={() => navigate('/register')}>
                    Регистрация
                  </button>
                </div>
              )}
            </div>

            <div className="actions-section">
              <button className="btn btn-outline" onClick={() => navigate('/jobs')}>
                ← Вернуться к поиску
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobDetailPage